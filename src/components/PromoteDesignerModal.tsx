'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Award, Calendar, UserCheck, Mail, Phone, CreditCard, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { promoteDesignerAction, updateDesignerProfileAction } from '@/app/actions/designer';
import DatePickerCell from './DatePickerCell';
import RoleSelectCell from './RoleSelectCell';
import BankSelectCell from './BankSelectCell';

interface DesignerItem {
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
}

interface Props {
  open: boolean;
  designer: DesignerItem | null;
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

export default function PromoteDesignerModal({ open, designer, onClose }: Props) {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [promotionDate, setPromotionDate] = useState(new Date().toISOString().split('T')[0]);
  const [contractType, setContractType] = useState('Freelance');
  const [contractStartDate, setContractStartDate] = useState('');
  const [probationEndDate, setProbationEndDate] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bankName, setBankName] = useState('BCA');
  const [bankAccount, setBankAccount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !designer) return;
    const todayStr = new Date().toISOString().split('T')[0];
    setRole(designer.role || 'Junior Designer');
    setPromotionDate(designer.promotionDate ? new Date(designer.promotionDate).toISOString().split('T')[0] : todayStr);
    setContractType(designer.contractType || 'Freelance');
    const cStart = designer.contractStartDate ? new Date(designer.contractStartDate).toISOString().split('T')[0] : todayStr;
    setContractStartDate(cStart);
    const pEnd = designer.probationEndDate ? new Date(designer.probationEndDate).toISOString().split('T')[0] : addThreeMonths(cStart);
    setProbationEndDate(pEnd);
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

  const handleSavePromotion = async () => {
    if (!role.trim()) {
      toast.error('Role/Jabatan is required.');
      return;
    }

    setSaving(true);
    const promoteRes = await promoteDesignerAction({
      designerId: designer.id,
      newRole: role.trim(),
      promotionDate,
    });

    const profileRes = await updateDesignerProfileAction({
      designerId: designer.id,
      displayName: designer.displayName,
      email,
      phone,
      bankName,
      bankAccount,
      contractType,
      contractStartDate,
      probationEndDate: contractType === 'Probation' ? probationEndDate : null,
      role: role.trim(),
    });
    setSaving(false);

    if (promoteRes.success && profileRes.success) {
      toast.success(`Designer "${designer.displayName}" details updated successfully!`);
      router.refresh();
      onClose();
    } else {
      toast.error(promoteRes.error || profileRes.error || 'Failed to update designer details.');
    }
  };

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
      <div className="absolute right-0 top-0 h-full w-full max-w-140 bg-white dark:bg-[#0d0e12] border-l border-[#f0f0f0] dark:border-[#272a34] shadow-2xl flex flex-col font-sans animate-[slideInRight_180ms_ease-out]">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50">
          <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
            <div className="w-8 h-8 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-[#ff5e1f] flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-sans text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider truncate">
                Promote / Edit {designer.displayName}
              </h2>
              <p className="text-[10px] font-sans text-gray-500 dark:text-gray-400 truncate">
                Update role, promotion date, contract & payment details
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

        {/* Main Form Body */}
        <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-[#f0f0f0] dark:divide-[#272a34] p-0 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-[#272a34]">
          <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">

            {/* Row 1: Current Status & Name Badge */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                <span>Designer Status</span>
              </div>
              <div className="flex-1 px-5 py-3 flex items-center justify-between min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <span className="font-bold text-gray-900 dark:text-white text-sm">{designer.displayName}</span>
                <span className={`px-2.5 py-1 text-[10px] font-sans font-bold uppercase rounded ${
                  designer.status === 'Active'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : designer.status === 'Resign'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}>
                  {designer.status}
                </span>
              </div>
            </div>

            {/* Row 2: Role / Jabatan Baru */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Award className="w-3.5 h-3.5 text-[#ff5e1f]" />
                <span className="text-[#ff5e1f]">Jabatan / Role</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <RoleSelectCell
                  value={role}
                  onChange={setRole}
                  placeholder="Pilih Role Baru / Jabatan..."
                />
              </div>
            </div>

            {/* Row 3: Tanggal Aktif Promosi */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>Tanggal Promosi</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <DatePickerCell
                  value={promotionDate}
                  onChange={(d) => setPromotionDate(d)}
                  placeholder="Select Promotion Date..."
                />
              </div>
            </div>

            {/* Row 4: Contract Type & Start Date */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>Contract & Start</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <div className="grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34] w-full h-full min-h-[44px] items-stretch">
                  <select
                    value={contractType}
                    onChange={(e) => {
                      setContractType(e.target.value);
                      if (e.target.value === 'Probation') {
                        setProbationEndDate(addThreeMonths(contractStartDate));
                      }
                    }}
                    className="w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-4 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] cursor-pointer"
                  >
                    <option value="Probation">Probation</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Fulltime">Fulltime</option>
                  </select>
                  <DatePickerCell
                    value={contractStartDate}
                    onChange={handleContractStartDateChange}
                    placeholder="Contract Start Date..."
                  />
                </div>
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
                    placeholder="Probation End Date (3 Months)..."
                  />
                </div>
              </div>
            )}

            {/* Row 5: Email & Phone */}
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

            {/* Row 6: Bank & Rekening */}
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

            {/* Readonly Historical Info */}
            {(designer.inactiveNote || designer.inactiveStartDate || designer.resignDate) && (
              <div className="p-5 bg-gray-50/50 dark:bg-[#16181d]/50 space-y-2 border-t border-[#f0f0f0] dark:border-[#272a34] font-sans text-xs">
                <span className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block text-[10px]">
                  Catatan Status & Tanggal Log
                </span>
                {designer.inactiveStartDate && (
                  <p className="text-amber-600 dark:text-amber-400 font-medium">
                    • Inactive sejak: {new Date(designer.inactiveStartDate).toLocaleDateString('id-ID')}
                    {designer.inactiveNote ? ` (${designer.inactiveNote})` : ''}
                  </p>
                )}
                {designer.resignDate && (
                  <p className="text-rose-600 dark:text-rose-400 font-medium">
                    • Resign sejak: {new Date(designer.resignDate).toLocaleDateString('id-ID')}
                  </p>
                )}
              </div>
            )}

          </div>
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
            onClick={handleSavePromotion}
            disabled={!role.trim() || saving}
            className="h-12 bg-[#ff5e1f] hover:bg-[#ff7038] disabled:opacity-50 disabled:cursor-not-allowed font-sans text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>{saving ? 'Saving...' : 'Save Promotion & Details'}</span>
          </button>
        </div>

      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
