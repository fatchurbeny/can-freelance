/**
 * Canonical default preset pages per Doctype name.
 * Shared between Server actions, Notion sync, and Client form components.
 */

export const DOCTYPE_DEFAULT_PRESETS: Record<string, number> = {
  'Regular-Presentation': 12,
  'Infographic-Slides': 15,
  'Infographic-Slides-1': 10,
  'calendar': 12,
  'Regular-Sosmed': 4,
  'Instagram-Carousel': 5,
  'Linked-Carousel': 5,
  'Magazine': 4,
  'Newsletter': 3,
  'CV-Resume': 2,
  'Infographic-Sosmed': 1,
  'Flow-Process-Infographic': 1,
  'Flyer': 1,
  'Graph': 1,
  'Graph-Freeboard': 1,
  'Infographic-Flyer': 1,
  'Infographic-Graph': 1,
  'Notes/Meeting-Minutes': 1,
  'Spesification-Sheets': 1,
  'Test Doctype': 1,
};

/**
 * Resolves the preset page count for a Doctype based on its display name or key.
 * Evaluates exact match first, followed by substring heuristics with proper priority.
 */
export function getPresetPagesByName(name?: string | null): number {
  if (!name) return 1;
  const clean = name.trim();

  // 1. Exact dictionary match (case-sensitive and case-insensitive)
  if (DOCTYPE_DEFAULT_PRESETS[clean] !== undefined) {
    return DOCTYPE_DEFAULT_PRESETS[clean];
  }
  const cleanLower = clean.toLowerCase();
  for (const [key, pages] of Object.entries(DOCTYPE_DEFAULT_PRESETS)) {
    if (key.toLowerCase() === cleanLower) {
      return pages;
    }
  }

  // 2. Specific compound matches
  if (cleanLower === 'regular-presentation' || cleanLower.includes('presentation') || cleanLower.includes('slides-12') || cleanLower.includes('calendar')) {
    return 12;
  }
  if (cleanLower.includes('slides-1')) {
    return 10;
  }
  if (cleanLower.includes('infographic-slides')) {
    return 15;
  }
  if (cleanLower === 'regular-sosmed') {
    return 4;
  }
  if (cleanLower === 'infographic-sosmed') {
    return 1;
  }
  if (cleanLower.includes('carousel')) {
    return 5;
  }
  if (cleanLower.includes('magazine')) {
    return 4;
  }
  if (cleanLower.includes('newsletter')) {
    return 3;
  }
  if (cleanLower.includes('resume') || cleanLower.includes('cv')) {
    return 2;
  }
  if (cleanLower.includes('infographic') && !cleanLower.includes('flyer') && !cleanLower.includes('graph') && !cleanLower.includes('sosmed')) {
    return 6;
  }

  return 1;
}
