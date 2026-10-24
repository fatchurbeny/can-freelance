import { Prisma } from '../../generated/prisma';
import prisma from '@/lib/prisma';
import { 
  parseTaskMonthToKey, 
  INDONESIAN_FULL_MONTHS, 
  INDONESIAN_SHORT_MONTHS,
  taskMonthsInRange,
} from '@/lib/period-utils';

/** Label tab Overview untuk task tanpa akun/brand. */
export const NO_BRAND_LABEL = 'Tanpa Brand';

export interface DashboardFilters {
  brandName?: string | null;
  productionUnitId?: string | null;
  selectedPeriod?: string | null; // format: "YYYY-MM,YYYY-MM,..." or "Januari-2026,Februari-2026,..."
}

const indNames: { [key: string]: string } = {
  '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
  '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
  '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
};

const indNamesInv: { [key: string]: number } = {
  'Januari': 0, 'Februari': 1, 'Maret': 2, 'April': 3,
  'Mei': 4, 'Juni': 5, 'Juli': 6, 'Agustus': 7,
  'September': 8, 'Oktober': 9, 'November': 10, 'Desember': 11
};

export async function getAvailablePeriods() {
  try {
    const rawPeriods = await prisma.$queryRaw<{ task_month: string }[]>(Prisma.sql`
      SELECT DISTINCT task_month
      FROM tasks
      WHERE task_month IS NOT NULL AND task_month != ''
    `);

    const formatted = rawPeriods.map((p) => {
      const key = parseTaskMonthToKey(p.task_month);
      if (key) {
        return {
          key,
          raw: p.task_month
        };
      }
      return null;
    }).filter(Boolean) as { key: string; raw: string }[];

    // Unique keys sorted descending by YYYY-MM
    const uniqueMap = new Map<string, string>();
    for (const f of formatted) {
      if (!uniqueMap.has(f.key)) {
        uniqueMap.set(f.key, f.key);
      }
    }
    const uniqueKeys = Array.from(uniqueMap.keys());
    uniqueKeys.sort((a, b) => b.localeCompare(a));

    return uniqueKeys;
  } catch (error) {
    console.error('Error fetching available periods:', error);
    return [];
  }
}

