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

  // 4. Prisma Database Models
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

  // 5. Knowledge Base Docs
  const docsDir = path.join(rootDir, 'docs/knowledge');
  if (fs.existsSync(docsDir)) {
    const docFiles = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
    docFiles.forEach(file => {
      const docName = path.basename(file, '.md');
      addNode({
        id: `doc:${docName}`,
        label: `${docName}.md`,
        type: 'doc',
        group: 'Knowledge Base',
        filepath: `docs/knowledge/${file}`,
        details: `Modular Knowledge Document (docs/knowledge/${file})`,
      });
    });
  }

  // 6. Explicit & Inferred Relationships (Links)
  addLink({ source: 'page:/', target: 'component:KPISection', relation: 'renders', confidence: 'EXTRACTED' });
  addLink({ source: 'page:/', target: 'component:WorkloadWidget', relation: 'renders', confidence: 'EXTRACTED' });
  addLink({ source: 'page:/', target: 'component:TrenVolumeWidget', relation: 'renders', confidence: 'EXTRACTED' });

  addLink({ source: 'page:/production', target: 'component:SortableTaskLists', relation: 'renders', confidence: 'EXTRACTED' });
  addLink({ source: 'page:/production', target: 'component:ProductionToolbar', relation: 'renders', confidence: 'EXTRACTED' });

  addLink({ source: 'page:/billing-statement', target: 'component:ApprovalPayrollTable', relation: 'renders', confidence: 'EXTRACTED' });
  addLink({ source: 'component:ApprovalPayrollTable', target: 'action:approval-payroll', relation: 'invokes', confidence: 'EXTRACTED' });

  addLink({ source: 'page:/knowledge-graph', target: 'component:KnowledgeGraphViewer', relation: 'renders', confidence: 'EXTRACTED' });
  addLink({ source: 'component:KnowledgeGraphViewer', target: 'component:GraphifyVisualizer', relation: 'renders', confidence: 'EXTRACTED' });

  addLink({ source: 'component:SyncButton', target: 'action:sync-notion', relation: 'invokes', confidence: 'EXTRACTED' });
  addLink({ source: 'action:sync-notion', target: 'model:Task', relation: 'queries', confidence: 'EXTRACTED' });
  addLink({ source: 'action:sync-notion', target: 'model:Designer', relation: 'queries', confidence: 'EXTRACTED' });
  addLink({ source: 'action:sync-notion', target: 'model:SyncLog', relation: 'queries', confidence: 'EXTRACTED' });

  addLink({ source: 'action:approval-payroll', target: 'model:Designer', relation: 'queries', confidence: 'EXTRACTED' });
  addLink({ source: 'action:approval-payroll', target: 'model:BillingStatement', relation: 'queries', confidence: 'EXTRACTED' });

  addLink({ source: 'action:approval-payroll', target: 'doc:business-rules', relation: 'enforces', confidence: 'INFERRED' });
  addLink({ source: 'action:sync-notion', target: 'doc:data-flows', relation: 'enforces', confidence: 'INFERRED' });
  addLink({ source: 'component:SortableTaskLists', target: 'doc:issues-and-fixes', relation: 'enforces', confidence: 'INFERRED' });

  const graphData: GraphData = {
    version: '1.0.0',
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
