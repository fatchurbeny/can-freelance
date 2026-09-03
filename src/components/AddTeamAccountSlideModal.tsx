'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Users, Building2, FileText, CircleDot, Mail, Calendar, Phone, CreditCard, Award, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { createDesignerAction, createAccountAction } from '@/app/actions/designer';
import DatePickerCell from './DatePickerCell';
import RoleSelectCell from './RoleSelectCell';
import BankSelectCell from './BankSelectCell';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
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

export default function AddTeamAccountSlideModal({ open, onClose, onCreated }: Props) {
  const router = useRouter();
  const [category, setCategory] = useState<'designer' | 'account'>('designer');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string>('Active');
  const [role, setRole] = useState('Junior Designer');
  const [contractType, setContractType] = useState('Freelance');
  
  const todayIso = new Date().toISOString().split('T')[0];
  const [contractStartDate, setContractStartDate] = useState(todayIso);
  const [probationEndDate, setProbationEndDate] = useState(addThreeMonths(todayIso));
  const [inactiveStartDate, setInactiveStartDate] = useState(todayIso);
  const [inactiveNote, setInactiveNote] = useState('');
  const [resignDate, setResignDate] = useState(todayIso);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bankName, setBankName] = useState('BCA');
  const [bankAccount, setBankAccount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      const initialStart = new Date().toISOString().split('T')[0];
      setName('');
      setStatus('Active');
      setRole('Junior Designer');
      setContractType('Freelance');
      setContractStartDate(initialStart);
      setProbationEndDate(addThreeMonths(initialStart));
      setInactiveStartDate(initialStart);
      setInactiveNote('');
      setResignDate(initialStart);
      setEmail('');
      setPhone('');
      setBankName('BCA');
      setBankAccount('');
      setSaving(false);
    }
  }, [open]);

  const handleContractStartDateChange = (newDateStr: string) => {
    setContractStartDate(newDateStr);
    if (contractType === 'Probation') {
      setProbationEndDate(addThreeMonths(newDateStr));
    }
  };

  const handleContractTypeChange = (newType: string) => {
    setContractType(newType);
    if (newType === 'Probation') {
      setProbationEndDate(addThreeMonths(contractStartDate));
    }
  };

  if (!open) return null;

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error(category === 'designer' ? 'Designer name is required' : 'Brand account name is required');
      return;
    }

    setSaving(true);
    let res: { success: boolean; error?: string };

    if (category === 'designer') {
      res = await createDesignerAction({
        displayName: trimmedName,
        status,
        role: role.trim() || 'Junior Designer',
        contractType,
        contractStartDate,
        probationEndDate: contractType === 'Probation' ? probationEndDate : null,
        inactiveStartDate: status === 'Inactive' ? inactiveStartDate : null,
        inactiveNote: status === 'Inactive' ? inactiveNote : null,
        resignDate: status === 'Resign' ? resignDate : null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        bankName: bankName.trim() || null,
        bankAccount: bankAccount.trim() || null,
      });
    } else {
      res = await createAccountAction({ displayName: trimmedName });
    }

    setSaving(false);

    if (res.success) {
      toast.success(category === 'designer' ? `Designer "${trimmedName}" added successfully!` : `Brand Account "${trimmedName}" added successfully!`);
      router.refresh();
      onCreated?.();
      onClose();
    } else {
      toast.error(res.error || 'Failed to save record.');
    }
  };

  const handlePreview = email.trim()
    ? email.trim()
    : name.trim()
    ? `${name.trim().toLowerCase().replace(/\s+/g, '')}@improstd.com`
    : 'username@improstd.com';

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
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-sans text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider truncate">
                Add Team / Account
              </h2>
              <p className="text-[10px] font-sans text-gray-500 dark:text-gray-400 truncate">
                {category === 'designer' ? 'Add new Designer with contract dates & payment details' : 'Add new Canva Account (Brand)'}
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

        {/* Main Form Body — Edge-to-Edge Continuous 2-Column Symmetrical Grid */}
        <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-[#f0f0f0] dark:divide-[#272a34] p-0 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-[#272a34]">
          <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">

            {/* Row 1: Category Selection */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                {category === 'designer' ? <Users className="w-3.5 h-3.5 text-gray-400" /> : <Building2 className="w-3.5 h-3.5 text-gray-400" />}
                <span>Category</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <div className="grid grid-cols-2 divide-x divide-[#f0f0f0] dark:divide-[#272a34] w-full h-full min-h-[44px] items-stretch">
                  <button
                    type="button"
                    onClick={() => setCategory('designer')}
                    className={`h-full min-h-[44px] px-3 font-sans text-xs font-bold uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      category === 'designer'
                        ? 'bg-[#ff5e1f] text-white font-bold'
                        : 'bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Designer (Team)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('account')}
                    className={`h-full min-h-[44px] px-3 font-sans text-xs font-bold uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      category === 'account'
                        ? 'bg-[#ff5e1f] text-white font-bold'
                        : 'bg-gray-50/50 dark:bg-[#16181d]/50 hover:bg-gray-100 dark:hover:bg-[#16181d] text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Canva Account</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Display Name Input */}
            <div className="flex items-stretch text-xs font-sans min-h-[44px]">
              <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <span>Display Name</span>
              </div>
              <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={category === 'designer' ? 'ex: Putery or Beny' : 'ex: Chital Graphic'}
                  className="w-full h-full min-h-[44px] rounded-none border-0 bg-gray-50/50 dark:bg-[#16181d]/50 px-5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-[#ff5e1f] transition-colors"
                />
              </div>
            </div>

            {/* Designer Specific Fields */}
            {category === 'designer' && (
              <>
                {/* Row 3: Role / Jabatan */}
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

                {/* Row 4: Contract Type */}
                <div className="flex items-stretch text-xs font-sans min-h-[44px]">
                  <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-gray-400" />
                    <span>Contract Type</span>
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

                {/* Row 5: Contract Start Date (via DatePickerCell) */}
                <div className="flex items-stretch text-xs font-sans min-h-[44px]">
                  <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>Contract Start</span>
                  </div>
                  <div className="flex-1 p-0 flex items-stretch min-h-[44px] bg-white dark:bg-[#0d0e12]">
                    <DatePickerCell
                      value={contractStartDate}
                      onChange={handleContractStartDateChange}
                      placeholder="Select Start Date..."
                    />
                  </div>
                </div>

                {/* Row 5b: Probation End Date (Only when Contract Type === 'Probation') */}
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
                        placeholder="Select End Date..."
                      />
                    </div>
                  </div>
                )}

                {/* Row 6: Status Selector */}
                <div className="flex items-stretch text-xs font-sans min-h-[44px]">
                  <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-sans font-bold text-gray-500 dark:text-gray-400 select-none">
                    <CircleDot className="w-3.5 h-3.5 text-gray-400" />
                    <span>Status</span>
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

                {/* Conditional Row: Inactive Details */}
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
                          placeholder="Select Inactive Date..."
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
                          placeholder="Alasan tidak aktif (misal: Cuti / Sakit / Hold)"
                          className="w-full h-full min-h-[44px] rounded-none border-0 bg-amber-500/5 dark:bg-amber-500/10 px-5 font-sans text-xs font-bold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#16181d] focus:ring-1 focus:ring-amber-500 transition-colors"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Conditional Row: Resign Date & Resign Note */}
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
                          placeholder="Select Resign Date..."
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

                {/* Row 8: Bank Details */}
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
              </>
            )}

          </div>
        </div>

        {/* Action Footer — 2-Column Symmetrical Row */}
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
            disabled={!name.trim() || saving}
            className="h-12 bg-[#ff5e1f] hover:bg-[#ff7038] disabled:opacity-50 disabled:cursor-not-allowed font-sans text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{saving ? 'Saving...' : category === 'designer' ? 'Save Designer' : 'Save Account'}</span>
          </button>
        </div>

      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
