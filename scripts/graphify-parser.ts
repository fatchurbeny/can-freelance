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

  const toPosix = (p: string) => p.split(path.sep).join('/');
  const rel = (abs: string) => toPosix(path.relative(rootDir, abs));
  const isCode = (name: string) => /\.(tsx|ts)$/.test(name) && !name.endsWith('.d.ts');
  const listFiles = (dir: string): string[] => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap(item => {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) return listFiles(full);
        return item.isFile() && isCode(item.name) ? [full] : [];
      });
  };

  // Source file (repo-relative) → node id, used to resolve imports into graph links.
  const fileToNode = new Map<string, string>();
  const register = (node: GraphNode) => {
    addNode(node);
    fileToNode.set(node.filepath, node.id);
  };

  // Hand-written labels/details for long-standing nodes; everything else is discovered.
  const pageLabels: Record<string, string> = {
    '/': 'Dashboard Page',
    '/production': 'Production Kanban',
    '/billing-statement': 'Billing Statement',
    '/knowledge-graph': 'Knowledge Graph Page',
    '/rate-card': 'Rate Card Editor',
    '/account-team': 'Account & Team',
    '/notion-config': 'Notion Config',
  };
  const actionDetails: Record<string, string> = {
    'approval-payroll': 'Server Actions for Payroll calculations & status toggles',
  };
  const modelDetails: Record<string, string> = {
    Task: 'Notion Task card record (qtySubmit, pages, status)',
    Designer: 'Designer profile & status (Active/Resign/Hold)',
    Doctype: 'Document template format & base page rate',
    DesignStatus: 'Kanban production status stage',
    SyncLog: 'Execution logs of Notion sync operations',
  };

  // Route of a file under src/app: drop route groups "(x)" and the file name.
  const routeOf = (relPath: string) => {
    const segments = path.posix.dirname(relPath.replace(/^src\/app\/?/, '')).split('/')
      .filter(seg => seg && seg !== '.' && !/^\(.*\)$/.test(seg));
    return '/' + segments.join('/');
  };

  // 1. App Router: pages, layouts, API routes, server actions, colocated components
  const appDir = path.join(rootDir, 'src/app');
  const appComponentFiles: string[] = [];
  for (const abs of listFiles(appDir)) {
    const relPath = rel(abs);
    const base = path.basename(relPath).replace(/\.(tsx|ts)$/, '');
    const route = routeOf(relPath);
    if (relPath.startsWith('src/app/actions/')) {
      register({
        id: `action:${base}`,
        label: `${base}.ts`,
        type: 'action',
        group: 'Server Actions & Lib',
        filepath: relPath,
        details: actionDetails[base] || `Server Actions in ${relPath}`,
      });
    } else if (base === 'route' && route.startsWith('/api')) {
      register({
        id: `api:${route.replace(/^\/api/, '') || '/'}`,
        label: `API ${route}`,
        type: 'action',
        group: 'Server Actions & Lib',
        filepath: relPath,
        details: `Route Handler (${route})`,
      });
    } else if (base === 'page') {
      register({
        id: `page:${route}`,
        label: pageLabels[route] || `${route.split('/').pop()} Page`,
        type: 'page',
        group: 'App Router Pages',
        filepath: relPath,
        details: `Next.js 16 App Router Page (${route})`,
      });
    } else if (base === 'layout') {
      register({
        id: `layout:${route}`,
        label: route === '/' ? 'Root Layout' : `${route.split('/').pop()} Layout`,
        type: 'page',
        group: 'App Router Pages',
        filepath: relPath,
        details: `Next.js App Router Layout (${route})`,
      });
    } else if (relPath.endsWith('.tsx')) {
      appComponentFiles.push(abs);
    }
  }

  // 2. React Components (src/components/** plus .tsx colocated in src/app)
  for (const abs of [...listFiles(path.join(rootDir, 'src/components')), ...appComponentFiles]) {
    const relPath = rel(abs);
    const name = path.basename(relPath).replace(/\.(tsx|ts)$/, '');
    const id = nodes.some(n => n.id === `component:${name}`) ? `component:${relPath}` : `component:${name}`;
    register({
      id,
      label: name,
      type: 'component',
      group: 'React Components',
      filepath: relPath,
      details: `React UI Component in ${relPath}`,
    });
  }

  // 3. Server lib (src/lib/**). sync-notion & queries keep their historical action: ids.
  const libDetails: Record<string, { id: string; label: string; details: string }> = {
    'sync-notion': { id: 'action:sync-notion', label: 'sync-notion.ts Engine', details: 'Notion API Full & Incremental sync engine' },
    queries: { id: 'action:queries', label: 'queries.ts Aggregations', details: 'Prisma aggregation queries for KPI & volume trends' },
  };
  for (const abs of listFiles(path.join(rootDir, 'src/lib'))) {
    const relPath = rel(abs);
    const name = relPath.replace(/^src\/lib\//, '').replace(/\.(tsx|ts)$/, '');
    const known = libDetails[name];
    register({
      id: known?.id || `lib:${name}`,
      label: known?.label || `${name}.ts`,
      type: 'action',
      group: 'Server Actions & Lib',
      filepath: relPath,
      details: known?.details || `Server/shared library in ${relPath}`,
    });
  }

  // 4. Prisma Database Models (parsed from schema.prisma)
  const schemaPath = path.join(rootDir, 'prisma/schema.prisma');
  const modelAccessors = new Map<string, string>(); // prisma.<accessor> → model node id
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    for (const match of schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
      const [, name, body] = match;
      const table = body.match(/@@map\(\s*"([^"]+)"\s*\)/)?.[1];
      const id = `model:${name}`;
      addNode({
        id,
        label: `${name} Model`,
        type: 'model',
        group: 'Prisma DB Models',
        filepath: 'prisma/schema.prisma',
        details: modelDetails[name] || `Prisma model ${name}${table ? ` (table ${table})` : ''}`,
      });
      modelAccessors.set(name.charAt(0).toLowerCase() + name.slice(1), id);
    }
  }

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

  // 9. Engineering Roles & Domain Ownership Cluster
  const engineeringRoles = [
    { id: 'role:frontend', label: 'Frontend & UI/UX Role', filepath: 'docs/knowledge/roles.md', details: 'Owns src/components/**, globals.css, Inter typography, and UI accessibility' },
    { id: 'role:backend', label: 'Backend & Database Role', filepath: 'docs/knowledge/roles.md', details: 'Owns prisma/schema.prisma, PostgreSQL pool, Decimal/Date serialization' },
    { id: 'role:api', label: 'API & Notion Sync Role', filepath: 'docs/knowledge/roles.md', details: 'Owns Notion client, server actions, incremental cron sync, Vercel proxy auth' },
    { id: 'role:business', label: 'Business & Domain Role', filepath: 'docs/knowledge/roles.md', details: 'Owns SaaS formulas (QTY pages = qtySubmit * pages), Resign status logic' },
    { id: 'role:architecture', label: 'Architecture & Knowledge Ops', filepath: 'docs/knowledge/roles.md', details: 'Owns docs/knowledge/**, session handover, AST graphify, and multi-LLM sync' },
    { id: 'role:devops', label: 'DevOps & Release Role', filepath: 'docs/knowledge/roles.md', details: 'Owns vercel.json cron configuration, build scripts, and environment deployment' },
  ];
  engineeringRoles.forEach(r => {
    addNode({
      id: r.id,
      label: r.label,
      type: 'doc',
      group: 'Engineering Roles & Ops',
      filepath: r.filepath,
      details: r.details,
    });
  });

  // 10. Import & Prisma scanner: link every registered file to what it imports / queries
  const resolveImport = (fromRel: string, spec: string): string | null => {
    let base: string;
    if (spec.startsWith('@/')) base = path.join(rootDir, 'src', spec.slice(2));
    else if (spec.startsWith('.')) base = path.join(rootDir, path.dirname(fromRel), spec);
    else return null;
    for (const candidate of [base, `${base}.tsx`, `${base}.ts`, path.join(base, 'index.tsx'), path.join(base, 'index.ts')]) {
      const key = rel(candidate);
      if (fileToNode.has(key)) return fileToNode.get(key)!;
    }
    return null;
  };

  for (const [relPath, sourceId] of fileToNode) {
    const content = fs.readFileSync(path.join(rootDir, relPath), 'utf-8');
    const specs = [
      ...content.matchAll(/^\s*(?:import|export)\s[^;]*?\bfrom\s+['"]([^'"]+)['"]/gm),
      ...content.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g),
    ].map(m => m[1]);
    for (const spec of specs) {
      const targetId = resolveImport(relPath, spec);
      if (!targetId || targetId === sourceId) continue;
      const target = nodes.find(n => n.id === targetId)!;
      addLink({ source: sourceId, target: targetId, relation: target.type === 'action' ? 'invokes' : 'renders', confidence: 'EXTRACTED' });
    }
    for (const match of content.matchAll(/\b(?:prisma|tx)\.(\w+)\s*\./g)) {
      const modelId = modelAccessors.get(match[1]);
      if (modelId) addLink({ source: sourceId, target: modelId, relation: 'queries', confidence: 'EXTRACTED' });
    }
  }

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

  // Engineering Roles Governance Links
  addLink({ source: 'role:frontend', target: 'component:Sidebar', relation: 'enforces', confidence: 'INFERRED' });
  addLink({ source: 'role:frontend', target: 'component:KnowledgeGraphViewer', relation: 'enforces', confidence: 'INFERRED' });
  addLink({ source: 'role:frontend', target: 'component:SortableTaskLists', relation: 'enforces', confidence: 'INFERRED' });
  addLink({ source: 'role:backend', target: 'model:Task', relation: 'queries', confidence: 'INFERRED' });
  addLink({ source: 'role:backend', target: 'model:Designer', relation: 'queries', confidence: 'INFERRED' });
  addLink({ source: 'role:api', target: 'action:sync-notion', relation: 'invokes', confidence: 'INFERRED' });
  addLink({ source: 'role:api', target: 'sync:cron-mode', relation: 'invokes', confidence: 'INFERRED' });
  addLink({ source: 'role:business', target: 'rule:qty-pages', relation: 'enforces', confidence: 'INFERRED' });
  addLink({ source: 'role:business', target: 'rule:designer-resign', relation: 'enforces', confidence: 'INFERRED' });
  addLink({ source: 'role:architecture', target: 'handover:active-state', relation: 'enforces', confidence: 'INFERRED' });
  addLink({ source: 'role:architecture', target: 'gotcha:directive-preservation', relation: 'enforces', confidence: 'INFERRED' });
  addLink({ source: 'role:devops', target: 'page:/notion-config', relation: 'enforces', confidence: 'INFERRED' });

  // Drop hand-written links whose endpoints no longer exist (renamed/removed code).
  const ids = new Set(nodes.map(n => n.id));
  const dangling = links.filter(l => !ids.has(l.source) || !ids.has(l.target));
  dangling.forEach(l => console.warn(`⚠️  Dropping dangling link ${l.source} → ${l.target}`));

  const graphData: GraphData = {
    version: '2.1.0',
    generatedAt: new Date().toISOString(),
    nodes,
    links: links.filter(l => ids.has(l.source) && ids.has(l.target)),
  };

  const outputPath = path.join(rootDir, 'graph.json');
  fs.writeFileSync(outputPath, JSON.stringify(graphData, null, 2), 'utf-8');
  console.log(`✅ Graphify graph.json generated successfully at ${outputPath}`);
  console.log(`Total Nodes: ${graphData.nodes.length}, Total Edges: ${graphData.links.length}`);
}

generateGraphifyData().catch(error => {
  console.error(error);
  process.exit(1);
});