export async function getDashboardData(filters: DashboardFilters) {
  // 1. Resolve selected period keys (normalized YYYY-MM)
  let selectedKeys: string[] = [];
  if (filters.selectedPeriod && filters.selectedPeriod !== 'all') {
    const rawTokens = (Array.isArray(filters.selectedPeriod) 
      ? filters.selectedPeriod.join(',') 
      : filters.selectedPeriod
    ).split(',').filter(Boolean);

    selectedKeys = rawTokens
      .map((token) => parseTaskMonthToKey(token))
      .filter(Boolean) as string[];
  }

  if (filters.selectedPeriod === 'all' || selectedKeys.length === 0) {
    selectedKeys = await getAvailablePeriods();
  }

  // 2. Resolve account/brand ID
  let accountId: string | null = null;
  let accountName: string | null = null;
  // Tab "Tanpa Brand" = task tanpa akun/brand (mis. task order bundle).
  const noBrand = filters.brandName === NO_BRAND_LABEL;
  if (filters.brandName && filters.brandName !== 'Semua Brand' && !noBrand) {
    const acc = await prisma.account.findFirst({
      where: {
        displayName: {
          equals: filters.brandName,
          mode: 'insensitive',
        },
      },
    });
    if (acc) {
      accountId = acc.id;
      accountName = acc.displayName;
    }
  }

  // 3. Compute prior period months for KPI comparisons
  const duration = selectedKeys.length;
  const selectedIndices = selectedKeys.map((p) => {
    const [y, m] = p.split('-');
    return parseInt(y, 10) * 12 + (parseInt(m, 10) - 1);
  });
  
  selectedIndices.sort((a, b) => a - b);
  
  const priorIndices = selectedIndices.map((idx) => idx - duration);
  const priorKeys = priorIndices.map((idx) => {
    const y = Math.floor(idx / 12);
    const m = (idx % 12) + 1;
    return `${y}-${m.toString().padStart(2, '0')}`;
  });

  // Helper to build DB month variants ("Agustus-2026", "Agt-2026", "2026-08")
  const buildDbMonthVariants = (keys: string[]): string[] => {
    const variants: string[] = [];
    for (const key of keys) {
      const [year, month] = key.split('-');
      const mIdx = parseInt(month, 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        variants.push(`${INDONESIAN_FULL_MONTHS[mIdx]}-${year}`);
        variants.push(`${INDONESIAN_SHORT_MONTHS[mIdx]}-${year}`);
      }
      variants.push(key);
    }
    return Array.from(new Set(variants));
  };

  const indPeriods = buildDbMonthVariants(selectedKeys);
  const priorIndPeriods = buildDbMonthVariants(priorKeys);

  const accId = accountId;

  // Helpers for SQL conditions
  const accFilter = noBrand
    ? Prisma.sql`AND NOT EXISTS (SELECT 1 FROM task_accounts ta WHERE ta.task_id = t.id)`
    : accId
      ? Prisma.sql`AND EXISTS (SELECT 1 FROM task_accounts ta WHERE ta.task_id = t.id AND ta.account_id = ${accId}::uuid)`
      : Prisma.empty;
  // Untuk query yang LEFT JOIN task_accounts langsung (dikelompokkan per brand)
  const joinedAccFilter = noBrand
    ? Prisma.sql`AND ta.account_id IS NULL`
    : accId ? Prisma.sql`AND ta.account_id = ${accId}::uuid` : Prisma.empty;

  const unitFilter = filters.productionUnitId
    ? Prisma.sql`AND t.production_unit_id = ${filters.productionUnitId}::uuid`
    : Prisma.empty;
  const periodsFilter = indPeriods.length > 0
    ? Prisma.sql`AND t.task_month IN (${Prisma.join(indPeriods)}) ${unitFilter}`
    : unitFilter;
  const priorPeriodsFilter = priorIndPeriods.length > 0
    ? Prisma.sql`AND t.task_month IN (${Prisma.join(priorIndPeriods)}) ${unitFilter}`
    : unitFilter;

  // -------------------------------------------------------------
  // KPI 1: Total Task
  // -------------------------------------------------------------
  const kpiCurrentTasks = await prisma.$queryRaw<[{ total_task: bigint }]>(Prisma.sql`
    SELECT COUNT(DISTINCT t.id) AS total_task
    FROM tasks t
    WHERE 1=1
    ${periodsFilter}
    ${accFilter}
  `);
  const kpiPriorTasks = await prisma.$queryRaw<[{ total_task: bigint }]>(Prisma.sql`
    SELECT COUNT(DISTINCT t.id) AS total_task
    FROM tasks t
    WHERE 1=1
    ${priorPeriodsFilter}
    ${accFilter}
  `);

  const totalTasks = Number(kpiCurrentTasks[0]?.total_task || 0);
  const priorTasks = Number(kpiPriorTasks[0]?.total_task || 0);
  const tasksChangePct = priorTasks > 0 ? Math.round(((totalTasks - priorTasks) / priorTasks) * 100) : 0;

  // -------------------------------------------------------------
  // KPI 2: Total Template
  // -------------------------------------------------------------
  const kpiCurrentTemplates = await prisma.$queryRaw<[{ total_template: number | null }]>(Prisma.sql`
    SELECT COALESCE(SUM(t.qty_submit), 0) AS total_template
    FROM tasks t
    WHERE 1=1
    ${periodsFilter}
    ${accFilter}
  `);
  const kpiPriorTemplates = await prisma.$queryRaw<[{ total_template: number | null }]>(Prisma.sql`
    SELECT COALESCE(SUM(t.qty_submit), 0) AS total_template
    FROM tasks t
    WHERE 1=1
    ${priorPeriodsFilter}
    ${accFilter}
  `);

  const totalTemplates = Number(kpiCurrentTemplates[0]?.total_template || 0);
  const priorTemplates = Number(kpiPriorTemplates[0]?.total_template || 0);
  const templatesChangePct = priorTemplates > 0 ? Math.round(((totalTemplates - priorTemplates) / priorTemplates) * 100) : 0;

  // -------------------------------------------------------------
  // KPI 2.5: Total Pages
  // -------------------------------------------------------------
  const kpiCurrentPages = await prisma.$queryRaw<[{ total_pages: number | null }]>(Prisma.sql`
    SELECT COALESCE(SUM(t.qty_submit * t.pages), 0) AS total_pages
    FROM tasks t
    WHERE 1=1
    ${periodsFilter}
    ${accFilter}
  `);

  const kpiPriorPages = await prisma.$queryRaw<[{ total_pages: number | null }]>(Prisma.sql`
    SELECT COALESCE(SUM(t.qty_submit * t.pages), 0) AS total_pages
    FROM tasks t
    WHERE 1=1
    ${priorPeriodsFilter}
    ${accFilter}
  `);


  const totalPages = Number(kpiCurrentPages[0]?.total_pages || 0);
  const priorPages = Number(kpiPriorPages[0]?.total_pages || 0);
  const pagesChangePct = priorPages > 0 ? Math.round(((totalPages - priorPages) / priorPages) * 100) : 0;

  // -------------------------------------------------------------
  // KPI 3: Approval Rate
  // -------------------------------------------------------------
  const kpiCurrentApproval = await prisma.$queryRaw<[{ approved_qty: number | null; submitted_qty: number | null }]>(Prisma.sql`
    SELECT
      COALESCE(SUM(t.qty_submit) FILTER (WHERE ds.counts_as_approved), 0) AS approved_qty,
      COALESCE(SUM(t.qty_submit) FILTER (WHERE ds.counts_as_submitted), 0) AS submitted_qty
    FROM tasks t
    JOIN design_statuses ds ON ds.id = t.design_status_id
    WHERE 1=1
    ${periodsFilter}
    ${accFilter}
  `);

  const kpiPriorApproval = await prisma.$queryRaw<[{ approved_qty: number | null; submitted_qty: number | null }]>(Prisma.sql`
    SELECT
      COALESCE(SUM(t.qty_submit) FILTER (WHERE ds.counts_as_approved), 0) AS approved_qty,
      COALESCE(SUM(t.qty_submit) FILTER (WHERE ds.counts_as_submitted), 0) AS submitted_qty
    FROM tasks t
    JOIN design_statuses ds ON ds.id = t.design_status_id
    WHERE 1=1
    ${priorPeriodsFilter}
    ${accFilter}
  `);


  const approvedQty = Number(kpiCurrentApproval[0]?.approved_qty || 0);
  const submittedQty = Number(kpiCurrentApproval[0]?.submitted_qty || 0);
  const approvalRate = submittedQty > 0 ? Math.round((approvedQty / submittedQty) * 100) : 0;

  const priorApprovedQty = Number(kpiPriorApproval[0]?.approved_qty || 0);
  const priorSubmittedQty = Number(kpiPriorApproval[0]?.submitted_qty || 0);
  const priorApprovalRate = priorSubmittedQty > 0 ? Math.round((priorApprovedQty / priorSubmittedQty) * 100) : 0;
  const approvalChangePct = priorApprovalRate > 0 ? Math.round(approvalRate - priorApprovalRate) : 0;

  // -------------------------------------------------------------
  // KPI 4: Approved-Profile Only Rate
  // -------------------------------------------------------------
  const kpiCurrentProfile = await prisma.$queryRaw<[{ profile_qty: number | null; submitted_qty: number | null }]>(Prisma.sql`
    SELECT
      COALESCE(SUM(t.qty_submit) FILTER (WHERE ds.counts_as_profile_only), 0) AS profile_qty,
      COALESCE(SUM(t.qty_submit) FILTER (WHERE ds.counts_as_submitted), 0) AS submitted_qty
    FROM tasks t
    JOIN design_statuses ds ON ds.id = t.design_status_id
    WHERE 1=1
    ${periodsFilter}
    ${accFilter}
  `);

  const kpiPriorProfile = await prisma.$queryRaw<[{ profile_qty: number | null; submitted_qty: number | null }]>(Prisma.sql`
    SELECT
      COALESCE(SUM(t.qty_submit) FILTER (WHERE ds.counts_as_profile_only), 0) AS profile_qty,
      COALESCE(SUM(t.qty_submit) FILTER (WHERE ds.counts_as_submitted), 0) AS submitted_qty
    FROM tasks t
    JOIN design_statuses ds ON ds.id = t.design_status_id
    WHERE 1=1
    ${priorPeriodsFilter}
    ${accFilter}
  `);


  const profileQty = Number(kpiCurrentProfile[0]?.profile_qty || 0);
  const profileSubmittedQty = Number(kpiCurrentProfile[0]?.submitted_qty || 0);
  const profileOnlyRate = profileSubmittedQty > 0 ? Math.round((profileQty / profileSubmittedQty) * 100) : 0;

  const priorProfileQty = Number(kpiPriorProfile[0]?.profile_qty || 0);
  const priorProfileSubmittedQty = Number(kpiPriorProfile[0]?.submitted_qty || 0);
  const priorProfileOnlyRate = priorProfileSubmittedQty > 0 ? Math.round((priorProfileQty / priorProfileSubmittedQty) * 100) : 0;
  const profileOnlyChangePct = priorProfileOnlyRate > 0 ? Math.round(profileOnlyRate - priorProfileOnlyRate) : 0;

  // -------------------------------------------------------------
  // KPI 5: Total Doctype
  // -------------------------------------------------------------
  const kpiDoctypes = await prisma.$queryRaw<[{ total_doctype: bigint }]>(Prisma.sql`
    SELECT COUNT(DISTINCT t.doctype_id) AS total_doctype
    FROM tasks t
    WHERE 1=1
    ${periodsFilter}
    ${accFilter}
  `);

  const totalDoctypes = Number(kpiDoctypes[0]?.total_doctype || 0);

  // -------------------------------------------------------------
  // Widget 6: Tren Volume Task
  // -------------------------------------------------------------
  const trenVolume = await prisma.$queryRaw<{ month: string; brand: string; task_count: bigint; template_count: number; page_count: number }[]>(Prisma.sql`
    SELECT
      t.task_month AS month,
      COALESCE(a.display_name, ${NO_BRAND_LABEL}) AS brand,
      COUNT(DISTINCT t.id) AS task_count,
      COALESCE(SUM(t.qty_submit), 0)::float AS template_count,
      COALESCE(SUM(t.qty_submit * t.pages), 0)::float AS page_count
    FROM tasks t
    LEFT JOIN task_accounts ta ON ta.task_id = t.id
    LEFT JOIN accounts a ON a.id = ta.account_id
    WHERE 1=1
    ${periodsFilter}
    ${joinedAccFilter}
    GROUP BY 1, 2
    ORDER BY 1, 2
  `);


  // Hover Tooltips for Tren Volume Task: all doctypes by brand and month
  const topDoctypesByMonthBrand = await prisma.$queryRaw<{ task_month: string; brand: string; doctype: string; task_count: bigint; row_num: bigint }[]>(Prisma.sql`
    WITH ranked AS (
      SELECT
        t.task_month,
        a.display_name AS brand,
        dt.display_name AS doctype,
        COUNT(*) AS task_count,
        row_number() OVER (PARTITION BY t.task_month, a.display_name ORDER BY COUNT(*) DESC) as row_num
      FROM tasks t
      LEFT JOIN task_accounts ta ON ta.task_id = t.id
      LEFT JOIN accounts a ON a.id = ta.account_id
      JOIN doctypes dt ON dt.id = t.doctype_id
      WHERE 1=1
      ${periodsFilter}
      ${joinedAccFilter}
      GROUP BY 1, 2, 3
    )
    SELECT task_month, COALESCE(brand, ${NO_BRAND_LABEL}) AS brand, doctype, task_count, row_num
    FROM ranked
    ORDER BY task_month, brand, task_count DESC
  `);


  // -------------------------------------------------------------
  // Widget 7: Distribusi Template
  // -------------------------------------------------------------
  const distribusiTemplate = await prisma.$queryRaw<{ brand: string; templates: number }[]>(Prisma.sql`
    SELECT COALESCE(a.display_name, ${NO_BRAND_LABEL}) AS brand, COALESCE(SUM(t.qty_submit), 0)::float AS templates
    FROM tasks t
    LEFT JOIN task_accounts ta ON ta.task_id = t.id
    LEFT JOIN accounts a ON a.id = ta.account_id
    WHERE 1=1
    ${periodsFilter}
    GROUP BY a.display_name
    ORDER BY templates DESC
  `);


  // Hover tooltips for Distribusi Template: all doctypes per brand
  const topDoctypesByBrand = await prisma.$queryRaw<{ brand: string; doctype: string; task_count: bigint; template_count: number; page_count: number; row_num: bigint }[]>(Prisma.sql`
    WITH ranked AS (
      SELECT
        a.display_name AS brand,
        dt.display_name AS doctype,
        COUNT(t.id) AS task_count,
        COALESCE(SUM(t.qty_submit), 0)::float AS template_count,
        COALESCE(MAX(t.pages), 0)::float AS page_count,
        row_number() OVER (PARTITION BY a.display_name ORDER BY COUNT(t.id) DESC) as row_num
      FROM tasks t
      LEFT JOIN task_accounts ta ON ta.task_id = t.id
      LEFT JOIN accounts a ON a.id = ta.account_id
      JOIN doctypes dt ON dt.id = t.doctype_id
      WHERE 1=1
      ${periodsFilter}
      GROUP BY 1, 2
    )
    SELECT COALESCE(brand, ${NO_BRAND_LABEL}) AS brand, doctype, task_count, template_count, page_count, row_num
    FROM ranked
    ORDER BY brand, task_count DESC
  `);


  // -------------------------------------------------------------
  // Widget 8: Task Pipeline
  // -------------------------------------------------------------
  const taskPipeline = await prisma.$queryRaw<{ stage: string; task_count: bigint; template_count: number; page_count: number }[]>(Prisma.sql`
    SELECT 
      ds.display_name AS stage, 
      COUNT(t.id) AS task_count,
      COALESCE(SUM(t.qty_submit), 0)::float AS template_count,
      COALESCE(SUM(t.qty_submit * t.pages), 0)::float AS page_count
    FROM tasks t
    JOIN design_statuses ds ON ds.id = t.design_status_id
    WHERE 1=1
    ${periodsFilter}
    ${accFilter}
    GROUP BY ds.display_name, ds.status_group
    ORDER BY MIN(ds.status_group)
  `);


  const inQueueTasks = await prisma.$queryRaw<[{ in_queue: bigint }]>(Prisma.sql`
    SELECT COUNT(*) AS in_queue
    FROM tasks t
    JOIN design_statuses ds ON ds.id = t.design_status_id
    WHERE NOT ds.counts_as_approved
      AND NOT ds.counts_as_profile_only
      ${periodsFilter}
      ${accFilter}
  `);


  const inQueueTemplates = await prisma.$queryRaw<[{ in_queue_templates: number | null }]>(Prisma.sql`
    SELECT COALESCE(SUM(t.qty_submit), 0) AS in_queue_templates
    FROM tasks t
    JOIN design_statuses ds ON ds.id = t.design_status_id
    WHERE NOT ds.counts_as_approved
      AND NOT ds.counts_as_profile_only
      ${periodsFilter}
      ${accFilter}
  `);


  const totalInQueueTasks = Number(inQueueTasks[0]?.in_queue || 0);
  const totalInQueueTemplates = Number(inQueueTemplates[0]?.in_queue_templates || 0);

  // -------------------------------------------------------------
  // Widget 9: Kategori Doctype
  // -------------------------------------------------------------
  const kategoriDoctype = await prisma.$queryRaw<{ doctype: string; task_count: bigint; template_count: number; page_count: number }[]>(Prisma.sql`
    SELECT 
      d.display_name AS doctype, 
      COUNT(t.id) AS task_count,
      COALESCE(SUM(t.qty_submit), 0)::float AS template_count,
      COALESCE(SUM(t.qty_submit * t.pages), 0)::float AS page_count
    FROM tasks t
    JOIN doctypes d ON d.id = t.doctype_id
    WHERE 1=1
    ${periodsFilter}
    ${accFilter}
    GROUP BY d.display_name
    ORDER BY task_count DESC
  `);


  // -------------------------------------------------------------
  // Widget 10: Lisensi Template
  // -------------------------------------------------------------
  const lisensiTemplate = await prisma.$queryRaw<{ license: string; templates: number }[]>(Prisma.sql`
    SELECT COALESCE(t.license, 'Free') AS license, COALESCE(SUM(t.qty_submit), 0)::float AS templates
    FROM tasks t
    WHERE 1=1
    ${periodsFilter}
    ${accFilter}
    GROUP BY t.license
  `);


  // -------------------------------------------------------------
  // Widget 11: Bahasa Template
  // -------------------------------------------------------------
  const bahasaTemplate = await prisma.$queryRaw<{ language: string; templates: number }[]>(Prisma.sql`
    SELECT unnest(t.languages) AS language, COALESCE(SUM(t.qty_submit), 0)::float AS templates
    FROM tasks t
    WHERE 1=1
    ${periodsFilter}
    ${accFilter}
    GROUP BY 1
  `);


  // -------------------------------------------------------------
  // Widget 12: Aproved-Profile Only (table)
  // -------------------------------------------------------------
  const approvedProfileOnlyTable = await prisma.$queryRaw<{ doctype: string; license: string; language: string; account: string; qty: number }[]>(Prisma.sql`
    SELECT
      d.display_name AS doctype,
      t.license,
      unnest(t.languages) AS language,
      string_agg(DISTINCT a.display_name, ', ') AS account,
      SUM(t.qty_submit)::float AS qty
    FROM tasks t
    JOIN doctypes d ON d.id = t.doctype_id
    JOIN design_statuses ds ON ds.id = t.design_status_id
    LEFT JOIN task_accounts ta ON ta.task_id = t.id
    LEFT JOIN accounts a ON a.id = ta.account_id
    WHERE ds.counts_as_profile_only
      ${periodsFilter}
      ${accFilter}
    GROUP BY d.display_name, t.license, t.languages
    ORDER BY qty DESC
  `);


  const workloadPerDesigner = await prisma.$queryRaw<{ designer: string; task_count: bigint; template_count: number; page_count: number }[]>(Prisma.sql`
    SELECT
      ds.display_name AS designer,
      COUNT(t.id) AS task_count,
      COALESCE(SUM(t.qty_submit), 0)::float AS template_count,
      COALESCE(SUM(t.qty_submit * t.pages), 0)::float AS page_count
    FROM tasks t
    JOIN designers ds ON ds.id = t.designer_id
    WHERE 1=1
    ${periodsFilter}
    ${accFilter}
    GROUP BY ds.display_name
    ORDER BY task_count DESC
  `);


  // -------------------------------------------------------------
  // Widget 14: Designer Leaderboard (Dynamic Columns & Aggregation)
  // -------------------------------------------------------------
  // Get all tasks for the current selection grouped by designer and doctype
  const designerDoctypeCounts = await prisma.$queryRaw<{
    designer_id: string;
    designer: string;
    doctype: string;
    total_tasks: bigint;
    approved_tasks: bigint;
  }[]>(Prisma.sql`
    SELECT
      des.id::text AS designer_id,
      des.display_name AS designer,
      dt.display_name AS doctype,
      COUNT(t.id) AS total_tasks,
      COUNT(t.id) FILTER (WHERE ds.counts_as_approved) AS approved_tasks
    FROM tasks t
    JOIN designers des ON des.id = t.designer_id
    JOIN doctypes dt ON dt.id = t.doctype_id
    JOIN design_statuses ds ON ds.id = t.design_status_id
    WHERE 1=1
    ${periodsFilter}
    ${accFilter}
    GROUP BY des.id, des.display_name, dt.display_name
  `);


  // Determine top 5 doctypes overall in the current selection
  const doctypeTotals: { [key: string]: number } = {};
  for (const row of designerDoctypeCounts) {
    doctypeTotals[row.doctype] = (doctypeTotals[row.doctype] || 0) + Number(row.total_tasks);
  }
  const sortedDoctypes = Object.keys(doctypeTotals).sort(
    (a, b) => doctypeTotals[b] - doctypeTotals[a]
  );
  const top5 = sortedDoctypes.slice(0, 5);
  const col1 = top5[0] || 'Specialist 1';
  const col2 = top5[1] || 'Specialist 2';
  const col3 = top5[2] || 'Specialist 3';
  const col4 = top5[3] || 'Specialist 4';
  const col5 = top5[4] || 'Specialist 5';
  const leaderboardCols = [col1, col2, col3, col4, col5];

  // Initialize data mapping for all active designers
  const allDesigners = await prisma.designer.findMany();
  const designersMap: { [key: string]: any } = {};
  for (const d of allDesigners) {
    designersMap[d.id] = {
      designer: d.displayName,
      taskTotal: 0,
      approvedTotal: 0,
      col1Count: 0,
      col2Count: 0,
      col3Count: 0,
      col4Count: 0,
      col5Count: 0,
      otherCount: 0,
      otherBreakdown: {} as { [key: string]: number }
    };
  }

  // Populate map with task counts
  for (const row of designerDoctypeCounts) {
    const dId = row.designer_id;
    if (!designersMap[dId]) {
      designersMap[dId] = {
        designer: row.designer,
        taskTotal: 0,
        approvedTotal: 0,
        col1Count: 0,
        col2Count: 0,
        col3Count: 0,
        col4Count: 0,
        col5Count: 0,
        otherCount: 0,
        otherBreakdown: {} as { [key: string]: number }
      };
    }

    const des = designersMap[dId];
    const total = Number(row.total_tasks);
    const approved = Number(row.approved_tasks);

    des.taskTotal += total;
    des.approvedTotal += approved;

    if (row.doctype === col1) {
      des.col1Count += total;
    } else if (row.doctype === col2) {
      des.col2Count += total;
    } else if (row.doctype === col3) {
      des.col3Count += total;
    } else if (row.doctype === col4) {
      des.col4Count += total;
    } else if (row.doctype === col5) {
      des.col5Count += total;
    } else {
      des.otherCount += total;
      des.otherBreakdown[row.doctype] = (des.otherBreakdown[row.doctype] || 0) + total;
    }
  }

  const leaderboard = Object.values(designersMap).map((des) => {
    const approvalPct = des.taskTotal > 0 ? Math.round((des.approvedTotal / des.taskTotal) * 100) : 0;
    const otherTooltip = Object.keys(des.otherBreakdown).length > 0
      ? (Object.entries(des.otherBreakdown) as [string, number][])
          .sort((a, b) => b[1] - a[1])
          .map(([name, qty]) => `${name} (${qty})`)
          .join(', ')
      : 'Tidak ada doctype lain';

    return {
      designer: des.designer,
      taskTotal: des.taskTotal,
      approvalPct,
      col1Count: des.col1Count,
      col2Count: des.col2Count,
      col3Count: des.col3Count,
      col4Count: des.col4Count,
      col5Count: des.col5Count,
      otherCount: des.otherCount,
      otherTooltip
    };
  });

  // Sort by task total descending
  leaderboard.sort((a, b) => b.taskTotal - a.taskTotal);

  // Retrieve top performer
  const topPerformer = leaderboard[0]?.taskTotal > 0 ? leaderboard[0].designer : null;

  // Process data formatting
  return {
    periods: selectedKeys,
    brandName: filters.brandName || 'Semua Brand',
    kpi: {
      totalTasks,
      tasksChangePct,
      totalTemplates,
      templatesChangePct,
      totalPages,
      pagesChangePct,
      approvalRate,
      approvalChangePct,
      profileOnlyRate,
      profileOnlyChangePct,
      totalDoctypes,
    },
    widgets: {
      trenVolume: formatTrenVolume(trenVolume, topDoctypesByMonthBrand),
      distribusiTemplate: formatDistribusi(distribusiTemplate, topDoctypesByBrand),
      taskPipeline: taskPipeline.map((tp) => ({
        stage: tp.stage,
        taskCount: Number(tp.task_count),
        templateCount: Number(tp.template_count),
        pageCount: Number(tp.page_count),
      })),
      inQueue: {
        tasks: totalInQueueTasks,
        templates: totalInQueueTemplates,
      },
      kategoriDoctype: kategoriDoctype.map((kd) => ({
        doctype: kd.doctype,
        taskCount: Number(kd.task_count),
        templateCount: Number(kd.template_count),
        pageCount: Number(kd.page_count),
      })),
      lisensiTemplate,
      bahasaTemplate,
      approvedProfileOnlyTable,
      workloadPerDesigner: workloadPerDesigner.map((wp) => ({
        designer: wp.designer,
        taskCount: Number(wp.task_count),
        templateCount: Number(wp.template_count),
        pageCount: Number(wp.page_count),
      })),
      leaderboard,
      leaderboardCols,
      topPerformer,
    },
  };
}

