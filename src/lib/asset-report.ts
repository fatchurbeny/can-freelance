import prisma from '@/lib/prisma';
import { INDONESIAN_SHORT_MONTHS } from '@/lib/period-utils';

/**
 * Asset Report: pemakaian aset Asset Library di brief task.
 * - Apply = satu baris `task_assets` (aset ada di section 📦 Assets brief / relation Notion task itu),
 *   tanggalnya `task_assets.createdAt` (pertama kali dipakai).
 * - Status hasil = status desain task: Approved / Profile only / Reject / Dikerjakan.
 * - Bermasalah % = (Profile only + Reject) / template selesai; dipakai untuk menandai aset yang
 *   mungkin menurunkan kualitas template.
 */

export type TemplateOutcome = 'approved' | 'profileOnly' | 'reject' | 'inProgress';
export type QualityFlag = 'check' | 'ok' | 'insufficient' | 'unused';

/** Aset baru dinilai bila template selesainya minimal sebanyak ini. */
export const MIN_COMPLETED = 3;
/** "Perlu dicek": bermasalah ≥ rata-rata kategori + 15 poin dan ≥ 40%. */
const CHECK_MARGIN = 0.15;
const CHECK_FLOOR = 0.4;

export interface ReportFilters {
  /** null = Semua aset. */
  categoryId: string | null;
  productionUnitId: string | null;
  /** null = semua waktu. */
  days: number | null;
  /** Production yang boleh diakses user; null = semua. */
  unitIds: string[] | null;
}

interface StatusLike {
  displayName: string;
  notionKey: string;
  countsAsApproved: boolean;
  countsAsProfileOnly: boolean;
}

export function outcomeOf(status: StatusLike | null, dateReject: Date | null): TemplateOutcome {
  if (status?.countsAsApproved) return 'approved';
  if (status?.countsAsProfileOnly) return 'profileOnly';
  if (status && (/reject/i.test(status.displayName) || /reject/i.test(status.notionKey))) return 'reject';
  if (!status && dateReject) return 'reject';
  return 'inProgress';
}

export interface OutcomeCounts {
  applies: number;
  approved: number;
  profileOnly: number;
  reject: number;
  inProgress: number;
}

const emptyCounts = (): OutcomeCounts => ({ applies: 0, approved: 0, profileOnly: 0, reject: 0, inProgress: 0 });
const add = (c: OutcomeCounts, o: TemplateOutcome) => { c.applies++; c[o]++; };
const completed = (c: OutcomeCounts) => c.approved + c.profileOnly + c.reject;
export const problemRate = (c: OutcomeCounts): number | null => {
  const done = completed(c);
  return done ? (c.profileOnly + c.reject) / done : null;
};

export interface AssetReportRow extends OutcomeCounts {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  previewUrl: string;
  coverUrl: string | null;
  createdAt: number;
  problemRate: number | null;
  flag: QualityFlag;
}

export interface CategoryReportRow extends OutcomeCounts {
  id: string;
  name: string;
  assetsTotal: number;
  assetsUsed: number;
  problemRate: number | null;
  checkCount: number;
}

export interface AssetReport {
  category: { id: string; name: string } | null;
  kpi: OutcomeCounts & { assetsTotal: number; assetsUsed: number; prevApplies: number | null; prevUsages: number | null };
  /** Rata-rata bermasalah seluruh aset (semua kategori) di filter yang sama, pembanding. */
  overallProblemRate: number | null;
  weekly: { key: string; label: string; applies: number; usages: number }[];
  rows: AssetReportRow[];
  categories: CategoryReportRow[];
}

const DAY = 24 * 60 * 60 * 1000;

function taskWhere(f: Pick<ReportFilters, 'productionUnitId' | 'unitIds'>) {
  if (f.productionUnitId) {
    if (f.unitIds && !f.unitIds.includes(f.productionUnitId)) return { productionUnitId: { in: [] as string[] } };
    return { productionUnitId: f.productionUnitId };
  }
  return f.unitIds ? { productionUnitId: { in: f.unitIds } } : {};
}

const statusSelect = { displayName: true, notionKey: true, countsAsApproved: true, countsAsProfileOnly: true } as const;

/** Senin awal minggu (lokal) sebagai kunci grafik mingguan. */
function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - offset);
  return x;
}
const weekKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const weekLabel = (d: Date) => `${d.getDate()} ${INDONESIAN_SHORT_MONTHS[d.getMonth()]}`;

