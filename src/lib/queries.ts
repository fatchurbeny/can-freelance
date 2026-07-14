import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

export interface DashboardFilters {
  brandName?: string | null;
  selectedPeriod?: string | null; // format: "YYYY-MM,YYYY-MM,..."
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
  const rawPeriods = await prisma.$queryRaw<{ task_month: string }[]>`
    SELECT DISTINCT task_month
    FROM tasks
    WHERE task_month IS NOT NULL AND task_month != ''
  `;

  const formatted = rawPeriods.map((p) => {
    const parts = p.task_month.split('-');
    if (parts.length === 2) {
      const [mName, yStr] = parts;
      const mIdx = indNamesInv[mName] !== undefined ? indNamesInv[mName] : 0;
      const mm = (mIdx + 1).toString().padStart(2, '0');
      return {
        key: `${yStr}-${mm}`,
        raw: p.task_month
      };
    }
    return null;
  }).filter(Boolean) as { key: string; raw: string }[];

  // Sort descending by YYYY-MM key
  formatted.sort((a, b) => b.key.localeCompare(a.key));

  return formatted.map((f) => f.key);
}

export async function getDashboardData(filters: DashboardFilters) {
  // 1. Resolve selected periods array
  let periods: string[] = [];
  if (filters.selectedPeriod) {
    periods = filters.selectedPeriod.split(',').filter(Boolean);
  }
  if (periods.length === 0) {
    const available = await getAvailablePeriods();
    periods = [available[0] || new Date().toISOString().substring(0, 7)];
  }

  // 2. Resolve account/brand ID
  let accountId: string | null = null;
  let accountName: string | null = null;
  if (filters.brandName && filters.brandName !== 'Semua Brand') {
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
  const duration = periods.length;
  const selectedIndices = periods.map((p) => {
    const [y, m] = p.split('-');
    return parseInt(y) * 12 + (parseInt(m) - 1);
  });
  
  selectedIndices.sort((a, b) => a - b);
  
  const priorIndices = selectedIndices.map((idx) => idx - duration);
  const priorPeriods = priorIndices.map((idx) => {
    const y = Math.floor(idx / 12);
    const m = (idx % 12) + 1;
    return `${y}-${m.toString().padStart(2, '0')}`;
  });

  // Convert "YYYY-MM" periods to Indonesian "Month-Year" strings for DB filtering
  const indPeriods = periods.map((p) => {
    const [y, m] = p.split('-');
    const mName = indNames[m] || m;
    return `${mName}-${y}`;
  });

  const priorIndPeriods = priorPeriods.map((p) => {
    const [y, m] = p.split('-');
    const mName = indNames[m] || m;
    return `${mName}-${y}`;
  });

  const accId = accountId;

  // Helpers for SQL conditions
  const accFilter = accId
    ? Prisma.sql`AND EXISTS (SELECT 1 FROM task_accounts ta WHERE ta.task_id = t.id AND ta.account_id = ${accId}::uuid)`
    : Prisma.empty;

  const periodsFilter = Prisma.sql`AND t.task_month IN (${Prisma.join(indPeriods)})`;
  const priorPeriodsFilter = Prisma.sql`AND t.task_month IN (${Prisma.join(priorIndPeriods)})`;

  // -------------------------------------------------------------
  // KPI 1: Total Task
  // -------------------------------------------------------------
  const kpiCurrentTasks = await prisma.$queryRaw<[{ total_task: bigint }]>`
    SELECT COUNT(DISTINCT t.id) AS total_task
    FROM tasks t
    WHERE 1=1
    ${periodsFilter}
    ${accFilter}
  `;
  const kpiPriorTasks = await prisma.$queryRaw<[{ total_task: bigint }]>`
    SELECT COUNT(DISTINCT t.id) AS total_task
    FROM tasks t
    WHERE 1=1
    ${priorPeriodsFilter}
    ${accFilter}
  `;

  const totalTasks = Number(kpiCurrentTasks[0]?.total_task || 0);
  const priorTasks = Number(kpiPriorTasks[0]?.total_task || 0);
  const tasksChangePct = priorTasks > 0 ? Math.round(((totalTasks - priorTasks) / priorTasks) * 100) : 0;

  // -------------------------------------------------------------
  // KPI 2: Total Template
  // -------------------------------------------------------------
  const kpiCurrentTemplates = await prisma.$queryRaw<[{ total_template: number | null }]>`
    SELECT COALESCE(SUM(t.qty_submit), 0) AS total_template
    FROM tasks t
    WHERE 1=1
    ${periodsFilter}
    ${accFilter}
  `;
  const kpiPriorTemplates = await prisma.$queryRaw<[{ total_template: number | null }]>`
    SELECT COALESCE(SUM(t.qty_submit), 0) AS total_template
    FROM tasks t
    WHERE 1=1
    ${priorPeriodsFilter}
    ${accFilter}
  `;

  const totalTemplates = Number(kpiCurrentTemplates[0]?.total_template || 0);
  const priorTemplates = Number(kpiPriorTemplates[0]?.total_template || 0);
  const templatesChangePct = priorTemplates > 0 ? Math.round(((totalTemplates - priorTemplates) / priorTemplates) * 100) : 0;

  // -------------------------------------------------------------
  // KPI 2.5: Total Pages
  // -------------------------------------------------------------
  const kpiCurrentPages = await prisma.$queryRaw<[{ total_pages: number | null }]>`
    SELECT COALESCE(SUM(t.qty_submit * t.pages), 0) AS total_pages
    FROM tasks t
    WHERE 1=1
    ${periodsFilter}
    ${accFilter}
  `;
  const kpiPriorPages = await prisma.$queryRaw<[{ total_pages: number | null }]>`
    SELECT COALESCE(SUM(t.qty_submit * t.pages), 0) AS total_pages
    FROM tasks t
    WHERE 1=1
    ${priorPeriodsFilter}
    ${accFilter}
  `;

  const totalPages = Number(kpiCurrentPages[0]?.total_pages || 0);
  const priorPages = Number(kpiPriorPages[0]?.total_pages || 0);
  const pagesChangePct = priorPages > 0 ? Math.round(((totalPages - priorPages) / priorPages) * 100) : 0;

  // -------------------------------------------------------------
  // KPI 3: Approval Rate
  // -------------------------------------------------------------
  const kpiCurrentApproval = await prisma.$queryRaw<[{ approved_qty: number | null; submitted_qty: number | null }]>`
    SELECT
      COALESCE(SUM(t.qty_submit) FILTER (WHERE ds.counts_as_approved), 0) AS approved_qty,
      COALESCE(SUM(t.qty_submit) FILTER (WHERE ds.counts_as_submitted), 0) AS submitted_qty
    FROM tasks t
    JOIN design_statuses ds ON ds.id = t.design_status_id
    WHERE 1=1
    ${periodsFilter}
    ${accFilter}
  `;
  const kpiPriorApproval = await prisma.$queryRaw<[{ approved_qty: number | null; submitted_qty: number | null }]>`
    SELECT
      COALESCE(SUM(t.qty_submit) FILTER (WHERE ds.counts_as_approved), 0) AS approved_qty,
      COALESCE(SUM(t.qty_submit) FILTER (WHERE ds.counts_as_submitted), 0) AS submitted_qty
    FROM tasks t
    JOIN design_statuses ds ON ds.id = t.design_status_id
    WHERE 1=1
    ${priorPeriodsFilter}
    ${accFilter}
  `;

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
  const kpiCurrentProfile = await prisma.$queryRaw<[{ profile_qty: number | null; submitted_qty: number | null }]>`
    SELECT
      COALESCE(SUM(t.qty_submit) FILTER (WHERE ds.counts_as_profile_only), 0) AS profile_qty,
      COALESCE(SUM(t.qty_submit) FILTER (WHERE ds.counts_as_submitted), 0) AS submitted_qty
    FROM tasks t
    JOIN design_statuses ds ON ds.id = t.design_status_id
    WHERE 1=1
    ${periodsFilter}
    ${accFilter}
  `;
  const kpiPriorProfile = await prisma.$queryRaw<[{ profile_qty: number | null; submitted_qty: number | null }]>`
    SELECT
      COALESCE(SUM(t.qty_submit) FILTER (WHERE ds.counts_as_profile_only), 0) AS profile_qty,
      COALESCE(SUM(t.qty_submit) FILTER (WHERE ds.counts_as_submitted), 0) AS submitted_qty
    FROM tasks t
    JOIN design_statuses ds ON ds.id = t.design_status_id
    WHERE 1=1
    ${priorPeriodsFilter}
    ${accFilter}
  `;

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
  const kpiDoctypes = await prisma.$queryRaw<[{ total_doctype: bigint }]>`
    SELECT COUNT(DISTINCT t.doctype_id) AS total_doctype
    FROM tasks t
    WHERE 1=1
    ${periodsFilter}
    ${accFilter}
  `;
  const totalDoctypes = Number(kpiDoctypes[0]?.total_doctype || 0);

  // -------------------------------------------------------------
  // Widget 6: Tren Volume Task
  // -------------------------------------------------------------
  const trenVolume = await prisma.$queryRaw<{ month: string; brand: string; task_count: bigint; template_count: number; page_count: number }[]>`
    SELECT
      t.task_month AS month,
      a.display_name AS brand,
      COUNT(DISTINCT t.id) AS task_count,
      COALESCE(SUM(t.qty_submit), 0)::float AS template_count,
      COALESCE(SUM(t.qty_submit * t.pages), 0)::float AS page_count
    FROM tasks t
    JOIN task_accounts ta ON ta.task_id = t.id
    JOIN accounts a ON a.id = ta.account_id
    WHERE 1=1
    ${periodsFilter}
    ${accId ? Prisma.sql`AND ta.account_id = ${accId}::uuid` : Prisma.empty}
    GROUP BY 1, 2
    ORDER BY 1, 2
  `;

  // Hover Tooltips for Tren Volume Task: all doctypes by brand and month
  const topDoctypesByMonthBrand = await prisma.$queryRaw<{ task_month: string; brand: string; doctype: string; task_count: bigint; row_num: bigint }[]>`
    WITH ranked AS (
      SELECT
        t.task_month,
        a.display_name AS brand,
        dt.display_name AS doctype,
        COUNT(*) AS task_count,
        row_number() OVER (PARTITION BY t.task_month, a.display_name ORDER BY COUNT(*) DESC) as row_num
      FROM tasks t
      JOIN task_accounts ta ON ta.task_id = t.id
      JOIN accounts a ON a.id = ta.account_id
      JOIN doctypes dt ON dt.id = t.doctype_id
      WHERE 1=1
      ${periodsFilter}
      ${accId ? Prisma.sql`AND ta.account_id = ${accId}::uuid` : Prisma.empty}
      GROUP BY 1, 2, 3
    )
    SELECT task_month, brand, doctype, task_count, row_num
    FROM ranked
    ORDER BY task_month, brand, task_count DESC
  `;

  // -------------------------------------------------------------
  // Widget 7: Distribusi Template
  // -------------------------------------------------------------
  const distribusiTemplate = await prisma.$queryRaw<{ brand: string; templates: number }[]>`
    SELECT a.display_name AS brand, COALESCE(SUM(t.qty_submit), 0)::float AS templates
    FROM tasks t
    JOIN task_accounts ta ON ta.task_id = t.id
    JOIN accounts a ON a.id = ta.account_id
    WHERE 1=1
    ${periodsFilter}
    GROUP BY a.display_name
    ORDER BY templates DESC
  `;

  // Hover tooltips for Distribusi Template: all doctypes per brand
  const topDoctypesByBrand = await prisma.$queryRaw<{ brand: string; doctype: string; task_count: bigint; template_count: number; page_count: number; row_num: bigint }[]>`
    WITH ranked AS (
      SELECT
        a.display_name AS brand,
        dt.display_name AS doctype,
        COUNT(t.id) AS task_count,
        COALESCE(SUM(t.qty_submit), 0)::float AS template_count,
        COALESCE(MAX(t.pages), 0)::float AS page_count,
        row_number() OVER (PARTITION BY a.display_name ORDER BY COUNT(t.id) DESC) as row_num
      FROM tasks t
      JOIN task_accounts ta ON ta.task_id = t.id
      JOIN accounts a ON a.id = ta.account_id
      JOIN doctypes dt ON dt.id = t.doctype_id
      WHERE 1=1
      ${periodsFilter}
      GROUP BY 1, 2
    )
    SELECT brand, doctype, task_count, template_count, page_count, row_num
    FROM ranked
    ORDER BY brand, task_count DESC
  `;

  // -------------------------------------------------------------
  // Widget 8: Task Pipeline
  // -------------------------------------------------------------
  const taskPipeline = await prisma.$queryRaw<{ stage: string; task_count: bigint; template_count: number; page_count: number }[]>`
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
  `;

  const inQueueTasks = await prisma.$queryRaw<[{ in_queue: bigint }]>`
    SELECT COUNT(*) AS in_queue
    FROM tasks t
    JOIN design_statuses ds ON ds.id = t.design_status_id
    WHERE NOT ds.counts_as_approved
      AND NOT ds.counts_as_profile_only
      ${periodsFilter}
      ${accFilter}
  `;

  const inQueueTemplates = await prisma.$queryRaw<[{ in_queue_templates: number | null }]>`
    SELECT COALESCE(SUM(t.qty_submit), 0) AS in_queue_templates
    FROM tasks t
    JOIN design_statuses ds ON ds.id = t.design_status_id
    WHERE NOT ds.counts_as_approved
      AND NOT ds.counts_as_profile_only
      ${periodsFilter}
      ${accFilter}
  `;

  const totalInQueueTasks = Number(inQueueTasks[0]?.in_queue || 0);
  const totalInQueueTemplates = Number(inQueueTemplates[0]?.in_queue_templates || 0);

  // -------------------------------------------------------------
  // Widget 9: Kategori Doctype
  // -------------------------------------------------------------
  const kategoriDoctype = await prisma.$queryRaw<{ doctype: string; task_count: bigint; template_count: number; page_count: number }[]>`
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
  `;

  // -------------------------------------------------------------
  // Widget 10: Lisensi Template
  // -------------------------------------------------------------
  const lisensiTemplate = await prisma.$queryRaw<{ license: string; templates: number }[]>`
    SELECT COALESCE(t.license, 'Free') AS license, COALESCE(SUM(t.qty_submit), 0)::float AS templates
    FROM tasks t
    WHERE 1=1
    ${periodsFilter}
    ${accFilter}
    GROUP BY t.license
  `;

  // -------------------------------------------------------------
  // Widget 11: Bahasa Template
  // -------------------------------------------------------------
  const bahasaTemplate = await prisma.$queryRaw<{ language: string; templates: number }[]>`
    SELECT unnest(t.languages) AS language, COALESCE(SUM(t.qty_submit), 0)::float AS templates
    FROM tasks t
    WHERE 1=1
    ${periodsFilter}
    ${accFilter}
    GROUP BY 1
  `;

  // -------------------------------------------------------------
  // Widget 12: Aproved-Profile Only (table)
  // -------------------------------------------------------------
  const approvedProfileOnlyTable = await prisma.$queryRaw<{ doctype: string; license: string; language: string; account: string; qty: number }[]>`
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
  `;

  const workloadPerDesigner = await prisma.$queryRaw<{ designer: string; task_count: bigint; template_count: number; page_count: number }[]>`
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
  `;

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
  }[]>`
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
  `;

  // Determine top 3 doctypes overall in the current selection
  const doctypeTotals: { [key: string]: number } = {};
  for (const row of designerDoctypeCounts) {
    doctypeTotals[row.doctype] = (doctypeTotals[row.doctype] || 0) + Number(row.total_tasks);
  }
  const sortedDoctypes = Object.keys(doctypeTotals).sort(
    (a, b) => doctypeTotals[b] - doctypeTotals[a]
  );
  const top3 = sortedDoctypes.slice(0, 3);
  const col1 = top3[0] || 'Specialist 1';
  const col2 = top3[1] || 'Specialist 2';
  const col3 = top3[2] || 'Specialist 3';
  const leaderboardCols = [col1, col2, col3];

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
    periods,
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

  const indNamesShort: { [key: string]: string } = {
    'Januari': 'Jan', 'Februari': 'Feb', 'Maret': 'Mar', 'April': 'Apr',
    'Mei': 'Mei', 'Juni': 'Jun', 'Juli': 'Jul', 'Agustus': 'Agt',
    'September': 'Sep', 'Oktober': 'Okt', 'November': 'Nov', 'Desember': 'Des'
  };

  for (const item of trenVolume) {
    const taskMonth = item.month; // e.g. "Juni-2026"
    const [mName, yStr] = taskMonth.split('-');
    const mLabel = indNamesShort[mName] || mName;
    const mIdx = indNamesInv[mName] !== undefined ? indNamesInv[mName] : 0;
    const key = `${yStr}-${(mIdx + 1).toString().padStart(2, '0')}`;

    if (!monthsMap[key]) {
      monthsMap[key] = {
        key,
        monthLabel: `${mLabel} - ${yStr}`,
      };
    }
    monthsMap[key][item.brand] = Number(item.task_count);
    monthsMap[key][`${item.brand}_templates`] = Number(item.template_count);
    monthsMap[key][`${item.brand}_pages`] = Number(item.page_count);
  }

  const results = Object.values(monthsMap).sort((a, b) => a.key.localeCompare(b.key));
  
  // Attach top doctypes
  for (const res of results) {
    const [yStr, mStr] = res.key.split('-');
    const indMonthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const indMonth = indMonthNames[parseInt(mStr) - 1] || '';
    const targetTaskMonth = `${indMonth}-${yStr}`;

    const matchingDoctypes = topDoctypes.filter(
      (td) => td.task_month === targetTaskMonth
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
    orderBy: { pages: 'desc' }
  });
}