// Helper to structure monthly data for stacked chart
function formatTrenVolume(trenVolume: any[], topDoctypes: any[]) {
  const monthsMap: { [key: string]: any } = {};

  for (const item of trenVolume) {
    const taskMonth = item.month; // e.g. "Juni-2026"
    const key = parseTaskMonthToKey(taskMonth) || taskMonth;
    const parts = key.split('-');
    let mLabel = taskMonth;
    if (parts.length === 2) {
      const mIdx = parseInt(parts[1], 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        mLabel = `${INDONESIAN_SHORT_MONTHS[mIdx]} - ${parts[0]}`;
      }
    }

    if (!monthsMap[key]) {
      monthsMap[key] = {
        key,
        monthLabel: mLabel,
      };
    }
    monthsMap[key][item.brand] = Number(item.task_count);
    monthsMap[key][`${item.brand}_templates`] = Number(item.template_count);
    monthsMap[key][`${item.brand}_pages`] = Number(item.page_count);
  }

  const results = Object.values(monthsMap).sort((a, b) => a.key.localeCompare(b.key));
  
  // Attach top doctypes
  for (const res of results) {
    const matchingDoctypes = topDoctypes.filter(
      (td) => parseTaskMonthToKey(td.task_month) === res.key
    );

    res.tooltips = {};
    for (const td of matchingDoctypes) {
      if (!res.tooltips[td.brand]) res.tooltips[td.brand] = [];
      res.tooltips[td.brand].push(td.doctype);
    }
  }

  return results;
}

