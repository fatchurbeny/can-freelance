import { PrismaClient } from '@prisma/client';
import { getDoctypes } from '@/lib/queries';
import { getLatestSyncStatus } from '@/app/actions/sync';

export const dynamic = 'force-dynamic';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { Plus, Gavel, Calendar, Edit3, Banknote } from 'lucide-react';

export default async function RateCardPage() {
  const doctypes = await getDoctypes();
  const latestSyncLog = await getLatestSyncStatus();

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F5F0EB] dark:bg-[#0a0b0e] text-gray-900 dark:text-gray-100 transition-colors">
      <Sidebar currentSyncLog={latestSyncLog} />

      <main className="flex-1 p-6 md:p-8 space-y-8 overflow-x-hidden">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#E8E0D8] dark:border-gray-800">
          <div>
            <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white">
              Rate Card Configurations
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Atur tarif bayaran dasar per halaman (QTY) desainer berdasarkan format output doctype.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-medium shadow-sm">
              IS
            </div>
          </div>
        </div>

        {/* Contract Rules Banner */}
        <div className="glass dark:bg-[#111827] border border-[#E8E0D8] dark:border-gray-800 p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 text-white p-2.5 rounded-lg shrink-0">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Ketentuan & aturan kontrak freelance
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                kontrak dimulai sejak 26 januari 2026
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>Kalender : <strong className="font-semibold text-gray-900 dark:text-white">25 hari kerja/bulan</strong></span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Banknote className="w-4 h-4 text-indigo-500" />
              <span>rate/poll : <strong className="font-bold text-gray-900 dark:text-white">iDR 15.000</strong></span>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold font-display text-gray-900 dark:text-white">
              Doctype Price and pool Configurations
            </h2>
            <button disabled className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors opacity-50 cursor-not-allowed">
              <Plus className="w-4 h-4" />
              Add Rate Card
            </button>
          </div>

          <div className="glass dark:bg-[#111827] rounded-xl border border-[#E8E0D8] dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Doctype</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Rate/Pages</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Pool Rate</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Pages</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Last Update</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E0D8] dark:divide-gray-800">
                  {doctypes.map((doctype) => (
                    <tr 
                      key={doctype.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-sm"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {doctype.notionKey}
                      </td>
                      <td className="px-4 py-3 text-center text-indigo-600 dark:text-indigo-400 font-medium">
                        IDR 15.000
                      </td>
                      <td className="px-4 py-3 text-center text-green-600 dark:text-green-400 font-medium">
                        {doctype.poolRate}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                        {doctype.pages ?? 1}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                        Last Update
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button disabled className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-md transition-colors opacity-50 cursor-not-allowed">
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit Rate
                        </button>
                      </td>
                    </tr>
                  ))}
                  {doctypes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        Belum ada doctype yang tersedia. Silakan sync dengan Notion terlebih dahulu.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
