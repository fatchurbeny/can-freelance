'use client';

import { useState, useRef, useEffect, DragEvent, ClipboardEvent } from 'react';
import {
  Palette,
  UploadCloud,
  Copy,
  Check,
  Plus,
  Trash2,
  Image as ImageIcon,
  Loader2,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { extractColorsFromImage, ExtractedColor } from '@/lib/color-extractor';

interface Props {
  onInsertPalette?: (paletteMarkdown: string, hexList: string[], imageUrl?: string) => void;
  className?: string;
}

export default function ImageColorPalettePicker({ onInsertPalette, className = '' }: Props) {
  const [colors, setColors] = useState<ExtractedColor[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle global paste event when user pastes image inside container or active window
  useEffect(() => {
    const handlePaste = (e: globalThis.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            processImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (PNG, JPG, WebP)');
      return;
    }

    setLoading(true);
    setImageName(file.name || 'Pasted Image');
    setUploadedImageUrl(null);

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    try {
      // 1. Extract dominant colors (<50ms)
      const extracted = await extractColorsFromImage(file, 5);
      if (extracted.length === 0) {
        toast.error('Tidak dapat mengekstrak warna dari gambar');
      } else {
        setColors(extracted);
        toast.success(`Berhasil mengekstrak ${extracted.length} warna dominan!`);
      }

      // 2. Compress image to WebP (<100KB) and upload to server storage
      setUploading(true);
      try {
        const { compressImageToWebP } = await import('@/lib/color-extractor');
        const compressedBlob = await compressImageToWebP(file, 800, 800, 0.8);
        const uploadData = new FormData();
        uploadData.append('file', compressedBlob, 'reference.webp');

        const uploadRes = await fetch('/can-freelance/api/upload', {
          method: 'POST',
          body: uploadData,
        });

        if (uploadRes.ok) {
          const data = await uploadRes.json();
          if (data.url) {
            setUploadedImageUrl(data.url);
          }
        }
      } catch (uploadErr) {
        console.warn('Background upload failed (palette extraction unaffected):', uploadErr);
      } finally {
        setUploading(false);
      }
    } catch (err: any) {
      console.error('Failed to extract colors:', err);
      toast.error('Gagal memproses gambar untuk ekstraksi warna');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleCopySingle = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    toast.success(`${hex} disalin!`);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const handleCopyAll = () => {
    if (colors.length === 0) return;
    const allHex = colors.map((c) => c.hex).join(', ');
    navigator.clipboard.writeText(allHex);
    setCopiedAll(true);
    toast.success('Seluruh kode HEX berhasil disalin!');
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleInsertToBody = () => {
    if (colors.length === 0) return;
    const hexList = colors.map((c) => c.hex);
    const hexCsv = hexList.join(', ');

    const roleLabels = ['Primary', 'Accent', 'Secondary', 'Neutral', 'Background'];
    const roleItems = colors
      .map((c, i) => `- ${roleLabels[i] || `Color ${i + 1}`}: \`${c.hex}\``)
      .join('\n');

    const markdownParts: string[] = [];

    // If an image was successfully compressed and uploaded, include it in markdown
    if (uploadedImageUrl) {
      markdownParts.push('## 🖼️ Reference Image');
      markdownParts.push(`![](${uploadedImageUrl})\n`);
    }

    markdownParts.push('## 🎨 Color Palette');
    markdownParts.push(`- Swatches: ${hexCsv}`);
    markdownParts.push(roleItems);

    const markdown = markdownParts.join('\n');

    onInsertPalette?.(markdown, hexList, uploadedImageUrl || undefined);
    toast.success('Palet warna dan gambar referensi berhasil disisipkan ke wireframe!');
  };

  const handleClear = () => {
    setColors([]);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    setImageName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`w-full font-sans text-xs bg-white dark:bg-[#0d0e12] ${className}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* When no image is uploaded yet: Compact Upload Dropzone */}
      {colors.length === 0 && !imagePreview ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full p-4 flex flex-col items-center justify-center gap-2 border-2 border-dashed transition-all cursor-pointer select-none ${
            isDragging
              ? 'border-[#ff5e1f] bg-[#ff5e1f]/5 dark:bg-[#ff5e1f]/10'
              : 'border-gray-200 dark:border-[#272a34] bg-gray-50/40 dark:bg-[#16181d]/40 hover:border-[#ff5e1f] hover:bg-gray-50 dark:hover:bg-[#16181d]'
          }`}
        >
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#ff5e1f]" />
              <span className="font-bold">Mengekstrak warna dari gambar...</span>
            </div>
          ) : (
            <>
              <div className="w-8 h-8 rounded border border-gray-200 dark:border-[#272a34] bg-white dark:bg-[#0d0e12] flex items-center justify-center text-[#ff5e1f] shadow-xs">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-800 dark:text-gray-200">
                  Upload Gambar Referensi Warna
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                  Klik untuk pilih file, drag & drop, atau <span className="font-bold text-gray-700 dark:text-gray-300">Paste (Cmd+V)</span>
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        /* When colors are extracted: Rich Palette Card */
        <div className="p-3.5 sm:p-4 border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 space-y-3">
          
          {/* Header Row: Thumbnail Preview & Action Buttons */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt="Thumbnail"
                  className="w-8 h-8 object-cover rounded border border-[#f0f0f0] dark:border-[#272a34] shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] text-[#ff5e1f] flex items-center justify-center shrink-0">
                  <Palette className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-gray-900 dark:text-white truncate">
                  {imageName || 'Extracted Color Palette'}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                  {colors.length} Warna Dominan • Klik swatch untuk salin
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <button
                type="button"
                onClick={handleCopyAll}
                className="px-2.5 py-1.5 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] hover:bg-gray-100 dark:hover:bg-[#20232b] text-[11px] font-bold text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1 cursor-pointer"
                title="Salin seluruh HEX"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-[#ff5e1f]" />}
                <span>Salin Semua</span>
              </button>

              {onInsertPalette && (
                <button
                  type="button"
                  onClick={handleInsertToBody}
                  className="px-3 py-1.5 bg-[#ff5e1f] hover:bg-[#ff7038] text-white text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                  title="Sisipkan ke Body Wireframe"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert to Body</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 text-gray-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                title="Ganti Gambar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Color Swatches Grid */}
          <div className="grid grid-cols-5 gap-2">
            {colors.map((color, idx) => {
              const isCopied = copiedHex === color.hex;
              const roleLabels = ['Primary', 'Accent', 'Secondary', 'Neutral', 'Light'];
              return (
                <button
                  key={`${color.hex}-${idx}`}
                  type="button"
                  onClick={() => handleCopySingle(color.hex)}
                  className="group relative flex flex-col rounded-none border border-[#f0f0f0] dark:border-[#272a34] overflow-hidden bg-white dark:bg-[#0d0e12] hover:border-[#ff5e1f] transition-all cursor-pointer text-left focus:outline-none"
                  title={`Klik untuk salin ${color.hex}`}
                >
                  {/* Swatch Color Block */}
                  <div
                    className="w-full h-11 relative flex items-center justify-center transition-transform group-hover:scale-105 duration-150"
                    style={{ backgroundColor: color.hex }}
                  >
                    {isCopied && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Swatch Meta */}
                  <div className="p-1.5 flex flex-col justify-between bg-white dark:bg-[#0d0e12]">
                    <span className="font-bold text-[10px] sm:text-[11px] text-gray-900 dark:text-gray-100 group-hover:text-[#ff5e1f] truncate transition-colors">
                      {color.hex}
                    </span>
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate">
                      {roleLabels[idx] || `#${idx + 1}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}
