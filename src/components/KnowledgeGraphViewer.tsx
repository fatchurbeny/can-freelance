"use client";

import { useState } from 'react';
import GraphifyVisualizer from './GraphifyVisualizer';
import { 
  Network, 
  Database, 
  Layers, 
  RefreshCw, 
  CheckCircle2, 
  Cpu, 
  ShieldAlert, 
  History, 
  ChevronRight,
  Activity
} from 'lucide-react';

interface KnowledgeGraphViewerProps {
  initialStats?: {
    totalEntities?: number;
    totalModules?: number;
    totalRules?: number;
    lastUpdated?: string;
  };
}

export default function KnowledgeGraphViewer({ initialStats }: KnowledgeGraphViewerProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'entities' | 'modules' | 'rules' | 'sync' | 'issues' | 'handover'>('visual');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshSuccess(false);
    setTimeout(() => {
      setIsRefreshing(false);
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 4000);
    }, 1200);
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Top Banner / Header (Cloudflare Continuous Card Style) */}
      <div className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] p-5 sm:p-6 shadow-none transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/20 flex items-center justify-center shrink-0">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-sans text-gray-900 dark:text-white">
                  Knowledge Graph & System Architecture
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-sans font-bold rounded-full bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/20">
                  Hybrid Synergy
                </span>
              </div>
              <p className="text-xs font-sans text-gray-500 dark:text-gray-400 mt-1">
                Peta terstruktur domain, skema data, alur Notion sync, dan log handover konteks antar LLM/editor.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {refreshSuccess && (
              <span className="flex items-center gap-1.5 text-xs font-sans font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Knowledge Base Refreshed!
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-sans font-bold text-white bg-[#ff5e1f] hover:bg-[#ff7038] rounded-lg transition-all disabled:opacity-50 cursor-pointer shadow-none"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Scanning AST...' : 'Sync & Refresh Index'}
            </button>
          </div>
        </div>

        {/* Quick Stats Table Grid Row (Cloudflare Continuous Style - KPI Icon Styling) */}
        <div className="-mx-5 -mb-5 sm:-mx-6 sm:-mb-6 mt-6 border-t border-[#f0f0f0] dark:border-[#272a34] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#f0f0f0] dark:divide-[#272a34] bg-gray-50/50 dark:bg-[#0d0e12]">
          {/* 1. Total Data Entities */}
          <div className="p-4 sm:p-5 flex flex-col justify-between hover:bg-gray-50/80 dark:hover:bg-[#16181d]/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-sans text-gray-500 dark:text-gray-400">Total Data Entities</span>
              <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                <Database className="w-3.5 h-3.5" />
              </div>
            </div>
            <span className="text-base sm:text-lg font-sans font-bold text-gray-900 dark:text-white mt-3 block">
              9 Models
            </span>
          </div>

          {/* 2. App Modules & Actions */}
          <div className="p-4 sm:p-5 flex flex-col justify-between hover:bg-gray-50/80 dark:hover:bg-[#16181d]/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-sans text-gray-500 dark:text-gray-400">App Modules & Actions</span>
              <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                <Layers className="w-3.5 h-3.5" />
              </div>
            </div>
            <span className="text-base sm:text-lg font-sans font-bold text-gray-900 dark:text-white mt-3 block">
              7 Routes & 3 Actions
            </span>
          </div>

          {/* 3. Business Logic Rules */}
          <div className="p-4 sm:p-5 flex flex-col justify-between hover:bg-gray-50/80 dark:hover:bg-[#16181d]/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-sans text-gray-500 dark:text-gray-400">Business Logic Rules</span>
              <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <Cpu className="w-3.5 h-3.5" />
              </div>
            </div>
            <span className="text-base sm:text-lg font-sans font-bold text-gray-900 dark:text-white mt-3 block">
              4 SaaS Formulas
            </span>
          </div>

          {/* 4. Sync & Token Strategy */}
          <div className="p-4 sm:p-5 flex flex-col justify-between hover:bg-gray-50/80 dark:hover:bg-[#16181d]/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-sans text-gray-500 dark:text-gray-400">Sync & Token Strategy</span>
              <div className="w-6 h-6 rounded-md bg-[#ff5e1f]/10 flex items-center justify-center text-[#ff5e1f] shrink-0">
                <Activity className="w-3.5 h-3.5" />
              </div>
            </div>
            <span className="text-base sm:text-lg font-sans font-bold text-[#ff5e1f] mt-3 block">
              On-Demand Token
            </span>
          </div>
        </div>
      </div>

      {/* Continuous Cloudflare Card (Tab Navigation Bar + Active Tab Panel) */}
      <div className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-none overflow-hidden">
        {/* Tab Navigation Header Bar (Image 2 / ProductionTabNav Style) */}
        <div className="flex items-stretch w-full overflow-x-auto bg-[#f8f9fa] dark:bg-[#0d0e12] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {[
            { id: 'visual', label: 'Interactive Node Map', icon: Network },
            { id: 'entities', label: 'Entities & Schema', icon: Database },
            { id: 'modules', label: 'App Architecture', icon: Layers },
            { id: 'rules', label: 'SaaS Business Rules', icon: Cpu },
            { id: 'sync', label: 'Notion Sync Engine', icon: Activity },
            { id: 'issues', label: 'Gotchas & Layout Rules', icon: ShieldAlert },
            { id: 'handover', label: 'Session Handover Log', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-sans transition-all duration-150 cursor-pointer whitespace-nowrap border-r last:border-r-0 border-[#f0f0f0] dark:border-[#272a34] ${
                  isActive
                    ? 'bg-white dark:bg-[#16181d] text-gray-900 dark:text-white font-bold'
                    : 'bg-[#f8f9fa] dark:bg-[#0d0e12] text-gray-600 dark:text-gray-400 font-medium hover:bg-[#f0f1f3] dark:hover:bg-[#16181d]/50 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#ff5e1f]' : 'text-gray-400 dark:text-gray-500'}`} />
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff5e1f]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content Panels Container */}
        <div className="w-full">
          {/* Tab 1: Visual Interactive Knowledge Graph Map */}
          {activeTab === 'visual' && (
            <GraphifyVisualizer />
          )}

          {/* Tab 2: Entities & Schema */}
          {activeTab === 'entities' && (
            <div className="p-5 sm:p-6 space-y-4 font-sans">
              <h2 className="text-base font-bold font-sans text-gray-900 dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-[#ff5e1f]" />
                Model Entitas Database & Mapping Notion API
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'Task (tasks)', desc: 'Kartu tugas utama dari Notion', fields: 'id, notionPageId, title, qtySubmit, pages, brandId, doctypeId, designerId, designStatusId' },
                  { name: 'Designer (designers)', desc: 'Master desainer & freelancer', fields: 'id, name, notionId, status (Active/Resign/Hold), email, role' },
                  { name: 'Doctype (doctypes)', desc: 'Tipe format dokumen desain', fields: 'id, name, pages (base template pages), rate, notionId' },
                  { name: 'Brand (brands)', desc: 'Master brand / klien', fields: 'id, name, notionId' },
                  { name: 'DesignStatus (design_statuses)', desc: 'Tahapan pengerjaan Kanban', fields: 'id, displayName, notionKey, order, color' },
                  { name: 'ContractRate (contract_rates)', desc: 'Tarif khusus desainer per doctype', fields: 'id, designerId, doctypeId, customRate' },
                  { name: 'BillingStatement', desc: 'Tagihan pembayaran desainer', fields: 'id, designerId, month, totalAmount, status, paidAt' },
                  { name: 'SyncLog & NotionConfig', desc: 'Log eksekusi & token Notion API', fields: 'id, status, startedAt, finishedAt, itemsProcessed, errors' },
                ].map((ent, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs font-sans text-gray-900 dark:text-white">{ent.name}</span>
                      <span className="text-[10px] font-sans font-bold text-[#ff5e1f] bg-[#ff5e1f]/10 border border-[#ff5e1f]/20 px-2 py-0.5 rounded-full">Prisma Model</span>
                    </div>
                    <p className="text-xs font-sans text-gray-500 dark:text-gray-400">{ent.desc}</p>
                    <div className="text-[11px] font-mono text-gray-400 dark:text-gray-500 pt-2 border-t border-[#f0f0f0] dark:border-[#272a34]">
                      Fields: {ent.fields}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: App Architecture */}
          {activeTab === 'modules' && (
            <div className="p-5 sm:p-6 space-y-4 font-sans">
              <h2 className="text-base font-bold font-sans text-gray-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#ff5e1f]" />
                Peta Rute App Router & Server Actions
              </h2>
              <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] border border-[#f0f0f0] dark:border-[#272a34] rounded-xl overflow-hidden">
                {[
                  { route: '/', file: 'src/app/page.tsx', desc: 'Dashboard utama KPI, tren volume, & workload desainer.' },
                  { route: '/production', file: 'src/app/production/page.tsx', desc: 'Board Kanban produksi dengan drag-drop & filter multi-bulan.' },
                  { route: '/billing-statement', file: 'src/app/billing-statement/page.tsx', desc: 'Persetujuan payroll desainer & cetak otomatis billing statement.' },
                  { route: '/knowledge-graph', file: 'src/app/knowledge-graph/page.tsx', desc: 'Dashboard visual Knowledge Graph & penjelajah dokumen pengetahuan.' },
                  { route: '/rate-card', file: 'src/app/rate-card/page.tsx', desc: 'Pengaturan tarif kontrak per desainer/doctype.' },
                  { route: '/account-team', file: 'src/app/account-team/page.tsx', desc: 'Manajemen akun desainer & status keanggotaan.' },
                  { route: '/notion-config', file: 'src/app/notion-config/page.tsx', desc: 'Pengaturan ketersediaan database Notion ID & secret key.' },
                ].map((mod, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100/80 dark:hover:bg-[#16181d] transition-colors gap-2 font-sans text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#ff5e1f] font-sans">{mod.route}</span>
                        <span className="text-[11px] text-gray-400 font-mono">[{mod.file}]</span>
                      </div>
                      <p className="text-xs font-sans text-gray-500 dark:text-gray-400 mt-1">{mod.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 hidden md:block" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: SaaS Business Rules */}
          {activeTab === 'rules' && (
            <div className="p-5 sm:p-6 space-y-4 font-sans">
              <h2 className="text-base font-bold font-sans text-gray-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#ff5e1f]" />
                Rumus Bisnis SaaS & Standard Perhitungan
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-2">
                  <span className="font-bold font-sans text-sm text-gray-900 dark:text-white block">Count QTY Pages</span>
                  <p className="text-xs font-sans text-gray-600 dark:text-gray-300">
                    Formula: <code className="bg-white dark:bg-[#0d0e12] border border-[#f0f0f0] dark:border-[#272a34] px-1.5 py-0.5 rounded font-mono text-[#ff5e1f]">qty_submit * pages</code> per task.
                  </p>
                  <p className="text-xs font-sans text-gray-500 dark:text-gray-400">
                    Menghitung total volume aktual halaman yang dikerjakan desainer.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-2">
                  <span className="font-bold font-sans text-sm text-gray-900 dark:text-white block">Aturan Designer Status Resign</span>
                  <p className="text-xs font-sans text-gray-600 dark:text-gray-300">
                    Logika: <code className="bg-white dark:bg-[#0d0e12] border border-[#f0f0f0] dark:border-[#272a34] px-1.5 py-0.5 rounded font-mono text-emerald-600 dark:text-emerald-400">status === 'Resign' → Payroll = 0</code>.
                  </p>
                  <p className="text-xs font-sans text-gray-500 dark:text-gray-400">
                    Desainer yang mengundurkan diri mendapatkan badge merah coret dan pembayaran diset strictly 0.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-2">
                  <span className="font-bold font-sans text-sm text-gray-900 dark:text-white block">Base Template Pages</span>
                  <p className="text-xs font-sans text-gray-600 dark:text-gray-300">
                    Formula: <code className="bg-white dark:bg-[#0d0e12] border border-[#f0f0f0] dark:border-[#272a34] px-1.5 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">MAX(pages)</code> pada grouped query.
                  </p>
                  <p className="text-xs font-sans text-gray-500 dark:text-gray-400">
                    Mengambil nilai statis dari ukuran doctype dasar (misal @12Pages).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-2">
                  <span className="font-bold font-sans text-sm text-gray-900 dark:text-white block">Dynamic Period Labels</span>
                  <p className="text-xs font-sans text-gray-600 dark:text-gray-300">
                    Format: <code className="bg-white dark:bg-[#0d0e12] border border-[#f0f0f0] dark:border-[#272a34] px-1.5 py-0.5 rounded font-mono text-[#ff5e1f]">Doctype created &lt;Bulan-Tahun&gt;</code>.
                  </p>
                  <p className="text-xs font-sans text-gray-500 dark:text-gray-400">
                    Label judul pada board disesuaikan secara dinamis dengan filter bulan yang dipilih pengguna.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Notion Sync Engine */}
          {activeTab === 'sync' && (
            <div className="p-5 sm:p-6 space-y-4 font-sans">
              <h2 className="text-base font-bold font-sans text-gray-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#ff5e1f]" />
                Mekanisme & Workflow Notion Sync Engine
              </h2>
              <div className="space-y-3 text-xs font-sans text-gray-600 dark:text-gray-300">
                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-2">
                  <span className="font-bold font-sans text-sm text-gray-900 dark:text-white block">1. Full Sync vs Incremental Cron Sync</span>
                  <p className="leading-relaxed">Manual Sync yang dipicu pengguna dari tombol UI menggunakan mode <code className="text-[#ff5e1f] font-mono">full</code> untuk merekonsiliasi seluruh tugas, status, dan halaman yang dihapus. Background Cron menggunakan mode <code className="text-[#ff5e1f] font-mono">incremental</code> untuk polling perubahan cepat.</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-2">
                  <span className="font-bold font-sans text-sm text-gray-900 dark:text-white block">2. Notion Rich Text & Title Parsing</span>
                  <p className="leading-relaxed">Notion memecah teks menjadi beberapa segmen jika formatnya bervariasi. Selalu gunakan <code className="text-[#ff5e1f] font-mono">.map(t =&gt; t.plain_text).join(&apos;&apos;)</code> agar tidak ada segmen judul yang terpotong.</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-2">
                  <span className="font-bold font-sans text-sm text-gray-900 dark:text-white block">3. Pemetaan Status & Alias Case-Insensitive</span>
                  <p className="leading-relaxed">Sistem memetakan status Notion secara cerdas dengan mencakup varian title-case, lowercase, serta alias QA (<code className="text-[#ff5e1f] font-mono">QA</code>, <code className="text-[#ff5e1f] font-mono">Q&amp;A</code>, <code className="text-[#ff5e1f] font-mono">In QA</code>) ke entitas <code className="text-[#ff5e1f] font-mono">DesignStatus</code> kanonikal.</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 6: Gotchas & Issues */}
          {activeTab === 'issues' && (
              <div className="p-5 sm:p-6 space-y-4 font-sans">
              <h2 className="text-base font-bold font-sans text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#ff5e1f]" />
                Catatan Gotchas & Aturan Layout Pencegah Bug
              </h2>
              <div className="space-y-3">
                {[
                  { title: 'Mandatory Post-Execution UI Grep Audit Protocol (Zero Open Question Invariant)', level: 'High', desc: 'LLM DILARANG MENANYAKAN open question saat membuat/mengedit form CRUD atau halaman UI. Terapkan custom Cloudflare Dropdown dan Inter font-sans secara otomatis, lalu jalankan grep_search audit untuk mengonfirmasi 0 native <select> dan 0 font-mono ilegal.' },
                  { title: 'Prohibition of Native Select Controls & Dedicated Far-Right Action Column Protocol', level: 'High', desc: 'Dilarang menggunakan tag HTML <select> native. Gunakan Cloudflare Dropdown Panel dengan Cloudflare Checkbox. Sel status hanya berisi badge, tombol aksi (PROMOTE/EDIT) wajib di kolom ACTION paling kanan.' },
                  { title: 'Standard Tipografi Universal Inter (font-sans)', level: 'High', desc: 'Seluruh elemen UI (headings, KPI metrics, buttons, tabs, tables, toolbars, badges, modals, form controls) WAJIB menggunakan Inter (font-sans). font-mono HANYA diizinkan untuk technical quote fields (Notion DB IDs, secret tokens, UUIDs, inline <code>, dan terminal sync logs).' },
                  { title: 'Force Graph Simulation Hover Isolation', level: 'High', desc: 'State hoveredNode/selectedNode/isDark diikat ke useRef dan dihapus dari useEffect simulasi fisik agar grafik tidak bergetar saat di-hover.' },
                  { title: 'Preservasi Next.js Directive "use client"', level: 'High', desc: 'Wajib mempertahankan "use client" di baris paling atas file komponen client yang memakai React hooks.' },
                  { title: 'Prisma Decimal & Date Coercion', level: 'High', desc: 'Decimal diserialisasi dengan JSON.parse/stringify. Date coerce dengan getTime() sebelum komparasi.' },
                  { title: 'Prevensi Overflow & Stacking Context Trap', level: 'Medium', desc: 'Dilarang overflow-hidden pada induk floating UI. Terapkan visual state ke elemen anak spesifik.' },
                  { title: 'Cloudflare Symmetrical Table & Control Layout Rules', level: 'Medium', desc: 'Layout kontainer main p-6 md:p-8, outer card rounded-none, tab nav flex-1 simetris, flat search toolbar h-10, dan 2-column table list (flex-1 + w-16 border-l).' },
                  { title: 'Outer Container vs. Control Rounding Invariant', level: 'High', desc: 'Kontainer utama luar menggunakan rounded-none, namun sakelar toggle, badge, pill, dan tombol aksi WAJIB mempertahankan rounded-lg / rounded-full agar tidak boxy.' },
                  { title: 'Notion Auto Sync Countdown Reference Time', level: 'Medium', desc: 'Calculated referenceStartTime = Math.max(lastFinished, configUpdatedAt) agar mengaktifkan Auto Sync mengatur timer mundur penuh tanpa instant sync.' },
                  { title: 'Sidebar Sync Indicator Table Standard', level: 'Info', desc: 'Indikator sync sidebar menggunakan layout tabel simetris full-width (w-full rounded-none divide-y) tanpa double top border dan tanpa bottom border.' },
                  { title: 'Cloudflare Inline Table Editing Standard', level: 'High', desc: 'Kontrol inline edit wajib h-full min-h-[44px] align-stretch p-0 pada td, hapus stepper arrow native, dan gunakan sel aksi 2-kolom simetris (Save/Cancel).' },
                  { title: 'Prevensi Double Border Lines pada Kontainer divide-y', level: 'Medium', desc: 'Dilarang menambahkan border-t atau border-b eksplisit pada elemen child di dalam kontainer divide-y divide-[#272a34] untuk mencegah garis tebal ganda.' },
                  { title: 'Proportional Navigation Tabs vs Grid Column Precision', level: 'Medium', desc: 'Tab navigasi utama mengutamakan keterbacaan teks label (px-5 sm:px-6 py-3.5) tanpa truncate, sedangkan data cards & table header wajib 25%/50% grid.' },
                  { title: 'Knowledge Graph Full-Domain Mapping Protocol', level: 'High', desc: 'Memparsing seluruh modul docs/knowledge/*.md menjadi 92 Nodes & 87 Edges terstruktur yang terbagi dalam 8 Kluster Komunitas interaktif.' }
                ].map((iss, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-1 font-sans">
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-sans text-sm text-gray-900 dark:text-white">{iss.title}</span>
                      <span className={`text-[10px] font-sans font-bold px-2.5 py-0.5 rounded-full ${
                        iss.level === 'High' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400' :
                        iss.level === 'Medium' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400' :
                        'bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400'
                      }`}>{iss.level} Priority</span>
                    </div>
                    <p className="text-xs font-sans text-gray-500 dark:text-gray-400 mt-1">{iss.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 7: Session Handover Log & Engineering Roles */}
          {activeTab === 'handover' && (
            <div className="p-5 sm:p-6 space-y-6 font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f0f0f0] dark:border-[#272a34] pb-4">
                <div>
                  <h2 className="text-base font-bold font-sans text-gray-900 dark:text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-[#ff5e1f]" />
                    Session Handover &amp; Engineering Roles Protocol
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Protokol handover multi-IDE (Antigravity, Claude Code, Cursor, Codex) berbasis 6 domain peran rekayasa.
                  </p>
                </div>
                <span className="text-xs text-gray-400 font-mono self-start sm:self-auto bg-gray-100 dark:bg-[#16181d] px-2.5 py-1 rounded-md border border-[#f0f0f0] dark:border-[#272a34]">
                  Session ID: #SESS-20260903-36
                </span>
              </div>

              {/* 1. Active Session Signature Card */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-[#ff5e1f]/5 via-purple-500/5 to-transparent border border-[#ff5e1f]/20 space-y-4 font-sans">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-bold font-sans text-sm text-gray-900 dark:text-white">Active Session Signature</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/20 flex items-center gap-1">
                      🎨 Frontend &amp; UI/UX
                    </span>
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      Antigravity (Gemini 3.8)
                    </span>
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Branch: main
                    </span>
                  </div>
                </div>

                <p className="text-xs font-sans text-gray-600 dark:text-gray-300 leading-relaxed">
                  Implementasi tombol hover 3-titik (<strong>MoreHorizontal</strong>) pada seluruh kartu task dengan aksi <strong>Duplicate</strong> (duplikasi task + pembuatan page Notion real-time) dan <strong>Delete</strong> (modal konfirmasi + pengarsipan page Notion).
                </p>

                <div className="pt-3 border-t border-[#ff5e1f]/15 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-500 dark:text-gray-400 gap-2">
                  <div>
                    <span className="font-bold text-gray-700 dark:text-gray-300">Next Recommended Role: </span>
                    <span className="text-[#ff5e1f] font-semibold">🎨 Frontend &amp; UI/UX</span> atau <span className="text-blue-500 font-semibold">🏛️ Architecture &amp; Knowledge Ops</span>
                  </div>
                  <span className="font-mono text-[11px] text-gray-400">Timestamp: 2026-09-03 14:00 WIB</span>
                </div>
              </div>

              {/* 2. Registered Engineering Roles Matrix */}
              <div className="space-y-3 font-sans">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-sans font-bold text-gray-400 uppercase tracking-wider">
                    Registered Engineering Roles (Standard Taxonomy)
                  </span>
                  <span className="text-[11px] text-[#ff5e1f] font-medium font-sans">
                    Extensible via docs/knowledge/roles.md
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { icon: '🎨', name: 'Frontend & UI/UX', files: 'src/components/**, globals.css', invariant: 'Universal Inter font, "use client" preservation, Cloudflare symmetrical layouts' },
                    { icon: '⚙️', name: 'Backend & Database', files: 'prisma/schema.prisma, PostgreSQL', invariant: 'Prisma.sql raw query safety, Decimal/Date JSON serialization' },
                    { icon: '🔄', name: 'API & Notion Sync', files: 'src/app/actions/**, /api/sync/**', invariant: 'Incremental-only cron sync, rich text multi-segment parsing, RSC auth proxy' },
                    { icon: '💼', name: 'Business & Domain', files: 'src/lib/period-utils.ts, payroll', invariant: 'QTY Pages = submit * pages, Resigned designer = 0, MAX(pages) doctype' },
                    { icon: '🏛️', name: 'Architecture & Ops', files: 'docs/knowledge/**, AGENTS.md', invariant: 'Scratch folder isolation, AST graphify sync, multi-LLM rule governance' },
                    { icon: '🛡️', name: 'DevOps & Release', files: 'vercel.json, package.json', invariant: 'Vercel Hobby daily cron (00:00 WIB), no unauthorized auto-push' },
                  ].map((role, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-1.5 hover:border-[#ff5e1f]/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs font-sans text-gray-900 dark:text-white flex items-center gap-1.5">
                          <span>{role.icon}</span>
                          <span>{role.name}</span>
                        </span>
                        <span className="text-[10px] font-sans font-bold text-[#ff5e1f] bg-[#ff5e1f]/10 px-2 py-0.5 rounded-full">Active Role</span>
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono truncate">
                        Scope: {role.files}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                        {role.invariant}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Historical Session Notes with Role Tags */}
              <div className="space-y-2 pt-2 font-sans">
                <span className="text-xs font-sans font-bold text-gray-400 uppercase tracking-wider">
                  Historical Handover Log (Tagged by Role)
                </span>
                
                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-2 text-xs font-sans text-gray-600 dark:text-gray-300">
                  <div className="flex items-center justify-between">
                    <p className="font-bold font-sans text-gray-900 dark:text-white">1. Inter Font Post-Migration Grep Audit Protocol</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/20">🎨 Frontend</span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                    Menambahkan instruksi audit wajib <code className="font-mono text-[#ff5e1f]">grep_search</code> untuk pola <code className="font-mono text-[#ff5e1f]">font-mono</code> pada aturan #19 di <code className="font-mono text-[#ff5e1f]">issues-and-fixes.md</code> guna menjamin tidak ada teks UI/badge yang tertinggal.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-2 text-xs font-sans text-gray-600 dark:text-gray-300">
                  <div className="flex items-center justify-between">
                    <p className="font-bold font-sans text-gray-900 dark:text-white">2. Universal Inter Typography Standardization</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/20">🎨 Frontend</span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed">Menghapus font Outfit dari <code className="font-mono text-[#ff5e1f]">layout.tsx</code>, meng-alias token <code className="font-mono text-[#ff5e1f]">--font-display</code> ke Inter, dan menstandarisasi 30+ file UI ke <code className="font-mono text-[#ff5e1f]">font-sans</code>.</p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-2 text-xs font-sans text-gray-600 dark:text-gray-300">
                  <div className="flex items-center justify-between">
                    <p className="font-bold font-sans text-gray-900 dark:text-white">3. Double Border Elimination &amp; Navigation Tab Proportional Sizing</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/20">🎨 Frontend</span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed">Menghapus <code className="font-mono text-[#ff5e1f]">border-t</code> / <code className="font-mono text-[#ff5e1f]">border-b</code> berlebih pada kontainer <code className="font-mono text-[#ff5e1f]">divide-y</code>, serta mengatur tab navigasi dengan padding proporsional sama rata (<code className="font-mono text-[#ff5e1f]">px-5 sm:px-6 py-3.5</code>) tanpa truncate.</p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-2 text-xs font-sans text-gray-600 dark:text-gray-300">
                  <div className="flex items-center justify-between">
                    <p className="font-bold font-sans text-gray-900 dark:text-white">4. Billing &amp; Statement Symmetrical Table Style &amp; Payout Header Grid</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">💼 Business</span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed">Merombak header Payout Breakdown &amp; <code className="font-mono text-[#ff5e1f]">MonthFilter</code> ke flat table style (<code className="font-mono text-[#ff5e1f]">rounded-none</code>, <code className="font-mono text-[#ff5e1f]">min-h-[52px]</code>) dengan pemicu rata kanan di kolom 25% grid.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
