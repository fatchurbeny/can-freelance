import fs from 'fs';
import path from 'path';

interface GraphNode {
  id: string;
  label: string;
  type: 'page' | 'component' | 'action' | 'model' | 'doc';
  group: string;
  filepath: string;
  details?: string;
}

interface GraphLink {
  source: string;
  target: string;
  relation: 'renders' | 'invokes' | 'queries' | 'enforces' | 'imports';
  confidence: 'EXTRACTED' | 'INFERRED';
}

interface GraphData {
  version: string;
  generatedAt: string;
  nodes: GraphNode[];
  links: GraphLink[];
}

async function generateGraphifyData() {
  const rootDir = process.cwd();
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  const addNode = (node: GraphNode) => {
    if (!nodes.some(n => n.id === node.id)) {
      nodes.push(node);
    }
  };

  const addLink = (link: GraphLink) => {
    if (!links.some(l => l.source === link.source && l.target === link.target && l.relation === link.relation)) {
      links.push(link);
    }
  };

  // 1. Pages (App Router Routes)
  const appDir = path.join(rootDir, 'src/app');
  if (fs.existsSync(appDir)) {
    const pages = [
      { id: 'page:/', label: 'Dashboard Page', filepath: 'src/app/page.tsx', route: '/' },
      { id: 'page:/production', label: 'Production Kanban', filepath: 'src/app/production/page.tsx', route: '/production' },
      { id: 'page:/billing-statement', label: 'Billing Statement', filepath: 'src/app/billing-statement/page.tsx', route: '/billing-statement' },
      { id: 'page:/knowledge-graph', label: 'Knowledge Graph Page', filepath: 'src/app/knowledge-graph/page.tsx', route: '/knowledge-graph' },
      { id: 'page:/rate-card', label: 'Rate Card Editor', filepath: 'src/app/rate-card/page.tsx', route: '/rate-card' },
      { id: 'page:/account-team', label: 'Account & Team', filepath: 'src/app/account-team/page.tsx', route: '/account-team' },
      { id: 'page:/notion-config', label: 'Notion Config', filepath: 'src/app/notion-config/page.tsx', route: '/notion-config' },
    ];

    pages.forEach(p => {
      addNode({
        id: p.id,
        label: p.label,
        type: 'page',
        group: 'App Router Pages',
        filepath: p.filepath,
        details: `Next.js 16 App Router Page (${p.route})`,
      });
    });
  }

  // 2. React Components
  const componentsDir = path.join(rootDir, 'src/components');
  if (fs.existsSync(componentsDir)) {
    const compFiles = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
    compFiles.forEach(file => {
      const compName = path.basename(file, path.extname(file));
      const compId = `component:${compName}`;
      addNode({
        id: compId,
        label: compName,
        type: 'component',
        group: 'React Components',
        filepath: `src/components/${file}`,
        details: `React UI Component in src/components/${file}`,
      });
    });
  }

  // 3. Actions & Server Logic
  const actions = [
    { id: 'action:approval-payroll', label: 'approval-payroll.ts', filepath: 'src/app/actions/approval-payroll.ts', details: 'Server Actions for Payroll calculations & status toggles' },
    { id: 'action:sync-notion', label: 'sync-notion.ts Engine', filepath: 'src/lib/sync-notion.ts', details: 'Notion API Full & Incremental sync engine' },
    { id: 'action:queries', label: 'queries.ts Aggregations', filepath: 'src/lib/queries.ts', details: 'Prisma aggregation queries for KPI & volume trends' },
  ];
  actions.forEach(a => {
    addNode({
      id: a.id,
      label: a.label,
      type: 'action',
      group: 'Server Actions & Lib',
      filepath: a.filepath,
      details: a.details,
    });
  });

  // 4. Prisma Database Models & Entities
  const prismaModels = [
    { id: 'model:Task', label: 'Task Model', filepath: 'prisma/schema.prisma', details: 'Notion Task card record (qtySubmit, pages, status)' },
    { id: 'model:Designer', label: 'Designer Model', filepath: 'prisma/schema.prisma', details: 'Designer profile & status (Active/Resign/Hold)' },
    { id: 'model:Doctype', label: 'Doctype Model', filepath: 'prisma/schema.prisma', details: 'Document template format & base page rate' },
    { id: 'model:Brand', label: 'Brand Model', filepath: 'prisma/schema.prisma', details: 'Client brand entity' },
    { id: 'model:DesignStatus', label: 'DesignStatus Model', filepath: 'prisma/schema.prisma', details: 'Kanban production status stage' },
    { id: 'model:ContractRate', label: 'ContractRate Model', filepath: 'prisma/schema.prisma', details: 'Custom rate overrides per designer & doctype' },
    { id: 'model:BillingStatement', label: 'BillingStatement Model', filepath: 'prisma/schema.prisma', details: 'Monthly designer payment statement' },
    { id: 'model:SyncLog', label: 'SyncLog Model', filepath: 'prisma/schema.prisma', details: 'Execution logs of Notion sync operations' },
  ];
  prismaModels.forEach(m => {
    addNode({
      id: m.id,
      label: m.label,
      type: 'model',
      group: 'Prisma DB Models',
      filepath: m.filepath,
      details: m.details,
    });
  });

  // 5. SaaS Business Rules Cluster
  const businessRules = [
    { id: 'rule:qty-pages', label: 'QTY Pages Calculation', filepath: 'docs/knowledge/business-rules.md', details: 'Formula: qty_submit * pages per task record' },
    { id: 'rule:designer-resign', label: 'Resign Designer Status', filepath: 'docs/knowledge/business-rules.md', details: 'Designer status === Resign forces calculated payroll payment to 0' },
    { id: 'rule:base-pages', label: 'Base Template Pages', filepath: 'docs/knowledge/business-rules.md', details: 'Formula: MAX(pages) on grouped doctype queries' },
    { id: 'rule:dynamic-period', label: 'Dynamic Period Labels', filepath: 'docs/knowledge/business-rules.md', details: 'Period strings must reflect active month filter' },
  ];
  businessRules.forEach(r => {
    addNode({
      id: r.id,
      label: r.label,
      type: 'doc',
      group: 'SaaS Business Rules',
      filepath: r.filepath,
      details: r.details,
    });
  });

  // 6. Notion Sync Engine Cluster
  const syncEngine = [
    { id: 'sync:full-mode', label: 'Full Sync Mode', filepath: 'src/lib/sync-notion.ts', details: 'Manual sync default: reconciles updated, new, and deleted pages' },
    { id: 'sync:cron-mode', label: 'Background Cron Sync', filepath: 'src/app/api/sync/cron/route.ts', details: 'Automated background polling using referenceStartTime logic' },
    { id: 'sync:rate-limiter', label: 'Notion API Limiter', filepath: 'src/lib/sync-notion.ts', details: 'Pacing & batching requests to prevent HTTP 429 rate limit' },
  ];
  syncEngine.forEach(s => {
    addNode({
      id: s.id,
      label: s.label,
      type: 'action',
      group: 'Notion Sync Engine',
      filepath: s.filepath,
      details: s.details,
    });
  });

  // 7. Gotchas & Layout Rules Cluster
  const gotchas = [
    { id: 'gotcha:directive-preservation', label: 'Directive Preservation', filepath: 'docs/knowledge/issues-and-fixes.md', details: 'Must preserve "use client" on RSC interactive files' },
    { id: 'gotcha:decimal-serialization', label: 'Decimal Serialization', filepath: 'docs/knowledge/issues-and-fixes.md', details: 'JSON.parse(JSON.stringify) for Prisma Decimal fields' },
    { id: 'gotcha:double-border-prevention', label: 'Double Border Prevention', filepath: 'docs/knowledge/issues-and-fixes.md', details: 'No redundant border-t/border-b on divide-y continuous card children' },
    { id: 'gotcha:nav-tab-proportional', label: 'Nav Tab Proportional Sizing', filepath: 'docs/knowledge/issues-and-fixes.md', details: 'Top navigation tabs prioritize label readability without truncation' },
    { id: 'gotcha:force-graph-isolation', label: 'Force Graph Hover Isolation', filepath: 'docs/knowledge/issues-and-fixes.md', details: 'Store hoveredNode in useRef to prevent physics simulation resets' },
  ];
  gotchas.forEach(g => {
    addNode({
      id: g.id,
      label: g.label,
      type: 'doc',
      group: 'Gotchas & Layout Rules',
      filepath: g.filepath,
      details: g.details,
    });
  });

  // 8. Session Handover Log Cluster
  const handoverLog = [
    { id: 'handover:decision-1', label: '50% Vertical Border Alignment', filepath: 'docs/knowledge/session-handover.md', details: 'Aligned Account & Team banner divider with 2-column tables' },
    { id: 'handover:decision-2', label: 'Symmetrical Table Style Billing', filepath: 'docs/knowledge/session-handover.md', details: 'Flat table header toolbar with full container height cells' },
    { id: 'handover:active-state', label: 'Active Session State', filepath: 'docs/knowledge/session-handover.md', details: 'Knowledge Graph fully synchronized across all 7 domains' },
  ];
  handoverLog.forEach(h => {
    addNode({
      id: h.id,
      label: h.label,
      type: 'doc',
      group: 'Session Handover & Log',
      filepath: h.filepath,
      details: h.details,
    });
  });

  // 9. AST Import Scanner (Extract Real Component & Page Import Links)
  const scanImports = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) return;

    const scanFile = (filePath: string) => {
      const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
      const content = fs.readFileSync(filePath, 'utf-8');

      let sourceId: string | null = null;
      if (relPath.startsWith('src/app/')) {
        let route = relPath.replace('src/app', '').replace('/page.tsx', '').replace('/page.ts', '');
        if (route === '') route = '/';
        sourceId = `page:${route}`;
        const pageLabel = route === '/' ? 'Dashboard Page' : `${route.split('/').pop()} Page`;
        addNode({
          id: sourceId,
          label: pageLabel,
          type: 'page',
          group: 'App Router Pages',
          filepath: relPath,
          details: `Next.js App Router Page (${route})`,
        });
      } else if (relPath.startsWith('src/components/')) {
        const compName = path.basename(filePath, path.extname(filePath));
        sourceId = `component:${compName}`;
      }

      if (!sourceId) return;

      // Extract import statements from @/components/... or relative ./
      const importMatches = content.matchAll(/import\s+.*?from\s+['"](?:@\/components\/|\.\/|\.\.\/components\/)([^'"]+)['"]/g);
      for (const match of importMatches) {
        const importedPath = match[1];
        const compName = path.basename(importedPath, path.extname(importedPath));
        if (compName && compName !== sourceId.replace('component:', '')) {
          const targetId = `component:${compName}`;
          addLink({
            source: sourceId,
            target: targetId,
            relation: 'renders',
            confidence: 'EXTRACTED',
          });
        }
      }
    };

    const walk = (dir: string) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          walk(full);
        } else if (item.isFile() && (item.name.endsWith('.tsx') || item.name.endsWith('.ts'))) {
          scanFile(full);
        }
      }
    };

    walk(dirPath);
  };

  scanImports(path.join(rootDir, 'src/app'));
  scanImports(path.join(rootDir, 'src/components'));

  // 10. Explicit & Inferred Relationships Across All Communities
  addLink({ source: 'component:ApprovalPayrollTable', target: 'action:approval-payroll', relation: 'invokes', confidence: 'EXTRACTED' });
  addLink({ source: 'page:/knowledge-graph', target: 'component:KnowledgeGraphViewer', relation: 'renders', confidence: 'EXTRACTED' });
  addLink({ source: 'component:KnowledgeGraphViewer', target: 'component:GraphifyVisualizer', relation: 'renders', confidence: 'EXTRACTED' });
  addLink({ source: 'component:SyncButton', target: 'action:sync-notion', relation: 'invokes', confidence: 'EXTRACTED' });
  
  // Model Links
  addLink({ source: 'action:sync-notion', target: 'model:Task', relation: 'queries', confidence: 'EXTRACTED' });
  addLink({ source: 'action:sync-notion', target: 'model:Designer', relation: 'queries', confidence: 'EXTRACTED' });
  addLink({ source: 'action:sync-notion', target: 'model:SyncLog', relation: 'queries', confidence: 'EXTRACTED' });
  addLink({ source: 'action:approval-payroll', target: 'model:Designer', relation: 'queries', confidence: 'EXTRACTED' });
  addLink({ source: 'action:approval-payroll', target: 'model:BillingStatement', relation: 'queries', confidence: 'EXTRACTED' });

  // Business Rules Links
  addLink({ source: 'rule:qty-pages', target: 'model:Task', relation: 'enforces', confidence: 'INFERRED' });
  addLink({ source: 'rule:designer-resign', target: 'action:approval-payroll', relation: 'enforces', confidence: 'INFERRED' });
  addLink({ source: 'rule:base-pages', target: 'model:Doctype', relation: 'enforces', confidence: 'INFERRED' });
  addLink({ source: 'rule:dynamic-period', target: 'component:MonthFilter', relation: 'enforces', confidence: 'INFERRED' });

  // Sync Engine Links
  addLink({ source: 'sync:full-mode', target: 'action:sync-notion', relation: 'invokes', confidence: 'EXTRACTED' });
  addLink({ source: 'sync:cron-mode', target: 'action:sync-notion', relation: 'invokes', confidence: 'EXTRACTED' });
  addLink({ source: 'sync:rate-limiter', target: 'action:sync-notion', relation: 'enforces', confidence: 'EXTRACTED' });

  // Gotchas Links
  addLink({ source: 'gotcha:double-border-prevention', target: 'page:/billing-statement', relation: 'enforces', confidence: 'INFERRED' });
  addLink({ source: 'gotcha:nav-tab-proportional', target: 'component:CloudflareTopBar', relation: 'enforces', confidence: 'INFERRED' });
  addLink({ source: 'gotcha:force-graph-isolation', target: 'component:GraphifyVisualizer', relation: 'enforces', confidence: 'INFERRED' });
  addLink({ source: 'gotcha:decimal-serialization', target: 'action:queries', relation: 'enforces', confidence: 'INFERRED' });

  // Session Handover Links
  addLink({ source: 'handover:decision-1', target: 'page:/account-team', relation: 'enforces', confidence: 'INFERRED' });
  addLink({ source: 'handover:decision-2', target: 'page:/billing-statement', relation: 'enforces', confidence: 'INFERRED' });
  addLink({ source: 'handover:active-state', target: 'component:KnowledgeGraphViewer', relation: 'enforces', confidence: 'INFERRED' });

  const graphData: GraphData = {
    version: '2.0.0',
    generatedAt: new Date().toISOString(),
    nodes,
    links,
  };

  const outputPath = path.join(rootDir, 'graph.json');
  fs.writeFileSync(outputPath, JSON.stringify(graphData, null, 2), 'utf-8');
  console.log(`✅ Graphify graph.json generated successfully at ${outputPath}`);
  console.log(`Total Nodes: ${nodes.length}, Total Edges: ${links.length}`);
}

generateGraphifyData().catch(console.error);

