import type { Client } from '@notionhq/client';
import prisma from '@/lib/prisma';
import { resolveWriteName, type FieldKey, type FieldMapping } from '@/lib/production-field-mapping';
import { isEditableFieldType, toNotionPropertyValue } from '@/lib/notion-field-types';

/** Nama properti title database (mapping `name`, lalu properti bertipe title, lalu "Name"). */
export function titlePropertyName(schemaProps: Record<string, any>, mapping?: FieldMapping | null): string {
  return resolveWriteName(schemaProps, 'name', mapping)
    ?? Object.keys(schemaProps).find((key) => schemaProps[key]?.type === 'title')
    ?? 'Name';
}

/**
 * Payload properti Notion untuk field tambahan production. Hanya field yang terdaftar, bisa diedit,
 * dan masih ada di skema database yang dikirim; tipenya diambil dari skema Notion.
 */
export async function customFieldProperties(
  productionUnitId: string,
  values: Record<string, unknown> | null | undefined,
  schemaProps: Record<string, any>,
): Promise<Record<string, any>> {
  if (!values || Object.keys(values).length === 0) return {};
  const fields = await prisma.productionField.findMany({
    where: { productionUnitId, editable: true, name: { in: Object.keys(values) } },
    select: { name: true },
  });
  const properties: Record<string, any> = {};
  for (const { name } of fields) {
    const type = schemaProps[name]?.type;
    if (!type || !isEditableFieldType(type)) continue;
    const payload = toNotionPropertyValue(type, values[name]);
    if (payload) properties[name] = payload;
  }
  return properties;
}

/**
 * Nama properti Notion untuk beberapa field inti pada satu halaman task, mengikuti mapping production task itu.
 * Field yang tidak ada di database tersebut tidak dikembalikan.
 */
export async function pagePropertyNames(
  client: Client,
  notionPageId: string,
  keys: FieldKey[],
): Promise<Partial<Record<FieldKey, string>>> {
  const [page, task] = await Promise.all([
    client.pages.retrieve({ page_id: notionPageId }) as Promise<any>,
    prisma.task.findUnique({ where: { notionPageId }, select: { productionUnit: { select: { fieldMapping: true } } } }),
  ]);
  const mapping = (task?.productionUnit.fieldMapping ?? {}) as FieldMapping;
  const names: Partial<Record<FieldKey, string>> = {};
  for (const key of keys) {
    const name = resolveWriteName(page.properties || {}, key, mapping);
    if (name) names[key] = name;
  }
  return names;
}