export async function loadAssetReport(f: ReportFilters): Promise<AssetReport> {
  const now = Date.now();
  const since = f.days ? new Date(now - f.days * DAY) : null;
  const prevSince = f.days ? new Date(now - 2 * f.days * DAY) : null;

  const [categories, assets, links] = await Promise.all([
    prisma.assetCategory.findMany({ where: { archived: false }, orderBy: { sortOrder: 'asc' } }),
    prisma.asset.findMany({
      where: { status: 'active' },
      select: { id: true, title: true, categoryId: true, previewUrl: true, coverUrl: true, createdAt: true },
      orderBy: { title: 'asc' },
    }),
    prisma.taskAsset.findMany({
      where: {
        asset: { status: 'active' },
        task: taskWhere(f),
        ...(prevSince ? { createdAt: { gte: prevSince } } : {}),
      },
      select: {
        assetId: true,
        createdAt: true,
        task: { select: { dateReject: true, designStatus: { select: statusSelect } } },
      },
    }),
  ]);

  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const perAsset = new Map<string, OutcomeCounts>();
  const perCategory = new Map<string, OutcomeCounts>();
  const weekly = new Map<string, { label: string; applies: number; usages: number }>();
  let prevApplies = 0;
  let prevUsages = 0;
  const assetCategory = new Map(assets.map((a) => [a.id, a.categoryId]));

  for (const link of links) {
    const outcome = outcomeOf(link.task.designStatus, link.task.dateReject);
    const categoryId = assetCategory.get(link.assetId);
    if (!categoryId) continue;
    if (since && link.createdAt < since) {
      if (!f.categoryId || categoryId === f.categoryId) {
        prevApplies++;
        if (outcome === 'approved') prevUsages++;
      }
      continue;
    }
    if (!perAsset.has(link.assetId)) perAsset.set(link.assetId, emptyCounts());
    add(perAsset.get(link.assetId)!, outcome);
    if (!perCategory.has(categoryId)) perCategory.set(categoryId, emptyCounts());
    add(perCategory.get(categoryId)!, outcome);
    if (!f.categoryId || categoryId === f.categoryId) {
      const ws = weekStart(link.createdAt);
      const key = weekKey(ws);
      if (!weekly.has(key)) weekly.set(key, { label: weekLabel(ws), applies: 0, usages: 0 });
      const w = weekly.get(key)!;
      w.applies++;
      if (outcome === 'approved') w.usages++;
    }
  }

  // Minggu tanpa pemakaian tetap tampil (0) agar grafik tidak loncat
  if (since && weekly.size) {
    for (let d = weekStart(since); d.getTime() <= now; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)) {
      const key = weekKey(d);
      if (!weekly.has(key)) weekly.set(key, { label: weekLabel(d), applies: 0, usages: 0 });
    }
  }

  const overall = emptyCounts();
  perCategory.forEach((c) => {
    overall.applies += c.applies; overall.approved += c.approved; overall.profileOnly += c.profileOnly;
    overall.reject += c.reject; overall.inProgress += c.inProgress;
  });
  const categoryRate = new Map([...perCategory].map(([id, c]) => [id, problemRate(c)]));

  const flagOf = (c: OutcomeCounts, categoryId: string): QualityFlag => {
    if (c.applies === 0) return 'unused';
    if (completed(c) < MIN_COMPLETED) return 'insufficient';
    const rate = problemRate(c) ?? 0;
    const avg = categoryRate.get(categoryId) ?? 0;
    return rate >= avg + CHECK_MARGIN && rate >= CHECK_FLOOR ? 'check' : 'ok';
  };

  const scopedAssets = assets.filter((a) => !f.categoryId || a.categoryId === f.categoryId);
  const rows: AssetReportRow[] = scopedAssets.map((a) => {
    const c = perAsset.get(a.id) ?? emptyCounts();
    return {
      id: a.id,
      title: a.title,
      categoryId: a.categoryId,
      categoryName: categoryName.get(a.categoryId) ?? '—',
      previewUrl: a.previewUrl,
      coverUrl: a.coverUrl,
      createdAt: a.createdAt.getTime(),
      ...c,
      problemRate: problemRate(c),
      flag: flagOf(c, a.categoryId),
    };
  }).sort((x, y) => y.applies - x.applies || x.title.localeCompare(y.title, 'id'));

  const scoped = emptyCounts();
  rows.forEach((r) => {
    scoped.applies += r.applies; scoped.approved += r.approved; scoped.profileOnly += r.profileOnly;
    scoped.reject += r.reject; scoped.inProgress += r.inProgress;
  });

  const categoryRows: CategoryReportRow[] = f.categoryId ? [] : categories.map((cat) => {
    const c = perCategory.get(cat.id) ?? emptyCounts();
    const catAssets = rows.filter((r) => r.categoryId === cat.id);
    return {
      id: cat.id,
      name: cat.name,
      assetsTotal: catAssets.length,
      assetsUsed: catAssets.filter((r) => r.applies > 0).length,
      ...c,
      problemRate: problemRate(c),
      checkCount: catAssets.filter((r) => r.flag === 'check').length,
    };
  }).sort((x, y) => y.applies - x.applies);

  return {
    category: f.categoryId ? { id: f.categoryId, name: categoryName.get(f.categoryId) ?? 'Kategori' } : null,
    kpi: {
      ...scoped,
      assetsTotal: rows.length,
      assetsUsed: rows.filter((r) => r.applies > 0).length,
      prevApplies: since ? prevApplies : null,
      prevUsages: since ? prevUsages : null,
    },
    overallProblemRate: problemRate(overall),
    weekly: [...weekly].sort(([a], [b]) => a.localeCompare(b)).map(([key, w]) => ({ key, ...w })),
    rows,
    categories: categoryRows,
  };
}

