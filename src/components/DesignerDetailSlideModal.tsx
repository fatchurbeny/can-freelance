'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UserCheck, Calendar, Award, Mail, Phone, CreditCard, Save, FileSpreadsheet, CircleDot, FileText, CheckCircle2, LayoutGrid, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { promoteDesignerAction, updateDesignerProfileAction, updateDesignerStatusAction } from '@/app/actions/designer';
import DatePickerCell from './DatePickerCell';
import RoleSelectCell from './RoleSelectCell';
import BankSelectCell from './BankSelectCell';
import DesignerCareerTimeline from './DesignerCareerTimeline';

export interface DesignerItem {
  id: string;
  displayName: string;
  role?: string | null;
  status: string;
  contractType?: string | null;
  contractStartDate?: string | null;
  probationEndDate?: string | null;
  inactiveStartDate?: string | null;
  inactiveNote?: string | null;
  resignDate?: string | null;
  promotionDate?: string | null;
  email?: string | null;
  phone?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  approved?: number;
  templates?: number;
  pages?: number;
  specializations?: string[];
  specializationText?: string;
}

interface Props {
  open: boolean;
  designer: DesignerItem | null;
  initialTab?: 'profile' | 'timeline';
  onClose: () => void;
}

function addThreeMonths(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setMonth(d.getMonth() + 3);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function DesignerDetailSlideModal({ open, designer, initialTab = 'profile', onClose }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'timeline'>(initialTab);
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('Junior Designer');
  const [status, setStatus] = useState('Active');
  const [contractType, setContractType] = useState('Freelance');

  const todayIso = new Date().toISOString().split('T')[0];
  const [contractStartDate, setContractStartDate] = useState(todayIso);
  const [probationEndDate, setProbationEndDate] = useState(addThreeMonths(todayIso));
  const [inactiveStartDate, setInactiveStartDate] = useState(todayIso);
  const [inactiveNote, setInactiveNote] = useState('');
  const [resignDate, setResignDate] = useState(todayIso);
  const [promotionDate, setPromotionDate] = useState(todayIso);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bankName, setBankName] = useState('BCA');
  const [bankAccount, setBankAccount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setActiveTab(initialTab || 'profile');
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !designer) return;
    const todayStr = new Date().toISOString().split('T')[0];
    setDisplayName(designer.displayName || '');
    setRole(designer.role || 'Junior Designer');
    setStatus(designer.status || 'Active');
    setContractType(designer.contractType || 'Freelance');

    const cStart = designer.contractStartDate ? new Date(designer.contractStartDate).toISOString().split('T')[0] : todayStr;
    setContractStartDate(cStart);

    const pEnd = designer.probationEndDate ? new Date(designer.probationEndDate).toISOString().split('T')[0] : addThreeMonths(cStart);
    setProbationEndDate(pEnd);

    const inStart = designer.inactiveStartDate ? new Date(designer.inactiveStartDate).toISOString().split('T')[0] : todayStr;
    setInactiveStartDate(inStart);
    setInactiveNote(designer.inactiveNote || '');

    const rDate = designer.resignDate ? new Date(designer.resignDate).toISOString().split('T')[0] : todayStr;
    setResignDate(rDate);

    const promDate = designer.promotionDate ? new Date(designer.promotionDate).toISOString().split('T')[0] : todayStr;
    setPromotionDate(promDate);

    setEmail(designer.email || '');
    setPhone(designer.phone || '');
    setBankName(designer.bankName || 'BCA');
    setBankAccount(designer.bankAccount || '');
    setSaving(false);
  }, [open, designer]);

  if (!open || !designer) return null;

  const handleContractStartDateChange = (dStr: string) => {
    setContractStartDate(dStr);
    if (contractType === 'Probation') {
      setProbationEndDate(addThreeMonths(dStr));
    }
  };

  const handleContractTypeChange = (newType: string) => {
    setContractType(newType);
    if (newType === 'Probation') {
      setProbationEndDate(addThreeMonths(contractStartDate));
    }
  };

  const handleSave = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast.error('Designer name is required.');
      return;
    }

    setSaving(true);

    // 1. Update Status
    const statusRes = await updateDesignerStatusAction(designer.id, status, {
      inactiveStartDate: status === 'Inactive' ? inactiveStartDate : null,
      inactiveNote: status === 'Inactive' || status === 'Resign' ? inactiveNote : null,
      resignDate: status === 'Resign' ? resignDate : null,
    });

    // 2. Update Profile & Contract
    const profileRes = await updateDesignerProfileAction({
      designerId: designer.id,
      displayName: trimmedName,
      email,
      phone,
      bankName,
      bankAccount,
      contractType,
      contractStartDate,
      probationEndDate: contractType === 'Probation' ? probationEndDate : null,
      role: role.trim(),
    });

    // 3. Update Role & Promotion Date if changed
    if (role.trim() !== (designer.role || 'Junior Designer')) {
      await promoteDesignerAction({
        designerId: designer.id,
        newRole: role.trim(),
        promotionDate,
      });
    }

    setSaving(false);

    if (statusRes.success && profileRes.success) {
      toast.success(`Designer "${trimmedName}" profile updated successfully!`);
      router.refresh();
      onClose();
    } else {
      toast.error(statusRes.error || profileRes.error || 'Failed to update designer profile.');
    }
  };

  const initials = designer.displayName.substring(0, 2).toUpperCase();

  const modalContent = (
    <div className="fixed inset-0 z-70">
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 cursor-pointer"
        aria-label="Close modal"
      />

      {/* Slide-over Container */}
      <div className="absolute right-0 top-0 h-full w-full max-w-150 bg-white dark:bg-[#0d0e12] border-l border-[#f0f0f0] dark:border-[#272a34] shadow-2xl flex flex-col font-sans animate-[slideInRight_180ms_ease-out]">

        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50">
          <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
            <div className="w-10 h-10 rounded-full border border-[#f0f0f0] dark:border-[#272a34] bg-[#ff5e1f]/10 text-[#ff5e1f] font-bold text-sm flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="font-sans text-base font-bold text-gray-900 dark:text-white tracking-wider truncate">
                  {designer.displayName}
                </h2>
                <span className={`px-2 py-0.5 text-[9px] font-sans font-bold uppercase rounded ${
                  status === 'Active'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : status === 'Resign'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}>
                  {status}
                </span>
              </div>
              <p className="text-xs font-sans text-gray-500 dark:text-gray-400 truncate">
                {role || 'Junior Designer'} • {contractType || 'Freelance'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex size-8 shrink-0 items-center justify-center rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick SaaS Performance KPI Row */}
        <div className="grid grid-cols-3 divide-x divide-[#f0f0f0] dark:divide-[#272a34] border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/30 dark:bg-[#16181d]/30 text-center py-3 px-2 font-sans text-xs shrink-0">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Approved Tasks</span>
            <span className="text-sm font-bold text-indigo-600 dark:text-[#ff5e1f] mt-0.5 block">{designer.approved || 0}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Templates QTY</span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">{designer.templates || 0}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Pages</span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">{designer.pages || 0}</span>
          </div>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-stretch border-b border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] shrink-0 font-sans text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`relative flex-1 py-2.5 px-4 text-center font-sans text-xs transition-colors cursor-pointer outline-none focus:outline-none focus-visible:outline-none select-none border-r border-[#f0f0f0] dark:border-[#272a34] ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-[#16181d] text-gray-900 dark:text-white font-bold'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#16181d] font-medium'
            }`}
          >
            <span>1. Profil & Edit Data</span>
            {activeTab === 'profile' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff5e1f]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`relative flex-1 py-2.5 px-4 text-center font-sans text-xs transition-colors cursor-pointer outline-none focus:outline-none focus-visible:outline-none select-none ${
              activeTab === 'timeline'
                ? 'bg-white dark:bg-[#16181d] text-gray-900 dark:text-white font-bold'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#16181d] font-medium'
            }`}
          >
            <span>2. Timeline Karir & Logs</span>
            {activeTab === 'timeline' && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff5e1f]" />
            )}
          </button>
        </div>

        {/* Main Form Body / Timeline View */}
        <div className="min-h-0 flex-1 overflow-y-auto p-0 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-[#272a34]">
          {activeTab === 'timeline' ? (
            <DesignerCareerTimeline designer={designer} />
          ) : (
            <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">

            {/* Row 1: Display Name */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                <span>Nama Designer</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nama Lengkap Designer"
                  className="w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors"
                />
              </div>
            </div>

            {/* Row 2: Role / Jabatan */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Award className="w-3.5 h-3.5 text-gray-400" />
                <span>Role / Jabatan</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <RoleSelectCell
                  value={role}
                  onChange={setRole}
                  placeholder="Pilih Role / Jabatan..."
                />
              </div>
            </div>

            {/* Row 3: Contract Type */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <FileSpreadsheet className="w-3.5 h-3.5 text-gray-400" />
                <span>Jenis Kontrak</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <div className="grid grid-cols-3 divide-x divide-[#f0f0f0] dark:divide-[#272a34] w-full h-full min-h-[44px] items-stretch">
                  {['Probation', 'Freelance', 'Fulltime'].map((ct) => {
                    const isSelected = contractType === ct;
                    return (
                      <button
                        key={ct}
                        type="button"
                        onClick={() => handleContractTypeChange(ct)}
                        className={`h-full min-h-[44px] px-2 font-sans text-xs font-bold uppercase transition-colors cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {ct}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Row 4: Contract Start Date */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>Contract Start</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <DatePickerCell
                  value={contractStartDate}
                  onChange={handleContractStartDateChange}
                  placeholder="Pilih Start Date..."
                />
              </div>
            </div>

            {/* Row 4b: Probation End Date */}
            {contractType === 'Probation' && (
              <div className="flex items-stretch text-xs font-sans min-h-[44px]">
                <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-indigo-500/10 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-indigo-600 dark:text-indigo-400 select-none">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Probation End</span>
                </div>
                <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                  <DatePickerCell
                    value={probationEndDate}
                    onChange={(d) => setProbationEndDate(d)}
                    placeholder="Probation End Date (3 Bulan)..."
                  />
                </div>
              </div>
            )}

            {/* Row 5: Status Designer */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <CircleDot className="w-3.5 h-3.5 text-gray-400" />
                <span>Status Designer</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <div className="grid grid-cols-3 divide-x divide-[#f0f0f0] dark:divide-[#272a34] w-full h-full min-h-[44px] items-stretch">
                  {['Active', 'Inactive', 'Resign'].map((st) => {
                    const isSelected = status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatus(st)}
                        className={`h-full min-h-[44px] px-2 font-sans text-xs font-bold uppercase transition-colors cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? st === 'Active'
                              ? 'bg-emerald-600 text-white font-bold'
                              : st === 'Resign'
                              ? 'bg-rose-600 text-white font-bold'
                              : 'bg-amber-600 text-white font-bold'
                            : 'bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Conditional: Inactive Info */}
            {status === 'Inactive' && (
              <>
                <div className="flex items-stretch text-xs font-sans min-h-[44px]">
                  <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-amber-500/10 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-amber-600 dark:text-amber-400 select-none">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Inactive Date</span>
                  </div>
                  <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                    <DatePickerCell
                      value={inactiveStartDate}
                      onChange={(d) => setInactiveStartDate(d)}
                      placeholder="Tanggal Inactive..."
                    />
                  </div>
                </div>
                <div className="flex items-stretch text-xs font-sans min-h-[44px]">
                  <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-amber-500/10 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-amber-600 dark:text-amber-400 select-none">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Inactive Note</span>
                  </div>
                  <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                    <input
                      type="text"
                      value={inactiveNote}
                      onChange={(e) => setInactiveNote(e.target.value)}
                      placeholder="Alasan tidak aktif (Cuti / Sakit / Hold)"
                      className="w-full h-full min-h-[44px] rounded-none border-0 bg-amber-500/5 dark:bg-amber-500/10 px-5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Conditional: Resign Info */}
            {status === 'Resign' && (
              <>
                <div className="flex items-stretch text-xs font-sans min-h-[44px]">
                  <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-rose-500/10 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-rose-600 dark:text-rose-400 select-none">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Resign Date</span>
                  </div>
                  <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                    <DatePickerCell
                      value={resignDate}
                      onChange={(d) => setResignDate(d)}
                      placeholder="Tanggal Resign..."
                    />
                  </div>
                </div>
                <div className="flex items-stretch text-xs font-sans min-h-[44px]">
                  <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-rose-500/10 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-rose-600 dark:text-rose-400 select-none">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Catatan Resign</span>
                  </div>
                  <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                    <input
                      type="text"
                      value={inactiveNote}
                      onChange={(e) => setInactiveNote(e.target.value)}
                      placeholder="Catatan / Alasan Resign..."
                      className="w-full h-full min-h-[44px] rounded-none border-0 bg-rose-500/5 dark:bg-rose-500/10 px-5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-rose-500 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Row 7: Email & Phone */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <span>Email & Phone</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <div className="grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34] w-full h-full min-h-[44px] items-stretch">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@domain.com"
                    className="w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-4 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors"
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-4 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Row 8: Bank & Rekening */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                <span>Bank & Rekening</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <div className="grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34] w-full h-full min-h-[44px] items-stretch">
                  <BankSelectCell
                    value={bankName}
                    onChange={setBankName}
                    placeholder="Pilih Bank..."
                  />
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="Nomor Rekening"
                    className="w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-4 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors"
                  />
                </div>
              </div>
            </div>

          </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34] shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-12 bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] font-sans text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!displayName.trim() || saving}
            className="h-12 bg-[#ff5e1f] hover:bg-[#ff7038] disabled:opacity-50 disabled:cursor-not-allowed font-sans text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>{saving ? 'Saving Profile...' : 'Save Profile Changes'}</span>
          </button>
        </div>

      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
