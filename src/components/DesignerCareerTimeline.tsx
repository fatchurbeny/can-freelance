'use client';

import { useEffect, useState } from 'react';
import { Trophy, Award, Calendar, CircleDot, Plus, Check, Star, Milestone } from 'lucide-react';
import toast from 'react-hot-toast';
import { addCareerLogAction, getDesignerCareerLogsAction, promoteDesignerAction } from '@/app/actions/designer';
import DatePickerCell from './DatePickerCell';
import RoleSelectCell from './RoleSelectCell';
import EventTypeSelectCell from './EventTypeSelectCell';

export interface CareerLogItem {
  id: string;
  designerId: string;
  eventType: 'PROMOTION' | 'CONTRACT_CHANGE' | 'ACHIEVEMENT' | 'STATUS_CHANGE';
  title: string;
  description?: string | null;
  eventDate: string;
  createdAt: string;
}

interface DesignerProps {
  id: string;
  displayName: string;
  role?: string | null;
  status: string;
  contractType?: string | null;
  contractStartDate?: string | null;
  probationEndDate?: string | null;
  promotionDate?: string | null;
  approved?: number;
  templates?: number;
  pages?: number;
  isLeaderboardWinner?: boolean;
}

export default function DesignerCareerTimeline({ designer }: { designer: DesignerProps }) {
  const [logs, setLogs] = useState<CareerLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for manual log addition & promotion
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEventType, setNewEventType] = useState<'ACHIEVEMENT' | 'PROMOTION' | 'CONTRACT_CHANGE' | 'STATUS_CHANGE'>('PROMOTION');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [promotedRole, setPromotedRole] = useState(designer.role || 'Senior Designer');
  const [saving, setSaving] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    const res = await getDesignerCareerLogsAction(designer.id);
    if (res.success && res.logs) {
      setLogs(res.logs);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [designer.id]);

  const handleAddLog = async () => {
    const finalTitle = newEventType === 'PROMOTION'
      ? (newTitle.trim() || `Promosi Jabatan: ${promotedRole}`)
      : newTitle.trim();

    if (!finalTitle) {
      toast.error('Judul achievement/event wajib diisi.');
      return;
    }

    setSaving(true);

    if (newEventType === 'PROMOTION') {
      const promoteRes = await promoteDesignerAction({
        designerId: designer.id,
        newRole: promotedRole,
        promotionDate: newEventDate,
      });

      if (!promoteRes.success) {
        toast.error(promoteRes.error || 'Gagal memperbarui status promosi.');
        setSaving(false);
        return;
      }
    }

    const res = await addCareerLogAction({
      designerId: designer.id,
      eventType: newEventType,
      title: finalTitle,
      description: newDescription,
      eventDate: newEventDate,
    });
    setSaving(false);

    if (res.success) {
      toast.success(newEventType === 'PROMOTION' ? `Desainer berhasil dipromosikan sebagai ${promotedRole}!` : 'Pencapaian karir berhasil ditambahkan!');
      setNewTitle('');
      setNewDescription('');
      setShowAddForm(false);
      fetchLogs();
    } else {
      toast.error(res.error || 'Gagal menambahkan log karir.');
    }
  };

  // Construct System-Generated Milestones
  const systemMilestones: CareerLogItem[] = [];

  // 1. Leaderboard Winner Badge
  if (designer.isLeaderboardWinner) {
    systemMilestones.push({
      id: 'sys-leaderboard',
      designerId: designer.id,
      eventType: 'ACHIEVEMENT',
      title: '🏆 Leaderboard All-Time Champion #1',
      description: `Mencapai peringkat #1 Desainer Terbaik dengan ${designer.approved || 0} Task Disetujui!`,
      eventDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    });
  }

  // 2. High Pages Volume Milestones
  if ((designer.pages || 0) >= 1000) {
    systemMilestones.push({
      id: 'sys-pages-1000',
      designerId: designer.id,
      eventType: 'ACHIEVEMENT',
      title: '🌟 Milestone: 1,000+ Total Pages Produced',
      description: `Berhasil menyelesaikan ${designer.pages} Halaman Desain Canva secara kumulatif.`,
      eventDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    });
  } else if ((designer.pages || 0) >= 500) {
    systemMilestones.push({
      id: 'sys-pages-500',
      designerId: designer.id,
      eventType: 'ACHIEVEMENT',
      title: '⭐ Milestone: 500+ Total Pages Produced',
      description: `Berhasil menyelesaikan ${designer.pages} Halaman Desain.`,
      eventDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    });
  }

  // 3. Promotion Log
  if (designer.role && designer.role !== 'Junior Designer' && designer.promotionDate) {
    systemMilestones.push({
      id: 'sys-promotion',
      designerId: designer.id,
      eventType: 'PROMOTION',
      title: `🎖️ Promosi Jabatan: ${designer.role}`,
      description: `Promosi aktif sebagai ${designer.role} sejak ${new Date(designer.promotionDate).toLocaleDateString('id-ID')}`,
      eventDate: designer.promotionDate,
      createdAt: designer.promotionDate,
    });
  }

  // 4. Contract Start Log
  if (designer.contractStartDate) {
    systemMilestones.push({
      id: 'sys-contract',
      designerId: designer.id,
      eventType: 'CONTRACT_CHANGE',
      title: `📄 Kontrak Dimulai: ${designer.contractType || 'Freelance'}`,
      description: designer.contractType === 'Probation'
        ? `Masa Probation 3 Bulan dimulai. Estimasi Berakhir: ${designer.probationEndDate ? new Date(designer.probationEndDate).toLocaleDateString('id-ID') : '3 Bulan'}`
        : `Resmi bergabung sebagai desainer ${designer.contractType}.`,
      eventDate: designer.contractStartDate,
      createdAt: designer.contractStartDate,
    });
  }

  // Merge DB logs and system milestones
  const allTimelineItems = [...logs, ...systemMilestones].sort(
    (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  );

  return (
    <div className="p-4 font-sans space-y-4">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0] dark:border-[#272a34]">
        <div>
          <h3 className="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Milestone className="w-4 h-4 text-[#ff5e1f]" />
            <span>Timeline Karir & Milestone</span>
          </h3>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-sans mt-0.5">
            Histori promosi, pencapaian leaderboard, dan rekam jejak performa
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-[#ff5e1f] hover:bg-[#ff7038] text-white font-sans text-xs font-bold uppercase transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Tambah Milestone</span>
        </button>
      </div>

      {/* Manual Add Log Form Drawer */}
      {showAddForm && (
        <div className="p-3.5 border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 space-y-3">
          <span className="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-wider block">
            Catat Achievement / Milestone Kustom
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <EventTypeSelectCell
              value={newEventType}
              onChange={(val) => setNewEventType(val)}
            />

            {newEventType === 'PROMOTION' ? (
              <RoleSelectCell
                value={promotedRole}
                onChange={(r) => setPromotedRole(r)}
              />
            ) : (
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Judul Pencapaian (ex: Juara 1 Monthly Report)"
                className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] px-3 py-2 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-[#ff5e1f]"
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Catatan tambahan (opsional)"
              className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] px-3 py-2 font-sans text-xs text-gray-900 dark:text-white outline-none focus:border-[#ff5e1f]"
            />
            <DatePickerCell
              value={newEventDate}
              onChange={(d) => setNewEventDate(d)}
              placeholder="Tanggal Promosi / Event..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-sans text-xs font-bold uppercase hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleAddLog}
              disabled={saving}
              className="px-4 py-1.5 bg-[#ff5e1f] text-white font-sans text-xs font-bold uppercase hover:bg-[#ff7038] transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Log'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Cloudflare Changelog Style Slim Timeline Stream */}
      <div className="relative pl-7 space-y-3 before:absolute before:left-3 before:top-2.5 before:bottom-2.5 before:w-px before:bg-[#f0f0f0] dark:before:bg-[#272a34]">
        {allTimelineItems.length > 0 ? (
          allTimelineItems.map((item, idx) => {
            let icon = <Trophy className="w-3 h-3 text-amber-500" />;
            let badgeBg = 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';

            if (item.eventType === 'PROMOTION') {
              icon = <Award className="w-3 h-3 text-[#ff5e1f]" />;
              badgeBg = 'bg-[#ff5e1f]/10 border-[#ff5e1f]/20 text-[#ff5e1f]';
            } else if (item.eventType === 'CONTRACT_CHANGE') {
              icon = <Calendar className="w-3 h-3 text-indigo-500" />;
              badgeBg = 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400';
            } else if (item.eventType === 'STATUS_CHANGE') {
              icon = <CircleDot className="w-3 h-3 text-emerald-500" />;
              badgeBg = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400';
            }

            const formattedDate = new Date(item.eventDate).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div key={item.id || idx} className="relative group">
                {/* Node Bullet Icon */}
                <div className="absolute -left-[27px] top-1 w-5 h-5 rounded-full border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] flex items-center justify-center shadow-sm">
                  {icon}
                </div>

                {/* Cloudflare Style Changelog Item Box */}
                <div className="p-3 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] hover:border-[#ff5e1f]/40 transition-colors space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded-full border ${badgeBg}`}>
                      {item.eventType}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                      {formattedDate}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs text-gray-900 dark:text-white mt-1">
                    {item.title}
                  </h4>

                  {item.description && (
                    <p className="text-[11px] font-sans text-gray-500 dark:text-gray-400 leading-snug">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-6 text-center text-xs text-gray-400 font-sans">
            Belum ada catatan timeline karir.
          </div>
        )}
      </div>
    </div>
  );
}