export interface AssetUsageRow {
  taskId: string;
  title: string;
  productionName: string | null;
  taskMonth: string | null;
  outcome: TemplateOutcome;
  statusName: string | null;
  designerName: string | null;
  pages: number | null;
  doctypeName: string | null;
  templateUrl: string | null;
  /** Halaman aset yang dipakai di brief (mis. "3, 7"); null = semua. */
  assetPages: string | null;
  note: string | null;
  appliedAt: number;
}

export interface AssetUsage {
  asset: { id: string; title: string; categoryName: string; previewUrl: string; editUrl: string | null; coverUrl: string | null; productionNames: string[]; createdAt: number };
  counts: OutcomeCounts;
  problemRate: number | null;
  categoryProblemRate: number | null;
  flag: QualityFlag;
  rows: AssetUsageRow[];
}

/** Drawer detail aset: setiap task (template) yang memakai aset, dengan status, pages doctype, dan link template. */
export async function loadAssetUsage(assetId: string, f: Omit<ReportFilters, 'categoryId'>): Promise<AssetUsage | null> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: { category: { select: { name: true } }, productions: { include: { productionUnit: { select: { name: true } } } } },
  });
  if (!asset) return null;
  const since = f.days ? new Date(Date.now() - f.days * DAY) : null;

  const links = await prisma.taskAsset.findMany({
    where: { assetId, task: taskWhere(f), ...(since ? { createdAt: { gte: since } } : {}) },
    orderBy: { createdAt: 'desc' },
    select: {
      pages: true,
      createdAt: true,
      task: {
        select: {
          id: true,
          name: true,
          taskMonth: true,
          pages: true,
          outputUrl: true,
          dateReject: true,
          designStatus: { select: statusSelect },
          designer: { select: { displayName: true } },
          doctype: { select: { displayName: true, pages: true } },
          productionUnit: { select: { name: true } },
          canvaLinks: { select: { url: true }, orderBy: { createdAt: 'asc' }, take: 1 },
          comments: { select: { content: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
  });

  const counts = emptyCounts();
  const rows: AssetUsageRow[] = links.map((link) => {
    const t = link.task;
    const outcome = outcomeOf(t.designStatus, t.dateReject);
    add(counts, outcome);
    const doctypePages = t.doctype?.pages ?? null;
    const taskPages = t.pages != null ? Number(t.pages) : null;
    return {
      taskId: t.id,
      title: t.name || 'Tanpa judul',
      productionName: t.productionUnit?.name ?? null,
      taskMonth: t.taskMonth,
      outcome,
      statusName: t.designStatus?.displayName ?? null,
      designerName: t.designer?.displayName ?? null,
      pages: doctypePages ?? taskPages,
      doctypeName: t.doctype?.displayName ?? null,
      templateUrl: t.canvaLinks[0]?.url ?? t.outputUrl ?? null,
      assetPages: link.pages,
      note: outcome === 'reject' || outcome === 'profileOnly' ? t.comments[0]?.content ?? null : null,
      appliedAt: link.createdAt.getTime(),
    };
  });

  // Rata-rata kategori untuk pembanding "Perlu dicek"
  const categoryLinks = await prisma.taskAsset.findMany({
    where: { asset: { categoryId: asset.categoryId, status: 'active' }, task: taskWhere(f), ...(since ? { createdAt: { gte: since } } : {}) },
    select: { task: { select: { dateReject: true, designStatus: { select: statusSelect } } } },
  });
  const categoryCounts = emptyCounts();
  categoryLinks.forEach((l) => add(categoryCounts, outcomeOf(l.task.designStatus, l.task.dateReject)));
  const categoryProblemRate = problemRate(categoryCounts);
  const rate = problemRate(counts);
  const flag: QualityFlag = counts.applies === 0 ? 'unused'
    : completed(counts) < MIN_COMPLETED ? 'insufficient'
    : (rate ?? 0) >= (categoryProblemRate ?? 0) + CHECK_MARGIN && (rate ?? 0) >= CHECK_FLOOR ? 'check' : 'ok';

  return {
    asset: {
      id: asset.id,
      title: asset.title,
      categoryName: asset.category.name,
      previewUrl: asset.previewUrl,
      editUrl: asset.editUrl,
      coverUrl: asset.coverUrl,
      productionNames: asset.productions.map((p) => p.productionUnit.name),
      createdAt: asset.createdAt.getTime(),
    },
    counts,
    problemRate: rate,
    categoryProblemRate,
    flag,
    rows,
  };
}