function formatDistribusi(distribusi: any[], topDoctypes: any[]) {
  return distribusi.map((d) => {
    const tooltipDoctypes = topDoctypes
      .filter((td) => td.brand === d.brand)
      .map((td) => `${td.doctype}::${td.task_count}::${td.template_count}::${td.page_count}`);

    return {
      name: d.brand,
      value: d.templates,
      tooltip: tooltipDoctypes.length > 0 ? tooltipDoctypes.join('||') : '',
    };
  });
}

export async function getDoctypes() {
  return await prisma.doctype.findMany({
    include: { platform: { select: { slug: true, name: true } } },
    orderBy: [
      { updatedAt: 'desc' },
      { pages: 'desc' },
      { sortOrder: 'asc' },
    ]
  });
}

export async function getContractRateSetting() {
  const config = await prisma.notionConfig.findFirst({ select: { contractRate: true } });
  return config?.contractRate ?? 15000;
}

/**
 * Tarif dasar per platform. Platform tanpa `baseRate` = belum berkontrak: task satuan di platform itu
 * "belum ada harga" (payout 0), TIDAK jatuh ke tarif global. Bila `contractStartDate` diisi, hanya payroll
 * month pada/setelah bulan mulai yang berharga.
 */
export async function getPlatformRates() {
  const [fallback, platforms] = await Promise.all([
    getContractRateSetting(),
    prisma.platform.findMany({ select: { id: true, name: true, baseRate: true, contractStartDate: true }, orderBy: { createdAt: 'asc' } }),
  ]);
  const byId = new Map(platforms.map((p) => [p.id, p]));
  const startKey = (d?: Date | null) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : null);
  /** Harga satu task: { rate, priced }. `payrollMonth` null (antrian) dinilai tanpa batas tanggal mulai. */
  const priceFor = (doctype?: { platformId?: string | null } | null, payrollMonth?: string | null) => {
    const platform = doctype?.platformId ? byId.get(doctype.platformId) : undefined;
    if (!platform || platform.baseRate == null) return { rate: 0, priced: false };
    const start = startKey(platform.contractStartDate);
    const key = payrollMonth ? parseTaskMonthToKey(payrollMonth) : null;
    if (start && key && key < start) return { rate: 0, priced: false };
    return { rate: platform.baseRate, priced: true };
  };
  const contracted = platforms.filter((p) => p.baseRate != null);
  return {
    fallback,
    priceFor,
    /** Tarif efektif untuk tampilan (0 bila platform belum berkontrak). */
    rateFor: (doctype?: { platformId?: string | null } | null) => priceFor(doctype).rate,
    /** Ringkasan untuk header, hanya platform berkontrak, mis. "Canva 15.000". */
    label: contracted.length ? contracted.map((p) => `${p.name} ${(p.baseRate as number).toLocaleString('id-ID')}`).join(' · ') : 'Belum ada kontrak platform',
  };
}

