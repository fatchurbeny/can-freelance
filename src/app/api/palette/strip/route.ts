import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Sengaja publik (tanpa authorizeApi): gambar strip ini ditanam di body Notion (lihat actions/qa.ts)
// dan diambil Notion tanpa cookie sesi. Input dibatasi ke hex 6 digit, jadi SVG tidak bisa disisipi.

function isLight(hex: string): boolean {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 145;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const colorsParam = searchParams.get('colors') || '';

  // Extract clean hex values
  const hexList = colorsParam
    .split(',')
    .map((c) => c.trim().replace(/^#/, ''))
    .filter((c) => /^[0-9A-Fa-f]{6}$/.test(c))
    .map((c) => `#${c.toUpperCase()}`);

  if (hexList.length === 0) {
    return new NextResponse('Invalid or missing colors parameter', { status: 400 });
  }

  const width = 800;
  const height = 140;
  const count = hexList.length;
  const swatchWidth = width / count;

  const roleLabels = ['PRIMARY', 'ACCENT', 'SECONDARY', 'NEUTRAL', 'BACKGROUND'];

  // Build SVG swatch blocks
  let rectsSvg = '';
  hexList.forEach((hex, i) => {
    const x = i * swatchWidth;
    const light = isLight(hex);
    const textColor = light ? '#1E293B' : '#FFFFFF';
    const subColor = light ? '#64748B' : '#CBD5E1';
    const roleText = roleLabels[i] || `COLOR ${i + 1}`;

    rectsSvg += `
      <rect x="${x}" y="0" width="${swatchWidth}" height="${height}" fill="${hex}" />
      <text x="${x + swatchWidth / 2}" y="${height - 46}" 
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
            font-size="12" font-weight="700" 
            letter-spacing="0.5" fill="${subColor}" text-anchor="middle">
        ${roleText}
      </text>
      <text x="${x + swatchWidth / 2}" y="${height - 24}" 
            font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" 
            font-size="14" font-weight="800" 
            letter-spacing="0.5" fill="${textColor}" text-anchor="middle">
        ${hex}
      </text>
    `;
  });

  const fullSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="rounded">
      <rect width="${width}" height="${height}" rx="12" ry="12" />
    </clipPath>
  </defs>
  <g clip-path="url(#rounded)">
    ${rectsSvg}
  </g>
  <rect width="${width}" height="${height}" rx="12" ry="12" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="2" />
</svg>`;

  return new NextResponse(fullSvg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

