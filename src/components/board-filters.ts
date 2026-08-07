export interface Option {
  id: string;
  label: string;
  color?: string | null;
}

export interface FilterFacets {
  designers: Option[];
  doctypes: Option[];
  brands: Option[];
  languages: string[];
  priorities: string[];
  /** Distinct taskMonth values, sorted desc, e.g. ["Agustus-2026", "Juli-2026"]. */
  months: string[];
}

export interface BoardFilters {
  designers: string[];
  doctypes: string[];
  brands: string[];
  languages: string[];
  priorities: string[];
  taskMonths: string[];
}

export const EMPTY_FILTERS: BoardFilters = {
  designers: [],
  doctypes: [],
  brands: [],
  languages: [],
  priorities: [],
  taskMonths: [],
};