/**
 * Order bundle untuk satu periode. Order dihitung "Completed" (masuk payout) bila semua task komponennya
 * berstatus yang dihitung approved; harga paket dibayarkan sekali per order (bukan per task).
 */
export async function getBundleOrdersForPeriod(period: string) {
  const orders = await prisma.bundleOrder.findMany({
    where: { OR: [{ period }, { payoutMonth: period }] },
    orderBy: { createdAt: 'desc' },
    include: bundleOrderInclude,
  });
  const rows = orders.map((o) => mapBundleOrderRow(o, period));
  const payoutByDesigner = new Map<string, number>();
  let payoutTotal = 0;
  for (const r of rows) {
    if (!r.inPayout || !r.completed || !r.designerId || r.resigned) continue;
    payoutByDesigner.set(r.designerId, (payoutByDesigner.get(r.designerId) ?? 0) + r.price);
    payoutTotal += r.price;
  }
  return { rows, payoutByDesigner, payoutTotal };
}

/** Order bundle yang semua task-nya approved tapi belum punya Payout Month (antrian tab Closing). */
export async function getBundleClosingQueue() {
  const orders = await prisma.bundleOrder.findMany({
    where: { payoutMonth: null },
    orderBy: { createdAt: 'desc' },
    include: bundleOrderInclude,
  });
  return orders.map((o) => mapBundleOrderRow(o, '')).filter((r) => r.completed);
}

