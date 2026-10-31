'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getProductionFieldConfigAction } from '@/app/actions/production-field';
import type { FieldMapping } from '@/lib/production-field-mapping';
import CoreFieldStructure from './CoreFieldStructure';
import CustomFieldManager, { type ProductionFieldRow } from './CustomFieldManager';
import AddFieldDrawer from './AddFieldDrawer';

interface Config {
  fieldMapping: FieldMapping;
  disabledFields: string[];
  fields: ProductionFieldRow[];
  properties: { name: string; type: string }[] | null;
}

interface Props {
  unitId: string;
  unitName: string;
  platformName: string;
  sectionClassName: string;
}

/** Bagian struktur field di drawer Edit Production: field inti (mapping & aktif/mati) dan field tambahan. Tersimpan langsung, terpisah dari "Save Production". */
export default function ProductionFieldsPanel({ unitId, unitName, platformName, sectionClassName }: Props) {
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const res = await getProductionFieldConfigAction(unitId);
    if (!res.success) { setError(res.error || 'Gagal memuat struktur field.'); return; }
    setError('');
    setConfig({ fieldMapping: res.fieldMapping ?? {}, disabledFields: res.disabledFields ?? [], fields: res.fields ?? [], properties: res.properties ?? null });
  }, [unitId]);

  useEffect(() => {
    setConfig(null);
    load();
  }, [load]);

  return (
    <>
      <div className={sectionClassName}>3 · Struktur Field</div>
      {!config ? (
        <div className="px-5 py-4 text-xs text-gray-500 flex items-center gap-2">
          {error ? <span className="text-rose-500">{error}</span> : <><Loader2 className="w-4 h-4 animate-spin" />Membaca skema Notion…</>}
        </div>
      ) : (
        <CoreFieldStructure
          unitId={unitId}
          fieldMapping={config.fieldMapping}
          disabledFields={config.disabledFields}
          properties={config.properties}
          onSaved={load}
        />
      )}

      <div className={sectionClassName}>4 · Field Tambahan</div>
      {config && <CustomFieldManager unitId={unitId} fields={config.fields} onAdd={() => setAdding(true)} onChanged={load} />}

      <AddFieldDrawer
        open={adding}
        unitId={unitId}
        unitName={unitName}
        platformName={platformName}
        onClose={() => setAdding(false)}
        onCreated={load}
      />
    </>
  );
}
