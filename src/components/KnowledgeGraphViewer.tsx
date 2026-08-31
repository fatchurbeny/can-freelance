"use client";

import { useState } from 'react';
import GraphifyVisualizer from './GraphifyVisualizer';
import { 
  Network, 
  Database, 
  Layers, 
  BookOpen, 
  RefreshCw, 
  CheckCircle2, 
  Cpu, 
  FileCode2, 
  Sparkles, 
  ShieldAlert, 
  History, 
  ArrowRight,
  ChevronRight,
  Activity,
  FileText
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
      {/* Top Banner / Header */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-[#E8E0D8] dark:border-gray-800 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white font-display">
                  Knowledge Graph & System Architecture
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Hybrid Synergy
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Peta terstruktur domain, skema data, alur Notion sync, dan log handover konteks antar LLM/editor.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {refreshSuccess && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Knowledge Base Refreshed!
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Scanning AST...' : 'Sync & Refresh Index'}
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#E8E0D8] dark:border-gray-800">
          <div className="bg-gray-50 dark:bg-gray-900/50 p-3.5 rounded-xl border border-gray-200/60 dark:border-gray-800">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block">Total Data Entities</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white font-display">9 Models</span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/50 p-3.5 rounded-xl border border-gray-200/60 dark:border-gray-800">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block">App Modules & Actions</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white font-display">7 Routes & 3 Actions</span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/50 p-3.5 rounded-xl border border-gray-200/60 dark:border-gray-800">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block">Business Logic Rules</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white font-display">4 SaaS Formulas</span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/50 p-3.5 rounded-xl border border-gray-200/60 dark:border-gray-800">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block">Sync & Token Strategy</span>
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-display">On-Demand Token</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-3 scrollbar-none">
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
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap border cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 shadow-sm shadow-indigo-600/10'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-[#E8E0D8] dark:border-gray-800 hover:border-[#615FFF] dark:hover:border-[#615FFF] hover:text-[#615FFF] dark:hover:text-[#615FFF] hover:ring-1 hover:ring-[#615FFF] shadow-sm'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Visual Interactive Knowledge Graph Map */}
      {activeTab === 'visual' && (
        <GraphifyVisualizer />
      )}

      {/* Tab 2: Entities & Schema */}
      {activeTab === 'entities' && (
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-[#E8E0D8] dark:border-gray-800 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 font-display">
            <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
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
              <div key={idx} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200/80 dark:border-gray-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-900 dark:text-white font-mono">{ent.name}</span>
                  <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">Prisma Model</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{ent.desc}</p>
                <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-800">
                  Fields: {ent.fields}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: App Architecture */}
      {activeTab === 'modules' && (
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-[#E8E0D8] dark:border-gray-800 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 font-display">
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Peta Rute App Router & Server Actions
          </h2>
          <div className="space-y-3">
            {[
              { route: '/', file: 'src/app/page.tsx', desc: 'Dashboard utama KPI, tren volume, & workload desainer.' },
              { route: '/production', file: 'src/app/production/page.tsx', desc: 'Board Kanban produksi dengan drag-drop & filter multi-bulan.' },
              { route: '/billing-statement', file: 'src/app/billing-statement/page.tsx', desc: 'Persetujuan payroll desainer & cetak otomatis billing statement.' },
              { route: '/knowledge-graph', file: 'src/app/knowledge-graph/page.tsx', desc: 'Dashboard visual Knowledge Graph & penjelajah dokumen pengetahuan.' },
              { route: '/rate-card', file: 'src/app/rate-card/page.tsx', desc: 'Pengaturan tarif kontrak per desainer/doctype.' },
              { route: '/account-team', file: 'src/app/account-team/page.tsx', desc: 'Manajemen akun desainer & status keanggotaan.' },
              { route: '/notion-config', file: 'src/app/notion-config/page.tsx', desc: 'Pengaturan ketersediaan database Notion ID & secret key.' },
            ].map((mod, idx) => (
              <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200/80 dark:border-gray-800 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400 font-mono">{mod.route}</span>
                    <span className="text-[11px] text-gray-500 font-mono">[{mod.file}]</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{mod.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: SaaS Business Rules */}
      {activeTab === 'rules' && (
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-[#E8E0D8] dark:border-gray-800 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 font-display">
            <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Rumus Bisnis SaaS & Standard Perhitungan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-2">
              <span className="font-bold text-sm text-indigo-950 dark:text-indigo-200 block">Count QTY Pages</span>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Formula: <code className="bg-white dark:bg-black px-1.5 py-0.5 rounded font-mono text-indigo-600 dark:text-indigo-400">qty_submit * pages</code> per task.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Menghitung total volume aktual halaman yang dikerjakan desainer.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
              <span className="font-bold text-sm text-emerald-950 dark:text-emerald-200 block">Aturan Designer Status Resign</span>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Logika: <code className="bg-white dark:bg-black px-1.5 py-0.5 rounded font-mono text-emerald-600 dark:text-emerald-400">status === 'Resign' → Payroll = 0</code>.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Desainer yang mengundurkan diri mendapatkan badge merah coret dan pembayaran diset strictly 0.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-2">
              <span className="font-bold text-sm text-blue-950 dark:text-blue-200 block">Base Template Pages</span>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Formula: <code className="bg-white dark:bg-black px-1.5 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">MAX(pages)</code> pada grouped query.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Mengambil nilai statis dari ukuran doctype dasar (misal @12Pages).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 space-y-2">
              <span className="font-bold text-sm text-purple-950 dark:text-purple-200 block">Dynamic Period Labels</span>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Format: <code className="bg-white dark:bg-black px-1.5 py-0.5 rounded font-mono text-purple-600 dark:text-purple-400">Doctype created &lt;Bulan-Tahun&gt;</code>.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Label judul pada board disesuaikan secara dinamis dengan filter bulan yang dipilih pengguna.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Notion Sync Engine */}
      {activeTab === 'sync' && (
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-[#E8E0D8] dark:border-gray-800 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 font-display">
            <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Mekanisme & Workflow Notion Sync Engine
          </h2>
          <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200/80 dark:border-gray-800 space-y-2">
              <span className="font-bold text-sm text-gray-900 dark:text-white">1. Full Sync vs Incremental Cron Sync</span>
              <p>Manual Sync yang dipicu pengguna dari tombol UI menggunakan mode <code className="text-indigo-600 dark:text-indigo-400 font-mono">full</code> untuk merekonsiliasi seluruh tugas, status, dan halaman yang dihapus. Background Cron menggunakan mode <code className="text-indigo-600 dark:text-indigo-400 font-mono">incremental</code> untuk polling perubahan cepat.</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200/80 dark:border-gray-800 space-y-2">
              <span className="font-bold text-sm text-gray-900 dark:text-white">2. Notion Rich Text & Title Parsing</span>
              <p>Notion memecah teks menjadi beberapa segmen jika formatnya bervariasi. Selalu gunakan <code className="text-indigo-600 dark:text-indigo-400 font-mono">.map(t =&gt; t.plain_text).join(&apos;&apos;)</code> agar tidak ada segmen judul yang terpotong.</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200/80 dark:border-gray-800 space-y-2">
              <span className="font-bold text-sm text-gray-900 dark:text-white">3. Pemetaan Status & Alias Case-Insensitive</span>
              <p>Sistem memetakan status Notion secara cerdas dengan mencakup varian title-case, lowercase, serta alias QA (<code className="text-indigo-600 dark:text-indigo-400 font-mono">QA</code>, <code className="text-indigo-600 dark:text-indigo-400 font-mono">Q&amp;A</code>, <code className="text-indigo-600 dark:text-indigo-400 font-mono">In QA</code>) ke entitas <code className="text-indigo-600 dark:text-indigo-400 font-mono">DesignStatus</code> kanonikal.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Gotchas & Issues */}
      {activeTab === 'issues' && (
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-[#E8E0D8] dark:border-gray-800 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 font-display">
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            Catatan Gotchas & Aturan Layout Pencegah Bug
          </h2>
          <div className="space-y-3">
            {[
              { title: 'Preservasi Directive "use client"', level: 'High', desc: 'Komponen yang menggunakan React Hooks wajib memiliki directive "use client" di paling atas file agar tidak memicu build error RSC.' },
              { title: 'Prisma Decimal & Date Serialization', level: 'High', desc: 'Field Decimal Prisma diserialisasi dengan JSON.parse(JSON.stringify()) sebelum dikirim ke Client Component, dan field Date dispesifikasikan coercion getTime().' },
              { title: 'Prevensi Overflow Clipping', level: 'Medium', desc: 'Jangan tempatkan absolute floating UI (dropdown/tooltip) di dalam kontainer yang menggunakan overflow-hidden/scroll.' },
              { title: 'Prevensi Stacking Context Trap', level: 'Medium', desc: 'Hindari opacity, transform, atau backdrop-blur pada kontainer induk yang membungkus floating UI agar z-index tidak terperangkap.' },
              { title: 'Sidebar Mini Rail Default Desktop', level: 'Info', desc: 'Pada layar desktop, sidebar selalu berada dalam status mini icon rail (~72px) di flow flex, tidak pernah di-unmount.' },
            ].map((iss, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200/80 dark:border-gray-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-900 dark:text-white">{iss.title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    iss.level === 'High' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                    iss.level === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                    'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  }`}>{iss.level} Priority</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{iss.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 7: Session Handover Log */}
      {activeTab === 'handover' && (
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-[#E8E0D8] dark:border-gray-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 font-display">
              <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Log Handover Konteks Sesi LLM & Editor
            </h2>
            <span className="text-xs text-gray-500 font-mono">Last Log: 2026-08-29 20:55 WIB</span>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-sm text-indigo-950 dark:text-indigo-200">Active Task & State</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Implementasi Knowledge Graph & Session Handover System (Hybrid Synergy) selesai dibangun. Seluruh file dokumentasi pengetahuan berada di <code className="bg-white dark:bg-black px-1.5 py-0.5 rounded font-mono text-indigo-600 dark:text-indigo-400">docs/knowledge/</code> dan terintegrasi dengan antarmuka web UI di rute <code className="bg-white dark:bg-black px-1.5 py-0.5 rounded font-mono text-indigo-600 dark:text-indigo-400">/knowledge-graph</code>.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Historical Session Notes</span>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200/80 dark:border-gray-800 space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <p className="font-semibold text-gray-900 dark:text-white">1. Pembersihan Root Directory & Aturan Kebersihan Workspace</p>
              <p>11 file debug &amp; log di root folder dihapus. Ditambahkan <code className="font-mono text-indigo-600 dark:text-indigo-400">workspace-cleanliness-rule</code> di <code className="font-mono">AGENTS.md</code> agar skrip sementara diletakkan di <code className="font-mono">./scratch/</code>.</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200/80 dark:border-gray-800 space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <p className="font-semibold text-gray-900 dark:text-white">2. Penggantian Menu Sidebar & Rute Halaman</p>
              <p>Menu <code className="font-mono text-indigo-600 dark:text-indigo-400">Analytics &amp; Reports</code> diubah menjadi <code className="font-mono text-indigo-600 dark:text-indigo-400">Knowledge Graph</code> yang mengarah ke rute <code className="font-mono text-indigo-600 dark:text-indigo-400">/knowledge-graph</code>.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