const bundleContractInclude = {
  select: {
    id: true,
    price: true,
    contractStartDate: true,
    contractEndDate: true,
    notes: true,
    trialOrderId: true,
    trialOrder: { select: { period: true } },
    orders: { select: { period: true } },
  },
} as const;

type BundleContractPayload = Prisma.BundleContractGetPayload<typeof bundleContractInclude>;

/** Ringkasan kontrak bundle untuk client: periode bulan, yang sudah dipakai order, dan periode berikutnya. */
function mapBundleContract(c: BundleContractPayload) {
  const periods = taskMonthsInRange(c.contractStartDate, c.contractEndDate);
  const usedKeys = new Set(c.orders.map((o) => parseTaskMonthToKey(o.period)).filter(Boolean));
  const usedPeriods = periods.filter((p) => usedKeys.has(parseTaskMonthToKey(p)));
  const lastUsedIndex = periods.reduce((last, p, i) => (usedKeys.has(parseTaskMonthToKey(p)) ? i : last), -1);
  // Bulan setelah order kontrak terakhir; belum ada order = bulan pertama kontrak
  const nextPeriod = periods.slice(lastUsedIndex + 1).find((p) => !usedKeys.has(parseTaskMonthToKey(p))) ?? null;
  return {
    id: c.id,
    price: Number(c.price),
    start: c.contractStartDate.toISOString().slice(0, 10),
    end: c.contractEndDate.toISOString().slice(0, 10),
    notes: c.notes,
    trialOrderId: c.trialOrderId,
    trialPeriod: c.trialOrder?.period ?? null,
    periods,
    usedPeriods,
    nextPeriod,
  };
}

