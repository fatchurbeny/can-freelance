'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Mail, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  Filter, 
  ChevronDown, 
  Inbox,
  Check
} from 'lucide-react';
import { 
  getEmailNotificationsAction, 
  updateEmailNotificationStatusAction, 
  syncCanvaEmailsAction 
} from '@/app/actions/email-notification';
import { cleanTemplateTitle } from '@/lib/canva-email-parser';

interface Account {
  id: string;
  displayName: string;
  color?: string | null;
}

interface NotificationItem {
  id: string;
  messageId: string;
  subject: string;
  sender: string;
  recipient?: string | null;
  receivedAt: string;
  brandName?: string | null;
  accountId?: string | null;
  templateTitle?: string | null;
  templateUrl?: string | null;
  issueMessages: string[];
  rawBody?: string | null;
  status: 'UNRESOLVED' | 'RESOLVED';
  account?: Account | null;
}

interface Props {
  accounts: Account[];
}

export default function EmailNotificationView({ accounts }: Props) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [allNotifications, setAllNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filters
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('UNRESOLVED');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dropdown States
  const [brandOpen, setBrandOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const brandRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const isBrandMatch = (itemBrand?: string | null, accName?: string | null) => {
    if (!itemBrand || !accName) return false;
    const b1 = itemBrand.toLowerCase().trim();
    const b2 = accName.toLowerCase().trim();
    if (b1 === b2) return true;
    if ((b1.includes('uicreative') || b1.includes('ui creative')) && (b2.includes('uicreative') || b2.includes('ui creative'))) return true;
    return false;
  };

  const visibleIssueMessages = (item: NotificationItem) =>
    (item.issueMessages || [])
      .filter((msg) => {
        const value = msg.trim();
        if (!value || value.length > 420) return false;
        if (item.brandName && value.toLowerCase() === item.brandName.toLowerCase()) return false;
        if (item.templateTitle && value.toLowerCase() === item.templateTitle.toLowerCase()) return false;
        return !/(^<!doctype|^<html|^<head|^<meta|^#outlook|unsubscribe|privacy policy|canva pty|template-baseline-review-criteria|creator resources|you.?re receiving|what.?s next|read more|edit template https?:)/i.test(value);
      })
      .slice(0, 6);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) {
        setBrandOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [allRes, filteredRes] = await Promise.all([
        getEmailNotificationsAction({ status: 'ALL', brandName: 'ALL' }),
        getEmailNotificationsAction({
          brandName: selectedBrand,
          status: selectedStatus,
          search: searchQuery,
        }),
      ]);

      if (allRes.success && allRes.notifications) {
        setAllNotifications(allRes.notifications);
      }
      if (filteredRes.success && filteredRes.notifications) {
        setNotifications(filteredRes.notifications);
      }
    } catch (err) {
      console.error('Failed to load email notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [selectedBrand, selectedStatus, searchQuery]);

  const handleSyncEmail = async () => {
    try {
      setSyncing(true);
      await syncCanvaEmailsAction();
      await fetchNotifications();
    } catch (err) {
      console.error('Email sync error:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: 'UNRESOLVED' | 'RESOLVED') => {
    const nextStatus = currentStatus === 'UNRESOLVED' ? 'RESOLVED' : 'UNRESOLVED';
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: nextStatus } : n))
    );
    setAllNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: nextStatus } : n))
    );

    const res = await updateEmailNotificationStatusAction(id, nextStatus);
    if (!res.success) {
      await fetchNotifications();
    }
  };

  // Group stats per Brand from allNotifications
  const brandStats = accounts.map((acc) => {
    const accNotifications = allNotifications.filter(
      (n) => isBrandMatch(n.brandName, acc.displayName) || n.accountId === acc.id
    );
    const unresolvedCount = accNotifications.filter((n) => n.status === 'UNRESOLVED').length;
    return {
      account: acc,
      total: accNotifications.length,
      unresolved: unresolvedCount,
    };
  });

  const otherNotifications = allNotifications.filter((n) => {
    if (!n.brandName) return true;
    return !accounts.some((acc) => isBrandMatch(n.brandName, acc.displayName) || n.accountId === acc.id);
  });
  const otherUnresolvedCount = otherNotifications.filter((n) => n.status === 'UNRESOLVED').length;

  const totalUnresolved = allNotifications.filter((n) => n.status === 'UNRESOLVED').length;
  const totalEmailsCount = allNotifications.length;

  const brandOptions = [
    { value: 'ALL', label: 'ALL Canva Accounts' },
    ...accounts.map((a) => ({ value: a.displayName, label: a.displayName })),
    { value: 'OTHER', label: 'Other Brands' },
  ];

  const statusOptions = [
    { value: 'UNRESOLVED', label: 'STATUS: Unresolved Issues' },
    { value: 'RESOLVED', label: 'STATUS: Resolved' },
    { value: 'ALL', label: 'STATUS: All Emails' },
  ];

  return (
    <div className="w-full flex flex-col font-sans bg-white dark:bg-[#0d0e12]">
      {/* STICKY 2-ROW HEADER SECTION (Image 1) */}
      <div className="sticky top-[96px] z-30 bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] border-b border-[#f0f0f0] dark:border-[#272a34] shadow-sm">
        {/* ROW 1: Search Toolbar */}
        <div className="h-11 pl-3.5 flex items-stretch divide-x divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">
          {/* Search Cell */}
          <div className="flex-1 flex items-center gap-2 pr-4">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search email subject, template name, brand, or issue message..."
              className="w-full bg-transparent text-xs font-sans text-gray-900 dark:text-white outline-none placeholder:text-gray-400"
            />
          </div>

          {/* Custom Cloudflare Brand Filter Dropdown */}
          <div className="relative h-full flex items-stretch" ref={brandRef}>
            <button
              type="button"
              onClick={() => setBrandOpen(!brandOpen)}
              className="h-full px-4 flex items-center gap-2 text-xs font-sans font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#16181d] transition-colors cursor-pointer outline-none"
            >
              <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>{selectedBrand === 'ALL' ? 'ALL Canva Accounts' : (selectedBrand === 'OTHER' || selectedBrand === 'Other Brands' ? 'Other Brands' : selectedBrand)}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${brandOpen ? 'rotate-180' : ''}`} />
            </button>

            {brandOpen && (
              <div className="absolute left-0 top-full z-50 mt-0 min-w-[200px] overflow-hidden rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-xl font-sans text-xs">
                <div className="space-y-0.5">
                  {brandOptions.map((opt) => {
                    const isSelected = selectedBrand === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSelectedBrand(opt.value);
                          setBrandOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-none text-left text-xs font-sans transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]'
                        }`}
                      >
                        <span>{opt.label}</span>
                        <div
                          className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all shrink-0 ${
                            isSelected
                              ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black'
                              : 'border-gray-300 dark:border-[#343846] bg-white dark:bg-[#16181d]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Custom Cloudflare Status Filter Dropdown */}
          <div className="relative h-full flex items-stretch" ref={statusRef}>
            <button
              type="button"
              onClick={() => setStatusOpen(!statusOpen)}
              className="h-full px-4 flex items-center gap-2 text-xs font-sans font-bold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-[#16181d] transition-colors cursor-pointer outline-none"
            >
              <span>{statusOptions.find((o) => o.value === selectedStatus)?.label || 'STATUS: Unresolved Issues'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
            </button>

            {statusOpen && (
              <div className="absolute left-0 top-full z-50 mt-0 min-w-[220px] overflow-hidden rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-xl font-sans text-xs">
                <div className="space-y-0.5">
                  {statusOptions.map((opt) => {
                    const isSelected = selectedStatus === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSelectedStatus(opt.value);
                          setStatusOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-none text-left text-xs font-sans transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]'
                        }`}
                      >
                        <span>{opt.label}</span>
                        <div
                          className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all shrink-0 ${
                            isSelected
                              ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black'
                              : 'border-gray-300 dark:border-[#343846] bg-white dark:bg-[#16181d]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Far-Right SYNC EMAIL Action Button (Full Flush Cell) */}
          <button
            type="button"
            onClick={handleSyncEmail}
            disabled={syncing}
            className="h-full px-5 flex items-center justify-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider bg-[#ff5e1f] hover:bg-[#ff7038] text-white transition-colors cursor-pointer shrink-0 border-l border-[#f0f0f0] dark:border-[#272a34] disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'SYNCING...' : 'SYNC EMAIL'}</span>
          </button>
        </div>


        {/* ROW 2: Sub-Header Bar (Left 3 cols vs Right 9 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#f0f0f0] dark:divide-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50">
          <div className="lg:col-span-3 px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-sans font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
              CANVA ACCOUNTS (BRAND)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#ff5e1f]/10 text-[#ff5e1f] text-[10px] font-sans font-bold">
              {totalUnresolved} Issues
            </span>
          </div>

          <div className="lg:col-span-9 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#ff5e1f]" />
              <span className="font-bold text-gray-900 dark:text-white">
                Canva Publish Issue Inbox ({notifications.length} Email Notifications)
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
              <span>Filter: <strong className="text-gray-800 dark:text-gray-200">{selectedBrand}</strong></span>
              <span>Status: <strong className="text-gray-800 dark:text-gray-200">{selectedStatus}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* SPLIT VIEW BODY (Fixed Sidebar Left + Independent Scrollable Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
        {/* LEFT COLUMN: Fixed Canva Account Sidebar (Image 2) */}
        <div className="lg:col-span-3 sticky top-[184px] h-[calc(100vh-184px)] overflow-y-auto shrink-0 bg-gray-50/50 dark:bg-[#16181d]/30 divide-y divide-[#f0f0f0] dark:divide-[#272a34] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
            {/* Option: ALL Brands */}
            <button
              type="button"
              onClick={() => setSelectedBrand('ALL')}
              className={`w-full px-4 py-2.5 flex items-center justify-between text-xs font-sans transition-colors text-left cursor-pointer ${
                selectedBrand === 'ALL'
                  ? 'bg-white dark:bg-[#16181d] text-[#ff5e1f] font-bold border-l-2 border-[#ff5e1f]'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-[#16181d]/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-gray-400" />
                <span>All Canva Accounts</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200/60 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {totalEmailsCount || notifications.length}
              </span>
            </button>

            {/* Account List */}
            {brandStats.map(({ account, unresolved }) => {
              const isSelected = isBrandMatch(selectedBrand, account.displayName);
              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => setSelectedBrand(account.displayName)}
                  className={`w-full px-4 py-2.5 flex items-center justify-between text-xs font-sans transition-colors text-left cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-[#16181d] text-gray-900 dark:text-white font-bold border-l-2 border-[#ff5e1f]'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-[#16181d]/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: account.color || '#ff5e1f' }}
                    />
                    <span className="truncate">{account.displayName}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {unresolved > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        {unresolved}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Option: Other Brands */}
            <button
              type="button"
              onClick={() => setSelectedBrand('OTHER')}
              className={`w-full px-4 py-2.5 flex items-center justify-between text-xs font-sans transition-colors text-left cursor-pointer ${
                selectedBrand === 'OTHER' || selectedBrand === 'Other Brands'
                  ? 'bg-white dark:bg-[#16181d] text-[#ff5e1f] font-bold border-l-2 border-[#ff5e1f]'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-[#16181d]/60'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate pr-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-gray-400 dark:bg-gray-500" />
                <span className="truncate">Other Brands</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {otherUnresolvedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    {otherUnresolvedCount}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200/60 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  {otherNotifications.length}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Scrollable & Compact Email Body Cards (Image 3) */}
        <div className="lg:col-span-9 h-[calc(100vh-184px)] overflow-y-auto bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-xs font-sans text-gray-500">
              <RefreshCw className="w-6 h-6 text-[#ff5e1f] animate-spin" />
              <span>Loading Canva issue emails...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-xs font-sans text-gray-500 text-center">
              <Mail className="w-10 h-10 text-gray-300 dark:text-gray-600" />
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">Belum Ada Email Notification Canva</h4>
                <p className="mt-1 max-w-sm text-gray-500 dark:text-gray-400">
                  Tidak ada email Canva publish issue yang cocok dengan filter aktif. Klik tombol <strong className="text-gray-800 dark:text-gray-200">SYNC EMAIL</strong> untuk mengambil pesan email terbaru.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSyncEmail}
                disabled={syncing}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-sans font-bold uppercase tracking-wider bg-[#ff5e1f] hover:bg-[#ff7038] text-white rounded transition-colors cursor-pointer shadow-sm disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'SYNCING INBOX...' : 'SYNC EMAIL SEKARANG'}</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
              {notifications.map((item) => {
                const isResolved = item.status === 'RESOLVED';
                const issues = visibleIssueMessages(item);
                const displayBrand = item.brandName && /uicreative/i.test(item.brandName) ? 'UICreative.net' : item.brandName || 'Canva Account';
                const displayTitle = cleanTemplateTitle(item.templateTitle || item.subject, displayBrand);

                return (
                  <div
                    key={item.id}
                    className={`p-5 space-y-4 transition-colors border-b border-[#f0f0f0] dark:border-[#272a34] ${
                      isResolved ? 'bg-gray-50/40 dark:bg-[#16181d]/20 opacity-75' : 'bg-white dark:bg-[#0d0e12]'
                    }`}
                  >
                    {/* Row 1: Top Action Row (Tags + Mark Fixed Button) */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          PUBLISH ISSUE
                        </span>

                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            isResolved
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item.id, item.status)}
                        className={`px-3 py-1.5 text-xs font-sans font-bold uppercase tracking-wider rounded-md border transition-colors cursor-pointer ${
                          isResolved
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-200'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                      >
                        {isResolved ? 'Mark Unresolved' : 'MARK FIXED / RESOLVED'}
                      </button>
                    </div>

                    {/* Row 2: Main Headline */}
                    <div>
                      <h3 className="text-sm font-bold font-sans text-gray-900 dark:text-white">
                        We’ve found some issues with your template
                      </h3>
                    </div>

                    {/* Row 3: Template Title (Above Brand Name) & Edit CTA */}
                    <div className="p-4 rounded-xl border border-gray-200 dark:border-[#272a34] bg-gray-50/60 dark:bg-[#16181d]/50 flex items-center justify-between gap-4 shadow-2xs">
                      <div className="space-y-1 min-w-0 flex-1">
                        {/* Template title above brand name */}
                        <div className="text-sm font-bold font-sans text-gray-900 dark:text-white truncate">
                          {displayTitle}
                        </div>
                        {/* Brand name/canva account subtitle */}
                        <div className="text-xs font-medium font-sans text-gray-500 dark:text-gray-400 truncate">
                          {displayBrand}
                        </div>
                      </div>

                      {item.templateUrl && (
                        <a
                          href={item.templateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-lg bg-[#8b3dff] hover:bg-[#7a2eff] text-white text-xs font-bold font-sans flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
                        >
                          <span>Edit Template</span>
                        </a>
                      )}
                    </div>

                    {/* Row 4: Issues Section */}
                    <div className="space-y-2.5 pt-1">
                      <h4 className="text-xs font-bold font-sans text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        ISSUES
                      </h4>

                      {issues.length > 0 ? (
                        <div className="space-y-2.5">
                          {issues.map((msg, idx) => {
                            const [title, description] = msg.split(/\s+—\s+(.+)/);
                            return (
                              <div
                                key={idx}
                                className="p-3.5 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-xs font-sans"
                              >
                                <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <div className="space-y-1 flex-1 min-w-0 leading-relaxed">
                                  {description ? (
                                    <>
                                      <div className="font-bold text-gray-900 dark:text-white text-xs">
                                        {title}
                                      </div>
                                      <div className="text-gray-700 dark:text-gray-300 text-[11px] leading-normal">
                                        {description}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="font-medium text-gray-900 dark:text-white text-xs">
                                      {msg}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3.5 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-sans text-gray-800 dark:text-gray-200">
                          Issues reported by Canva Quality Review team.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
