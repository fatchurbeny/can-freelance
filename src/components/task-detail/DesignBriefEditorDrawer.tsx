'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Edit3, Image as ImageIcon, LayoutGrid, Palette, X } from 'lucide-react';
import TaskBodyEditor from '../TaskBodyEditor';
import ImageColorPalettePicker from '../ImageColorPalettePicker';
import { addReferenceImages, classifyHeading, referenceImageUrls, removeReferenceImage } from './brief-parser';
import ReferenceImageUploader from './ReferenceImageUploader';
import AssetPicker from '../assets/AssetPicker';
import { useAccess } from '@/context/AccessContext';

/**
 * Ganti section palet di markdown brief. Gambar yang dibawa palet baru ditambahkan ke section
 * Reference Image (tidak menggantikan gambar lain, karena section ini bisa berisi beberapa referensi gaya).
 */
export function mergePaletteMarkdown(body: string, paletteMarkdown: string): string {
  const newImages = referenceImageUrls(paletteMarkdown);
  const paletteOnly = paletteMarkdown.replace(/##\s*🖼️\s*Reference Image[\s\S]*?(?=##|$)/gi, '').trim();
  const cleaned = (body || '').replace(/##\s*🎨\s*Color Palette[\s\S]*?(?=##|$)/gi, '').trim();
  const merged = cleaned ? `${cleaned}\n\n${paletteOnly}` : paletteOnly;
  return addReferenceImages(merged, newImages);
}

/** Lebar drawer editor; drawer induk bergeser ke kiri sebesar ini (lihat `BRIEF_EDITOR_SHIFT_CLASS`). */
export const BRIEF_EDITOR_SHIFT_CLASS = 'min-[1100px]:right-[540px]';

interface Props {
  value: string;
  onChange: (next: string) => void;
  onInsertPalette: (paletteMarkdown: string) => void;
  /** Section "📦 Assets" baru dari Asset Library (string kosong = hapus section). */
  onInsertAssets?: (sectionMarkdown: string) => void;
  /** Production task; picker hanya menampilkan aset untuk production ini. */
  productionUnitId?: string;
  onClose: () => void;
  subtitle?: string;
  /** Harus di atas z-index drawer induk. */
  zClassName?: string;
}

/**
 * Drawer kedua (bersusun) di sisi kanan untuk mengedit Design Brief.
 * Drawer induk menampilkan preview dan bergeser ke kiri selama drawer ini terbuka.
 */
export default function DesignBriefEditorDrawer({
  value,
  onChange,
  onInsertPalette,
  onInsertAssets,
  productionUnitId,
  onClose,
  subtitle = 'Preview tampil di drawer sebelah kiri',
  zClassName = 'z-[60]',
}: Props) {
  const [shown, setShown] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const closeRef = useRef(onClose);
  const pickerOpenRef = useRef(false);
  // Upload berjalan async; pakai body terbaru saat selesai agar ketikan selama upload tidak tertimpa
  const valueRef = useRef(value);
  valueRef.current = value;
  const access = useAccess();
  const canUseLibrary = !!onInsertAssets && (!access.enabled || access.permissions.includes('asset.view'));

  useEffect(() => {
    pickerOpenRef.current = pickerOpen;
  }, [pickerOpen]);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // Slide-in: render dulu di luar layar, lalu geser masuk di frame berikutnya
    const raf = requestAnimationFrame(() => setShown(true));
    // Escape hanya menutup drawer ini, bukan drawer induk di belakangnya
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      // Picker aset terbuka: Escape menutup picker saja
      if (pickerOpenRef.current) setPickerOpen(false);
      else closeRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey, true);
    };
  }, []);

  const hasPaletteSection = /^##\s*.*(palette|warna)/im.test(value || '');
  const hasImageSection = (value || '').split('\n').some((l) => {
    const m = l.match(/^##\s*(.*)/);
    return !!m && classifyHeading(m[1]) === 'image';
  });
  const images = referenceImageUrls(value || '');
  const imageUploader = (
    <ReferenceImageUploader
      images={images}
      onAdd={(urls) => onChange(addReferenceImages(valueRef.current || '', urls))}
      onRemove={(url) => onChange(removeReferenceImage(valueRef.current || '', url))}
    />
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <aside
      role="dialog"
      aria-label="Edit Design Brief"
      className={`fixed inset-y-0 right-0 ${zClassName} flex w-full max-w-[540px] flex-col border-l border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] shadow-2xl font-sans transition-transform duration-200 ease-out ${
        shown ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-[#ff5e1f]">
            <Edit3 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-sans text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">Edit Design Brief</p>
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup Edit Design Brief"
          className="flex size-8 shrink-0 items-center justify-center rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {canUseLibrary && (
        <div className="flex shrink-0 border-b border-[#f0f0f0] dark:border-[#272a34]">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            aria-expanded={pickerOpen}
            className={`relative flex min-h-11 flex-1 items-center justify-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
              pickerOpen ? 'bg-white text-[#ff5e1f] dark:bg-[#0d0e12]' : 'bg-gray-50/50 text-gray-700 hover:text-[#ff5e1f] dark:bg-[#16181d]/50 dark:text-gray-300'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Ambil dari Library
            {pickerOpen && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#ff5e1f]" />}
          </button>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-[#f8f9fb] dark:bg-[#16181d]/60 p-5">
        {pickerOpen && onInsertAssets && (
          <AssetPicker
            body={value}
            productionUnitId={productionUnitId}
            onClose={() => setPickerOpen(false)}
            onInsert={(md) => {
              onInsertAssets(md);
              setPickerOpen(false);
            }}
          />
        )}
        {!hasPaletteSection && (
          <div className="bg-white dark:bg-[#0d0e12] border border-[#f0f0f0] dark:border-[#272a34]">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#f0f0f0] dark:border-[#272a34] text-[13px] font-bold text-gray-900 dark:text-white">
              <Palette className="w-3.5 h-3.5 text-[#ff5e1f]" />
              Reference Image &amp; Color Palette
            </div>
            <div className="p-3">
              <ImageColorPalettePicker onInsertPalette={onInsertPalette} />
            </div>
          </div>
        )}
        {!hasImageSection && (
          <div className="bg-white dark:bg-[#0d0e12] border border-[#f0f0f0] dark:border-[#272a34]">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#f0f0f0] dark:border-[#272a34] text-[13px] font-bold text-gray-900 dark:text-white">
              <ImageIcon className="w-3.5 h-3.5 text-[#ff5e1f]" />
              Reference Image
            </div>
            <div className="px-3 pb-3">{imageUploader}</div>
          </div>
        )}
        <TaskBodyEditor
          value={value}
          onChange={onChange}
          orderSections
          hideHeader
          renderSectionExtra={(heading) => {
            const kind = classifyHeading(heading);
            if (kind === 'image') return imageUploader;
            if (kind === 'palette') {
              return (
                <div className="border border-dashed border-[#f0f0f0] dark:border-[#272a34] p-3">
                  <ImageColorPalettePicker onInsertPalette={onInsertPalette} />
                </div>
              );
            }
            return null;
          }}
        />
      </div>
    </aside>,
    document.body
  );
}