export type BundleContractSummary = ReturnType<typeof mapBundleContract>;

const bundleOrderInclude = {
  bundle: { select: { name: true } },
  contract: bundleContractInclude,
  contractFromTrial: bundleContractInclude,
  designer: { select: { id: true, displayName: true, status: true, isAgency: true } },
  tasks: { select: { id: true, name: true, designStatus: { select: { countsAsApproved: true } }, productionUnit: { select: { name: true } } } },
} as const;

function mapBundleOrderRow(o: Prisma.BundleOrderGetPayload<{ include: typeof bundleOrderInclude }>, period: string) {
  const approved = o.tasks.filter((t) => t.designStatus?.countsAsApproved).length;
  const completed = o.tasks.length > 0 && approved === o.tasks.length;
  const contract = o.contract ? mapBundleContract(o.contract) : null;
  return {
    id: o.id,
    bundleId: o.bundleId,
    bundleName: o.bundle.name,
    /** Kontrak tempat order ini menjadi satu periode (order Kontrak). */
    contract,
    /** Kontrak yang lahir dari order Trial ini. */
    trialContract: o.contractFromTrial ? mapBundleContract(o.contractFromTrial) : null,
    /** Urutan periode order ini di kontrak, mis. 2 dari 12. */
    contractPeriodIndex: contract && o.period ? contract.periods.findIndex((p) => parseTaskMonthToKey(p) === parseTaskMonthToKey(o.period)) + 1 : 0,
    designerId: o.designerId,
    designerName: o.designer?.displayName ?? '-',
    isAgency: o.designer?.isAgency ?? false,
    resigned: o.designer?.status === 'Resign',
    period: o.period,
    payoutMonth: o.payoutMonth,
    inPayout: !!period && o.payoutMonth === period,
    orderType: (o.orderType === 'Kontrak' ? 'Kontrak' : 'Trial') as 'Trial' | 'Kontrak',
    price: Number(o.price),
    paymentType: (o.paymentType === 'DP' ? 'DP' : 'Full') as 'DP' | 'Full',
    dpAmount: Number(o.dpAmount),
    dpPaid: !!o.dpPaidAt,
    paid: !!o.paidAt,
    dpPaidAt: o.dpPaidAt ? o.dpPaidAt.toISOString() : null,
    paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    totalTasks: o.tasks.length,
    approvedTasks: approved,
    completed,
    tasks: o.tasks.map((t) => ({ id: t.id, name: t.name ?? '', board: t.productionUnit.name, approved: !!t.designStatus?.countsAsApproved })),
  };
}

