'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { Prisma } from '../../../generated/prisma';
import { denyUnless, denyWrite } from '@/lib/access';
import {
  addMissingProperties,
  ensureCustomProperty,
  ensureSelectOptions,
  listDatabaseProperties,
  readExtraProperties,
  renameProperty,
  validateExistingDatabase,
} from '@/lib/notion-provision';
import {
  DEFAULT_FIELD_ALIASES,
  REQUIRED_FIELD_KEYS,
  knownPropertyNames,
  type FieldKey,
  type FieldMapping,
} from '@/lib/production-field-mapping';
import { CREATABLE_FIELD_TYPES, fieldTypeInfo } from '@/lib/notion-field-types';

type FieldOption = { name: string; color?: string };

async function findUnit(unitId: string) {
  const unit = await prisma.productionUnit.findUnique({ where: { id: unitId } });
  if (!unit) throw new Error('Production tidak ditemukan.');
  if (!unit.notionTaskDbId) throw new Error('Production ini belum punya database Notion.');
  return unit;
}

function revalidateFields() {
  try {
    revalidatePath('/production', 'layout');
  } catch {}
}

function cleanOptions(options?: FieldOption[] | null): FieldOption[] {
  const seen = new Set<string>();
  return (options ?? [])
    .map((o) => ({ ...o, name: o.name.trim() }))
    .filter((o) => o.name && !seen.has(o.name.toLowerCase()) && seen.add(o.name.toLowerCase()));
}

