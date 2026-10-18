/**
 * Client-Side Image Color Palette Extractor
 * Pure HTML5 Canvas implementation using Median Cut Quantization.
 * Zero external dependencies, ultra-fast (<50ms).
 */

export interface ExtractedColor {
  hex: string;
  rgb: [number, number, number];
  isLight: boolean;
  name?: string;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface ColorBox {
  pixels: RGB[];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function isLightColor(r: number, g: number, b: number): boolean {
  // Relative luminance threshold
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 140;
}

function getWidestChannel(pixels: RGB[]): 'r' | 'g' | 'b' {
  let minR = 255, maxR = 0;
  let minG = 255, maxG = 0;
  let minB = 255, maxB = 0;

  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i];
    if (p.r < minR) minR = p.r;
    if (p.r > maxR) maxR = p.r;
    if (p.g < minG) minG = p.g;
    if (p.g > maxG) maxG = p.g;
    if (p.b < minB) minB = p.b;
    if (p.b > maxB) maxB = p.b;
  }

  const rangeR = maxR - minR;
  const rangeG = maxG - minG;
  const rangeB = maxB - minB;

  if (rangeR >= rangeG && rangeR >= rangeB) return 'r';
  if (rangeG >= rangeR && rangeG >= rangeB) return 'g';
  return 'b';
}

function medianCut(boxes: ColorBox[], targetCount: number): ColorBox[] {
  while (boxes.length < targetCount) {
    let splitIndex = -1;
    let maxPixelCount = -1;

    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].pixels.length > maxPixelCount && boxes[i].pixels.length >= 2) {
        maxPixelCount = boxes[i].pixels.length;
        splitIndex = i;
      }
    }

    if (splitIndex === -1) break;

    const targetBox = boxes.splice(splitIndex, 1)[0];
    const channel = getWidestChannel(targetBox.pixels);

    targetBox.pixels.sort((a, b) => a[channel] - b[channel]);
    const mid = Math.floor(targetBox.pixels.length / 2);

    boxes.push({ pixels: targetBox.pixels.slice(0, mid) });
    boxes.push({ pixels: targetBox.pixels.slice(mid) });
  }

  return boxes;
}

interface Bucket { r: number; g: number; b: number; count: number; sat: number; lum: number }

const lumOf = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
const dist = (a: Bucket, b: Bucket) => {
  const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
};

/**
 * Histogram palette: buckets pixels (5 bits/channel), uses each bucket's real mean colour
 * (no cross-colour averaging), then picks vivid accents by coverage × saturation and
 * the dominant dark / light neutrals — so small but key brand colours (lime, pink) survive.
 */
function pickPalette(data: Uint8ClampedArray, maxColors: number): ExtractedColor[] {
  const map = new Map<number, { r: number; g: number; b: number; n: number }>();
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const e = map.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    e.r += r; e.g += g; e.b += b; e.n++;
    map.set(key, e);
    total++;
  }
  if (!total) return [];

  // Merge neighbouring buckets into clusters (greedy by frequency)
  const raw = [...map.values()].sort((a, b) => b.n - a.n);
  const clusters: Bucket[] = [];
  for (const e of raw) {
    const c = { r: e.r / e.n, g: e.g / e.n, b: e.b / e.n, count: e.n, sat: 0, lum: 0 };
    const near = clusters.find((k) => dist(k, c) < 55);
    if (near) {
      const n = near.count + c.count;
      near.r = (near.r * near.count + c.r * c.count) / n;
      near.g = (near.g * near.count + c.g * c.count) / n;
      near.b = (near.b * near.count + c.b * c.count) / n;
      near.count = n;
    } else clusters.push(c);
  }
  for (const c of clusters) {
    const mx = Math.max(c.r, c.g, c.b), mn = Math.min(c.r, c.g, c.b);
    c.sat = mx === 0 ? 0 : (mx - mn) / mx;
    c.lum = lumOf(c.r, c.g, c.b);
  }

  const minCount = total * 0.004;
  const usable = clusters.filter((c) => c.count >= minCount);
  const isVivid = (c: Bucket) => c.sat > 0.35 && c.lum > 35;

  const picked: Bucket[] = [];
  const take = (c?: Bucket) => {
    if (c && picked.length < maxColors && !picked.some((p) => dist(p, c) < 70)) picked.push(c);
  };

  // 1. Vivid brand colours, ranked by coverage × saturation
  const vivid = usable.filter(isVivid).sort((a, b) => b.count * b.sat - a.count * a.sat);
  const neutrals = usable.filter((c) => !isVivid(c)).sort((a, b) => b.count - a.count);
  const vividSlots = Math.max(1, maxColors - Math.min(3, neutrals.length));
  const hueOf = (c: Bucket) => {
    const r = c.r / 255, g = c.g / 255, b = c.b / 255;
    const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
    if (!d) return 0;
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const hueGap = (a: Bucket, b: Bucket) => {
    const d = Math.abs(hueOf(a) - hueOf(b));
    return Math.min(d, 360 - d);
  };
  for (const c of vivid) {
    if (picked.length >= vividSlots) break;
    // Accents must differ in hue, not just shade (avoid two limes)
    if (picked.every((p) => hueGap(p, c) > 25)) take(c);
  }

  // 2. Dominant dark, light and mid neutrals
  take(neutrals.find((c) => c.lum < 110));
  take(neutrals.find((c) => c.lum > 170));
  neutrals.forEach((c) => take(c));
  vivid.forEach((c) => take(c));

  const toColor = (c: Bucket): ExtractedColor => {
    const r = Math.round(c.r), g = Math.round(c.g), b = Math.round(c.b);
    return { hex: rgbToHex(r, g, b), rgb: [r, g, b], isLight: isLightColor(r, g, b) };
  };
  const accents = picked.filter(isVivid);
  const neutralPicked = picked.filter((c) => !isVivid(c)).sort((a, b) => a.lum - b.lum);
  // Role order used downstream: Primary, Accent, Secondary, Neutral, Background
  return [...accents, ...neutralPicked].map(toColor);
}

/**
 * Extracts dominant color palette from an image File, Blob, or URL.
 */
export async function extractColorsFromImage(
  source: File | Blob | string,
  maxColors = 5
): Promise<ExtractedColor[]> {
  return new Promise((resolve, reject) => {
    let objectUrl = '';
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    if (typeof source === 'string') {
      img.src = source;
    } else {
      objectUrl = URL.createObjectURL(source);
      img.src = objectUrl;
    }

    img.onload = () => {
      try {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve([]);
        }

        // Downsample keeping aspect ratio (max 160px) so thin accents survive
        const scale = Math.min(1, 160 / Math.max(img.naturalWidth || 160, img.naturalHeight || 160));
        canvas.width = Math.max(1, Math.round((img.naturalWidth || 160) * scale));
        canvas.height = Math.max(1, Math.round((img.naturalHeight || 160) * scale));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        resolve(pickPalette(data, maxColors));
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for color extraction'));
    };
  });
}

/**
 * Compresses an image File or Blob to an optimized WebP blob (<100KB)
 * Resizes max dimension to 800px for long-term lightweight storage.
 */
export async function compressImageToWebP(
  file: File | Blob,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas 2d context for compression'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas toBlob conversion failed'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = objectUrl;
  });
}