export interface ProductionMonthTotals { tasks: number; templates: number; pages: number; payout: number }

/** Total payout satuan per production untuk satu payroll month (task bundle dikecualikan, harga memakai kontrak platform). */
export async function getProductionTotalsForMonth(month: string, platformRates: Awaited<ReturnType<typeof getPlatformRates>>) {
  const tasks = await prisma.task.findMany({
    where: { payrollMonth: month, bundleOrderId: null, designStatus: { countsAsApproved: true } },
    select: { productionUnitId: true, qtySubmit: true, pages: true, payrollMonth: true, doctype: { select: { platformId: true, poolRate: true } }, designer: { select: { status: true } } },
  });
  const totals = new Map<string, ProductionMonthTotals>();
  for (const t of tasks) {
    const qty = Number(t.qtySubmit || 0);
    const pages = Number(t.pages || 0);
    const price = platformRates.priceFor(t.doctype, t.payrollMonth);
    const payment = t.designer?.status === 'Resign' || !price.priced ? 0 : qty * pages * Number(t.doctype?.poolRate || 0) * price.rate;
    const bucket = totals.get(t.productionUnitId) ?? { tasks: 0, templates: 0, pages: 0, payout: 0 };
    bucket.tasks += 1;
    bucket.templates += qty;
    bucket.pages += qty * pages;
    bucket.payout += payment;
    totals.set(t.productionUnitId, bucket);
  }
  return totals;
}