/** Struktur field production: mapping field inti, field inti yang dimatikan, field tambahan, dan properti Notion yang ada. */
export async function getProductionFieldConfigAction(unitId: string) {
  const denied = await denyUnless('production.create');
  if (denied) return denied as never;
  try {
    const unit = await findUnit(unitId);
    const [fields, properties] = await Promise.all([
      prisma.productionField.findMany({
        where: { productionUnitId: unit.id },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      listDatabaseProperties(unit.notionTaskDbId).catch(() => null),
    ]);
    return {
      success: true,
      fieldMapping: (unit.fieldMapping ?? {}) as FieldMapping,
      disabledFields: unit.disabledFields,
      fields: JSON.parse(JSON.stringify(fields)),
      properties: properties?.map((p) => ({ name: p.name, type: p.type })) ?? null,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memuat struktur field.' };
  }
}

/**
 * Simpan struktur field inti: nama properti Notion per field (mapping) dan field opsional yang dimatikan.
 * Field wajib tidak bisa dimatikan. Field inti yang aktif tapi belum ada di Notion dibuat otomatis.
 */
export async function updateCoreFieldStructureAction(input: {
  unitId: string;
  fieldMapping: FieldMapping;
  disabledFields: string[];
}) {
  const denied = await denyWrite('production.create');
  if (denied) return denied as never;
  try {
    const unit = await findUnit(input.unitId);
    const disabled = Array.from(new Set(input.disabledFields)).filter((k) => k in DEFAULT_FIELD_ALIASES);
    const lockedOff = disabled.filter((k) => REQUIRED_FIELD_KEYS.includes(k as FieldKey));
    if (lockedOff.length > 0) throw new Error(`Field wajib tidak bisa dimatikan: ${lockedOff.join(', ')}.`);

    // Simpan hanya nama yang berbeda dari default, satu properti Notion untuk satu field
    const mapping: FieldMapping = {};
    const used = new Map<string, string>();
    for (const [key, value] of Object.entries(input.fieldMapping ?? {})) {
      const name = (Array.isArray(value) ? value[0] : value)?.trim();
      if (!name || !(key in DEFAULT_FIELD_ALIASES) || disabled.includes(key)) continue;
      if (used.has(name)) throw new Error(`Properti "${name}" dipakai dua field (${used.get(name)} dan ${key}).`);
      used.set(name, key);
      if (name !== DEFAULT_FIELD_ALIASES[key as FieldKey][0]) mapping[key as FieldKey] = name;
    }

    const report = await validateExistingDatabase(unit.notionTaskDbId, { mapping, disabled });
    if (report.typeMismatch.length > 0) {
      throw new Error(`Tipe properti tidak cocok: ${report.typeMismatch.map((m) => `${m.name} (butuh ${m.expected}, ada ${m.found})`).join(', ')}.`);
    }
    const added = await addMissingProperties(unit.notionTaskDbId, unit.platformId, report.missing);

    await prisma.productionUnit.update({
      where: { id: unit.id },
      data: { fieldMapping: mapping as Prisma.InputJsonObject, disabledFields: disabled },
    });
    revalidateFields();
    return { success: true, added };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyimpan struktur field.' };
  }
}

export interface CreateProductionFieldInput {
  unitId: string;
  /** "platform" = semua production aktif di platform yang sama. */
  scope: 'unit' | 'platform';
  name: string;
  type: string;
  options?: FieldOption[];
  visible?: boolean;
  editable?: boolean;
  filterable?: boolean;
}

/** Tambah field: buat properti di Notion dulu, lalu daftarkan di app. */
export async function createProductionFieldAction(input: CreateProductionFieldInput) {
  const denied = await denyWrite('production.create');
  if (denied) return denied as never;
  try {
    const unit = await findUnit(input.unitId);
    const name = input.name.trim();
    if (!name) throw new Error('Nama field wajib diisi.');
    if (name.length > 100) throw new Error('Nama field maksimal 100 karakter.');
    if (!CREATABLE_FIELD_TYPES.includes(input.type)) throw new Error('Tipe field ini tidak bisa dibuat dari app.');
    const info = fieldTypeInfo(input.type)!;
    const options = info.hasOptions ? cleanOptions(input.options) : [];

    const targets = input.scope === 'platform'
      ? await prisma.productionUnit.findMany({ where: { platformId: unit.platformId, isActive: true, notionTaskDbId: { not: '' } } })
      : [unit];

    const created: string[] = [];
    const failed: { unit: string; error: string }[] = [];
    for (const target of targets) {
      try {
        if (knownPropertyNames(target.fieldMapping as FieldMapping).has(name)) {
          throw new Error(`"${name}" sudah dipakai field inti.`);
        }
        const propertyId = await ensureCustomProperty(target.notionTaskDbId, { name, type: input.type, options });
        const last = await prisma.productionField.aggregate({ where: { productionUnitId: target.id }, _max: { sortOrder: true } });
        await prisma.productionField.upsert({
          where: { productionUnitId_name: { productionUnitId: target.id, name } },
          create: {
            productionUnitId: target.id,
            name,
            type: input.type,
            notionPropertyId: propertyId,
            options: options.length ? options : undefined,
            source: 'app',
            visible: input.visible ?? true,
            editable: input.editable ?? true,
            filterable: info.filterable ? input.filterable ?? false : false,
            sortOrder: (last._max.sortOrder ?? 0) + 1,
          },
          update: {
            notionPropertyId: propertyId,
            options: options.length ? options : undefined,
            visible: input.visible ?? true,
            editable: input.editable ?? true,
            filterable: info.filterable ? input.filterable ?? false : false,
            missingInNotion: false,
          },
        });
        created.push(target.name);
      } catch (error: any) {
        failed.push({ unit: target.name, error: error.message || 'Gagal membuat field.' });
      }
    }

    revalidateFields();
    if (created.length === 0) return { success: false, error: failed.map((f) => `${f.unit}: ${f.error}`).join(' · ') };
    return { success: true, created, failed };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membuat field.' };
  }
}

/** Ubah field tambahan. Ganti nama juga mengganti nama properti di Notion dan key di Task.customFields. */
export async function updateProductionFieldAction(input: {
  id: string;
  name?: string;
  visible?: boolean;
  editable?: boolean;
  filterable?: boolean;
  options?: FieldOption[];
}) {
  const denied = await denyWrite('production.create');
  if (denied) return denied as never;
  try {
    const field = await prisma.productionField.findUnique({ where: { id: input.id }, include: { productionUnit: true } });
    if (!field) throw new Error('Field tidak ditemukan.');
    const unit = field.productionUnit;
    const info = fieldTypeInfo(field.type);
    const data: Prisma.ProductionFieldUpdateInput = {};

    const newName = input.name?.trim();
    if (newName && newName !== field.name) {
      if (knownPropertyNames(unit.fieldMapping as FieldMapping).has(newName)) throw new Error(`"${newName}" sudah dipakai field inti.`);
      const clash = await prisma.productionField.findUnique({
        where: { productionUnitId_name: { productionUnitId: unit.id, name: newName } },
      });
      if (clash) throw new Error(`Field "${newName}" sudah ada.`);
      await renameProperty(unit.notionTaskDbId, field.name, newName);
      await prisma.$transaction([
        prisma.productionField.update({ where: { id: field.id }, data: { name: newName } }),
        prisma.$executeRaw(Prisma.sql`
          UPDATE tasks
          SET custom_fields = (custom_fields - ${field.name}) || jsonb_build_object(${newName}::text, custom_fields -> ${field.name})
          WHERE production_unit_id = ${unit.id}::uuid AND custom_fields ? ${field.name}
        `),
      ]);
    }

    if (input.options && info?.hasOptions) {
      const options = cleanOptions(input.options);
      await ensureSelectOptions(unit.notionTaskDbId, newName || field.name, options.map((o) => o.name));
      const current = (field.options as FieldOption[] | null) ?? [];
      const merged = [...current, ...options.filter((o) => !current.some((c) => c.name.toLowerCase() === o.name.toLowerCase()))];
      data.options = merged;
    }
    if (input.visible !== undefined) data.visible = input.visible;
    if (input.editable !== undefined) data.editable = input.editable && !!info?.editable;
    if (input.filterable !== undefined) data.filterable = input.filterable && !!info?.filterable;

    if (Object.keys(data).length > 0) await prisma.productionField.update({ where: { id: field.id }, data });
    revalidateFields();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mengubah field.' };
  }
}

/**
 * Baca ulang skema Notion: properti baru (di luar field inti) didaftarkan sebagai field `source: notion` yang belum tampil,
 * field yang hilang dari Notion ditandai, dan tipe/opsi diperbarui. Properti yang diganti nama di Notion dikenali lewat id-nya.
 */
export async function refreshProductionFieldsAction(unitId: string) {
  const denied = await denyWrite('production.create');
  if (denied) return denied as never;
  try {
    const unit = await findUnit(unitId);
    const extra = await readExtraProperties(unit.notionTaskDbId, unit.fieldMapping as FieldMapping);
    const fields = await prisma.productionField.findMany({ where: { productionUnitId: unit.id } });
    let maxOrder = fields.reduce((m, f) => Math.max(m, f.sortOrder), 0);

    const seen = new Set<string>();
    let added = 0;
    for (const prop of extra) {
      const existing = fields.find((f) => f.notionPropertyId && f.notionPropertyId === prop.id) || fields.find((f) => f.name === prop.name);
      if (existing) {
        seen.add(existing.id);
        if (existing.name !== prop.name) {
          // Diganti nama langsung di Notion: ikuti nama baru, termasuk key nilai task
          await prisma.$transaction([
            prisma.productionField.update({ where: { id: existing.id }, data: { name: prop.name } }),
            prisma.$executeRaw(Prisma.sql`
              UPDATE tasks
              SET custom_fields = (custom_fields - ${existing.name}) || jsonb_build_object(${prop.name}::text, custom_fields -> ${existing.name})
              WHERE production_unit_id = ${unit.id}::uuid AND custom_fields ? ${existing.name}
            `),
          ]);
        }
        await prisma.productionField.update({
          where: { id: existing.id },
          data: {
            type: prop.type,
            notionPropertyId: prop.id,
            options: prop.options ?? Prisma.DbNull,
            missingInNotion: false,
            editable: existing.editable && !!fieldTypeInfo(prop.type)?.editable,
          },
        });
        continue;
      }
      await prisma.productionField.create({
        data: {
          productionUnitId: unit.id,
          name: prop.name,
          type: prop.type,
          notionPropertyId: prop.id,
          options: prop.options ?? undefined,
          source: 'notion',
          visible: false,
          editable: !!fieldTypeInfo(prop.type)?.editable,
          sortOrder: ++maxOrder,
        },
      });
      added++;
    }

    const missing = fields.filter((f) => !seen.has(f.id) && !extra.some((p) => p.name === f.name));
    if (missing.length > 0) {
      await prisma.productionField.updateMany({ where: { id: { in: missing.map((f) => f.id) } }, data: { missingInNotion: true } });
    }

    revalidateFields();
    return { success: true, added, missing: missing.length };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membaca skema Notion.' };
  }
}

/** "Buat ulang": properti yang hilang dari Notion dibuat lagi dengan tipe & opsi yang tersimpan. */
export async function recreateProductionFieldAction(id: string) {
  const denied = await denyWrite('production.create');
  if (denied) return denied as never;
  try {
    const field = await prisma.productionField.findUnique({ where: { id }, include: { productionUnit: true } });
    if (!field) throw new Error('Field tidak ditemukan.');
    if (!CREATABLE_FIELD_TYPES.includes(field.type)) throw new Error('Tipe field ini hanya bisa dibuat langsung di Notion.');
    const propertyId = await ensureCustomProperty(field.productionUnit.notionTaskDbId, {
      name: field.name,
      type: field.type,
      options: (field.options as FieldOption[] | null) ?? [],
    });
    await prisma.productionField.update({ where: { id }, data: { missingInNotion: false, notionPropertyId: propertyId } });
    revalidateFields();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membuat ulang field.' };
  }
}

/** Hapus field dari daftar app. Hanya untuk field yang sudah tidak ada di Notion; properti Notion tidak pernah dihapus dari app. */
export async function removeMissingProductionFieldAction(id: string) {
  const denied = await denyWrite('production.create');
  if (denied) return denied as never;
  try {
    const field = await prisma.productionField.findUnique({ where: { id } });
    if (!field) throw new Error('Field tidak ditemukan.');
    if (!field.missingInNotion) throw new Error('Field masih ada di Notion. Sembunyikan saja, atau hapus properti di Notion dulu.');
    await prisma.productionField.delete({ where: { id } });
    revalidateFields();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menghapus field.' };
  }
}
