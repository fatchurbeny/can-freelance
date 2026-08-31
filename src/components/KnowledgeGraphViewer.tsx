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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Header (Cloudflare Continuous Card Style) */}
      <div className="w-full rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] p-5 sm:p-6 shadow-none transition-colors">
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
                <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-full bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/20">
                  Hybrid Synergy
                </span>
              </div>
              <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1">
                Peta terstruktur domain, skema data, alur Notion sync, dan log handover konteks antar LLM/editor.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {refreshSuccess && (
              <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Knowledge Base Refreshed!
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold text-white bg-[#ff5e1f] hover:bg-[#ff7038] rounded-lg transition-all disabled:opacity-50 cursor-pointer shadow-none"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Scanning AST...' : 'Sync & Refresh Index'}
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#f0f0f0] dark:border-[#272a34]">
          <div className="bg-gray-50 dark:bg-[#16181d] p-3.5 rounded-xl border border-[#f0f0f0] dark:border-[#272a34]">
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 block">Total Data Entities</span>
            <span className="text-base sm:text-lg font-sans font-bold text-gray-900 dark:text-white">9 Models</span>
          </div>
          <div className="bg-gray-50 dark:bg-[#16181d] p-3.5 rounded-xl border border-[#f0f0f0] dark:border-[#272a34]">
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 block">App Modules & Actions</span>
            <span className="text-base sm:text-lg font-sans font-bold text-gray-900 dark:text-white">7 Routes & 3 Actions</span>
          </div>
          <div className="bg-gray-50 dark:bg-[#16181d] p-3.5 rounded-xl border border-[#f0f0f0] dark:border-[#272a34]">
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 block">Business Logic Rules</span>
            <span className="text-base sm:text-lg font-sans font-bold text-gray-900 dark:text-white">4 SaaS Formulas</span>
          </div>
          <div className="bg-gray-50 dark:bg-[#16181d] p-3.5 rounded-xl border border-[#f0f0f0] dark:border-[#272a34]">
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 block">Sync & Token Strategy</span>
            <span className="text-base sm:text-lg font-sans font-bold text-[#ff5e1f]">On-Demand Token</span>
          </div>
        </div>
      </div>

      {/* Continuous Cloudflare Card (Tab Navigation Bar + Active Tab Panel) */}
      <div className="w-full rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-none overflow-hidden">
        {/* Tab Navigation Header Bar (Image 2 / ProductionTabNav Style) */}
        <div className="flex items-stretch overflow-x-auto bg-[#f8f9fa] dark:bg-[#0d0e12] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                className={`relative flex items-center gap-2 px-5 py-3 text-xs font-mono transition-all duration-150 cursor-pointer whitespace-nowrap border-r border-[#f0f0f0] dark:border-[#272a34] ${
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
            <div className="p-5 sm:p-6 space-y-4">
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
                      <span className="font-bold text-xs font-mono text-gray-900 dark:text-white">{ent.name}</span>
                      <span className="text-[10px] font-mono font-bold text-[#ff5e1f] bg-[#ff5e1f]/10 border border-[#ff5e1f]/20 px-2 py-0.5 rounded-full">Prisma Model</span>
                    </div>
                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{ent.desc}</p>
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
            <div className="p-5 sm:p-6 space-y-4">
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
                  <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100/80 dark:hover:bg-[#16181d] transition-colors gap-2 font-mono text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#ff5e1f] font-mono">{mod.route}</span>
                        <span className="text-[11px] text-gray-400 font-mono">[{mod.file}]</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{mod.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 hidden md:block" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: SaaS Business Rules */}
          {activeTab === 'rules' && (
            <div className="p-5 sm:p-6 space-y-4">
              <h2 className="text-base font-bold font-sans text-gray-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#ff5e1f]" />
                Rumus Bisnis SaaS & Standard Perhitungan
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-2">
                  <span className="font-bold font-sans text-sm text-gray-900 dark:text-white block">Count QTY Pages</span>
                  <p className="text-xs font-mono text-gray-600 dark:text-gray-300">
                    Formula: <code className="bg-white dark:bg-[#0d0e12] border border-[#f0f0f0] dark:border-[#272a34] px-1.5 py-0.5 rounded font-mono text-[#ff5e1f]">qty_submit * pages</code> per task.
                  </p>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    Menghitung total volume aktual halaman yang dikerjakan desainer.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-2">
                  <span className="font-bold font-sans text-sm text-gray-900 dark:text-white block">Aturan Designer Status Resign</span>
                  <p className="text-xs font-mono text-gray-600 dark:text-gray-300">
                    Logika: <code className="bg-white dark:bg-[#0d0e12] border border-[#f0f0f0] dark:border-[#272a34] px-1.5 py-0.5 rounded font-mono text-emerald-600 dark:text-emerald-400">status === 'Resign' → Payroll = 0</code>.
                  </p>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    Desainer yang mengundurkan diri mendapatkan badge merah coret dan pembayaran diset strictly 0.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-2">
                  <span className="font-bold font-sans text-sm text-gray-900 dark:text-white block">Base Template Pages</span>
                  <p className="text-xs font-mono text-gray-600 dark:text-gray-300">
                    Formula: <code className="bg-white dark:bg-[#0d0e12] border border-[#f0f0f0] dark:border-[#272a34] px-1.5 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">MAX(pages)</code> pada grouped query.
                  </p>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    Mengambil nilai statis dari ukuran doctype dasar (misal @12Pages).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-2">
                  <span className="font-bold font-sans text-sm text-gray-900 dark:text-white block">Dynamic Period Labels</span>
                  <p className="text-xs font-mono text-gray-600 dark:text-gray-300">
                    Format: <code className="bg-white dark:bg-[#0d0e12] border border-[#f0f0f0] dark:border-[#272a34] px-1.5 py-0.5 rounded font-mono text-[#ff5e1f]">Doctype created &lt;Bulan-Tahun&gt;</code>.
                  </p>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    Label judul pada board disesuaikan secara dinamis dengan filter bulan yang dipilih pengguna.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Notion Sync Engine */}
          {activeTab === 'sync' && (
            <div className="p-5 sm:p-6 space-y-4">
              <h2 className="text-base font-bold font-sans text-gray-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#ff5e1f]" />
                Mekanisme & Workflow Notion Sync Engine
              </h2>
              <div className="space-y-3 text-xs font-mono text-gray-600 dark:text-gray-300">
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
            <div className="p-5 sm:p-6 space-y-4">
              <h2 className="text-base font-bold font-sans text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#ff5e1f]" />
                Catatan Gotchas & Aturan Layout Pencegah Bug
              </h2>
              <div className="space-y-3">
                {[
                  { title: 'Preservasi Directive "use client"', level: 'High', desc: 'Komponen yang menggunakan React Hooks wajib memiliki directive "use client" di paling atas file agar tidak memicu build error RSC.' },
                  { title: 'Prisma Decimal & Date Serialization', level: 'High', desc: 'Field Decimal Prisma diserialisasi dengan JSON.parse(JSON.stringify()) sebelum dikirim ke Client Component, dan field Date dispesifikasikan coercion getTime().' },
                  { title: 'Prevensi Overflow Clipping', level: 'Medium', desc: 'Jangan tempatkan absolute floating UI (dropdown/tooltip) di dalam kontainer yang menggunakan overflow-hidden/scroll.' },
                  { title: 'Prevensi Stacking Context Trap', level: 'Medium', desc: 'Hindari opacity, transform, atau backdrop-blur pada kontainer induk yang membungkus floating UI agar z-index tidak terperangkap.' },
                  { title: 'Cloudflare Checkbox Contrast Inversion', level: 'Medium', desc: 'Native & custom checkboxes mengikuti kontras Cloudflare. Mode Terang: bg-black border-black text-white. Mode Gelap: bg-white border-white text-black.' },
                  { title: 'Cloudflare Translucent Pill Badges', level: 'Info', desc: 'Badge statistik (WorkloadWidget, QACard) menggunakan font-mono text-[10px] font-bold uppercase dengan 10% opacity background & 20% border.' },
                  { title: 'Sidebar Mini Rail Default Desktop', level: 'Info', desc: 'Pada layar desktop, sidebar selalu berada dalam status mini icon rail (~72px) di flow flex, tidak pernah di-unmount.' },
                ].map((iss, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-sans text-sm text-gray-900 dark:text-white">{iss.title}</span>
                      <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                        iss.level === 'High' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400' :
                        iss.level === 'Medium' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400' :
                        'bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400'
                      }`}>{iss.level} Priority</span>
                    </div>
                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1">{iss.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 7: Session Handover Log */}
          {activeTab === 'handover' && (
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold font-sans text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-[#ff5e1f]" />
                  Log Handover Konteks Sesi LLM & Editor
                </h2>
                <span className="text-xs text-gray-400 font-mono">Last Log: 2026-08-31 14:15 WIB</span>
              </div>

              <div className="p-4 rounded-xl bg-[#ff5e1f]/5 border border-[#ff5e1f]/20 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-bold font-sans text-sm text-gray-900 dark:text-white">Active Task & State</span>
                </div>
                <p className="text-xs font-mono text-gray-600 dark:text-gray-300 leading-relaxed">
                  Standarisasi Cloudflare Checkboxes, Unified Filter Toolbar, Translucent Badges, &amp; Knowledge Graph Protocol selesai dilaksanakan. Seluruh file pengetahuan dan log handover ter-update di <code className="bg-white dark:bg-[#0d0e12] border border-[#f0f0f0] dark:border-[#272a34] px-1.5 py-0.5 rounded font-mono text-[#ff5e1f]">docs/knowledge/session-handover.md</code>.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">Historical Session Notes</span>
                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-2 text-xs font-mono text-gray-600 dark:text-gray-300">
                  <p className="font-bold font-sans text-gray-900 dark:text-white">1. Cloudflare Checkbox Contrast Inversion Rule</p>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed">Native &amp; custom checkboxes diselaraskan ke aturan kontras Cloudflare (Light mode: Kotak Hitam + Checkmark Putih; Dark mode: Kotak Putih + Checkmark Hitam).</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-2 text-xs font-mono text-gray-600 dark:text-gray-300">
                  <p className="font-bold font-sans text-gray-900 dark:text-white">2. Unified Filter Toolbar Approval Payroll</p>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed">Restrukturisasi toolbar dengan pencarian di kiri, Sort dropdown, Filter popover 2-stage (Kategori -&gt; Item), chips filter aktif, dan batch actions di kanan.</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-[#16181d]/50 border border-[#f0f0f0] dark:border-[#272a34] space-y-2 text-xs font-mono text-gray-600 dark:text-gray-300">
                  <p className="font-bold font-sans text-gray-900 dark:text-white">3. Standarisasi Translucent Pill Badges &amp; Metrics</p>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed">Badge statistik pada WorkloadWidget, ApprovedProfileOnlyWidget, LeaderboardWidget, dan QACard menggunakan <code className="text-[#ff5e1f]">font-mono text-[10px] font-bold uppercase rounded-full</code> dengan 10% opacity background &amp; 20% border.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
