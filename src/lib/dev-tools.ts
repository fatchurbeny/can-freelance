/**
 * Alat developer (Knowledge Graph) hanya untuk lokal. Di build produksi (VPS) halaman,
 * API, dan menunya disembunyikan. NODE_ENV di-inline saat build, aman dipakai di client.
 */
export const DEV_TOOLS_ENABLED = process.env.NODE_ENV !== 'production';
