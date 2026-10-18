'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mail, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Inbox,
  Check,
  Sliders,
  SlidersHorizontal,
  CheckCircle2,
  Square,
  CheckSquare,
  ChevronsDownUp,
  ChevronsUpDown,
  ExternalLink,
  X
} from 'lucide-react';
import { 
  getEmailNotificationsAction, 
  updateEmailNotificationStatusAction, 
  syncCanvaEmailsAction,
  getSyncSubjectTriggersAction
} from '@/app/actions/email-notification';
import { cleanTemplateTitle } from '@/lib/canva-email-parser';
import SyncSubjectSettingsSlideModal, { SubjectTriggerItem } from './SyncSubjectSettingsSlideModal';

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

type Category = 'publish' | 'rejected' | 'library';

function getEmailCategory(subject?: string | null): Category {
  const s = (subject || '').toLowerCase();
  if (s.includes('not been added') || s.includes('not added') || s.includes('rejected')) {
    return 'rejected';
  }
  if (s.includes('added to the canva library') || s.includes('library')) {
    return 'library';
  }
  return 'publish';
}

const CATEGORY_CONFIG: Record<Category, {
  label: string;
  triggerSubject: string;
  activeColor: string;
  activeBgClass: string;
  inactiveTextClass: string;
  badgeBgClass: string;
  badgeTextClass: string;
  badgeBorderClass: string;
  Icon: any;
}> = {
  publish: {
    label: 'PUBLISH ISSUE',
    triggerSubject: "We've found some issues with your template",
    activeColor: '#e11d48',
    activeBgClass: 'bg-[#e11d48] text-white border-[#e11d48]',
    inactiveTextClass: 'text-[#e11d48]',
    badgeBgClass: 'bg-rose-500/10',
    badgeTextClass: 'text-rose-600 dark:text-rose-400',
    badgeBorderClass: 'border-rose-500/20',
    Icon: AlertTriangle,
  },
  rejected: {
    label: 'TEMPLATE REJECTED',
    triggerSubject: 'Your template has not been added to Canva',
    activeColor: '#b91c1c',
    activeBgClass: 'bg-[#b91c1c] text-white border-[#b91c1c]',
    inactiveTextClass: 'text-[#b91c1c]',
    badgeBgClass: 'bg-red-500/10',
    badgeTextClass: 'text-red-700 dark:text-red-400',
    badgeBorderClass: 'border-red-500/20',
    Icon: AlertTriangle,
  },
  library: {
    label: 'LIBRARY PUBLISHED',
    triggerSubject: 'Your template has been added to the Canva library',
    activeColor: '#059669',
    activeBgClass: 'bg-[#059669] text-white border-[#059669]',
    inactiveTextClass: 'text-[#059669]',
    badgeBgClass: 'bg-emerald-500/10',
    badgeTextClass: 'text-emerald-600 dark:text-emerald-400',
    badgeBorderClass: 'border-emerald-500/20',
    Icon: CheckCircle2,
  },
};

export default function EmailNotificationView({ accounts }: Props) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [allNotifications, setAllNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filters
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('UNRESOLVED');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI Interactive States
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [closedCats, setClosedCats] = useState<Record<string, boolean>>({});
  const [openIssues, setOpenIssues] = useState<Record<string, boolean>>({});
  const [allCollapsed, setAllCollapsed] = useState(false);

  // Slide Modal State
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [activeTriggers, setActiveTriggers] = useState<SubjectTriggerItem[]>([]);

  // Dynamic Sticky Measurement
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const [railTop, setRailTop] = useState(140);

  useEffect(() => {
    const el = stickyHeaderRef.current;
    if (!el) return;
    const measure = () => setRailTop(56 + el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const fetchTriggers = async () => {
    try {
      const res = await getSyncSubjectTriggersAction();
      if (res.success && res.triggers) {
        setActiveTriggers(res.triggers.filter((t: any) => t.isActive));
      }
    } catch (e) {
      console.error('Failed fetching triggers in view:', e);
    }
  };

  useEffect(() => {
    fetchTriggers();
  }, []);

  // Dropdown States
  const [brandOpen, setBrandOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreFilterOpen, setMoreFilterOpen] = useState(false);
  const brandRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const moreFilterRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const categorySliderRef = useRef<HTMLDivElement>(null);

  const slideCategories = (direction: 'left' | 'right') => {
    if (categorySliderRef.current) {
      categorySliderRef.current.scrollBy({
        left: direction === 'left' ? -220 : 220,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const isBrandMatch = (itemBrand?: string | null, accName?: string | null) => {
    if (!itemBrand || !accName) return false;
    const b1 = itemBrand.toLowerCase().trim();
    const b2 = accName.toLowerCase().trim();
    if (b1 === b2) return true;
    if ((b1.includes('uicreative') || b1.includes('ui creative')) && (b2.includes('uicreative') || b2.includes('ui creative'))) return true;
    if ((b1.includes('impro') || b1.includes('impro studio')) && (b2.includes('impro') || b2.includes('improstd'))) return true;
    return false;
  };

  const visibleIssueMessages = (item: NotificationItem) => {
    if (getEmailCategory(item.subject) === 'library') return [];
    return (item.issueMessages || [])
      .filter((msg) => {
        const value = msg.trim();
        if (!value || value.length > 420) return false;
        if (value.includes('Inspect raw email body for full details')) return false;
        if (item.brandName && value.toLowerCase() === item.brandName.toLowerCase()) return false;
        if (item.templateTitle && value.toLowerCase() === item.templateTitle.toLowerCase()) return false;
        return !/(^<!doctype|^<html|^<head|^<meta|^#outlook|unsubscribe|privacy policy|canva pty|template-baseline-review-criteria|creator resources|you.?re receiving|what.?s next|read more|edit template https?:)/i.test(value);
      })
      .slice(0, 6);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) {
        setBrandOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
      if (moreFilterRef.current && !moreFilterRef.current.contains(e.target as Node)) {
        setMoreFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const effectiveStatus = (selectedCategory === 'rejected' || selectedCategory === 'library') ? 'ALL' : selectedStatus;
      const [allRes, filteredRes] = await Promise.all([
        getEmailNotificationsAction({ status: 'ALL', brandName: 'ALL' }),
        getEmailNotificationsAction({
          brandName: selectedBrand,
          status: effectiveStatus,
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
  }, [selectedBrand, selectedCategory, selectedStatus, searchQuery]);

  // Clear selections when filters change per design spec
  useEffect(() => {
    setSelectedIds({});
  }, [selectedBrand, selectedCategory, selectedStatus]);

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

  const handleBulkResolve = async () => {
    const targetIds = Object.keys(selectedIds).filter((id) => selectedIds[id]);
    if (targetIds.length === 0) return;

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (targetIds.includes(n.id) ? { ...n, status: 'RESOLVED' } : n))
    );
    setAllNotifications((prev) =>
      prev.map((n) => (targetIds.includes(n.id) ? { ...n, status: 'RESOLVED' } : n))
    );
    setSelectedIds({});

    try {
      await Promise.all(
        targetIds.map((id) => updateEmailNotificationStatusAction(id, 'RESOLVED'))
      );
    } catch (err) {
      console.error('Bulk resolve error:', err);
      await fetchNotifications();
    }
  };

  // Group stats per Brand from allNotifications
  const brandStats = accounts.map((acc) => {
    const accNotifications = allNotifications.filter(
      (n) => isBrandMatch(n.brandName, acc.displayName) || (!n.brandName && n.accountId === acc.id)
    );
    const unresolvedCount = accNotifications.filter((n) => n.status === 'UNRESOLVED').length;
    return {
      account: acc,
      total: accNotifications.length,
      unresolved: unresolvedCount,
    };
  });

  const otherNotifications = allNotifications.filter((n) => {
    if (!n.brandName && !n.accountId) return true;
    return !accounts.some(
      (acc) => isBrandMatch(n.brandName, acc.displayName) || (!n.brandName && n.accountId === acc.id)
    );
  });
  const otherUnresolvedCount = otherNotifications.filter((n) => n.status === 'UNRESOLVED').length;

  const totalUnresolved = allNotifications.filter((n) => n.status === 'UNRESOLVED').length;
  const totalEmailsCount = allNotifications.length;

  // Category counts respecting active brand filter
  const categoryCounts = useMemo(() => {
    const brandFiltered = allNotifications.filter((n) => {
      if (selectedBrand === 'ALL') return true;
      if (selectedBrand === 'OTHER' || selectedBrand === 'Other Brands') {
        return otherNotifications.some((on) => on.id === n.id);
      }
      return isBrandMatch(n.brandName, selectedBrand);
    });

    const res: Record<Category | 'ALL', number> = {
      ALL: brandFiltered.length,
      publish: 0,
      rejected: 0,
      library: 0,
    };

    brandFiltered.forEach((n) => {
      const cat = getEmailCategory(n.subject);
      res[cat] = (res[cat] || 0) + 1;
    });

    return res;
  }, [allNotifications, selectedBrand, otherNotifications]);

  // Derived Emails filtered by category
  const filteredNotifications = useMemo(() => {
    let list = notifications;
    if (selectedCategory !== 'ALL') {
      list = list.filter((n) => getEmailCategory(n.subject) === selectedCategory);
    }
    return list;
  }, [notifications, selectedCategory]);

  // Grouped structure for Level 1 (Brand) -> Level 2 (Category Subgroup)
  const groupedData = useMemo(() => {
    const groups: {
      brandKey: string;
      brandName: string;
      account?: Account | null;
      isUnregistered: boolean;
      totalCount: number;
      unresolvedCount: number;
      emails: NotificationItem[];
      categories: {
        category: Category;
        emails: NotificationItem[];
      }[];
    }[] = [];

    // Helper to add brand group
    const addBrandGroup = (key: string, name: string, acc?: Account | null, isUnregistered = false) => {
      let brandEmails: NotificationItem[] = [];
      if (key === 'ALL') {
        brandEmails = filteredNotifications;
      } else if (isUnregistered) {
        brandEmails = filteredNotifications.filter((n) => otherNotifications.some((on) => on.id === n.id));
      } else {
        brandEmails = filteredNotifications.filter(
          (n) => isBrandMatch(n.brandName, name) || (!n.brandName && acc && n.accountId === acc.id)
        );
      }

      if (brandEmails.length === 0) return;

      const catsMap: Record<Category, NotificationItem[]> = {
        publish: [],
        rejected: [],
        library: [],
      };

      brandEmails.forEach((n) => {
        const cat = getEmailCategory(n.subject);
        catsMap[cat].push(n);
      });

      const categories = (['publish', 'rejected', 'library'] as Category[])
        .filter((cat) => catsMap[cat].length > 0)
        .map((cat) => ({
          category: cat,
          emails: catsMap[cat],
        }));

      groups.push({
        brandKey: key,
        brandName: name,
        account: acc,
        isUnregistered,
        totalCount: brandEmails.length,
        unresolvedCount: brandEmails.filter((n) => n.status === 'UNRESOLVED').length,
        emails: brandEmails,
        categories,
      });
    };

    if (selectedBrand === 'ALL') {
      accounts.forEach((acc) => addBrandGroup(acc.id, acc.displayName, acc, false));
      addBrandGroup('OTHER', 'Other Brands', null, true);
    } else if (selectedBrand === 'OTHER' || selectedBrand === 'Other Brands') {
      addBrandGroup('OTHER', 'Other Brands', null, true);
    } else {
      const acc = accounts.find((a) => a.displayName === selectedBrand);
      addBrandGroup(acc?.id || selectedBrand, selectedBrand, acc, false);
    }

    return groups;
  }, [filteredNotifications, selectedBrand, accounts, otherNotifications]);

  const selectedCount = useMemo(() => {
    return Object.values(selectedIds).filter(Boolean).length;
  }, [selectedIds]);

  const toggleSelectAllBrand = (brandEmails: NotificationItem[]) => {
    const actionable = brandEmails.filter((n) => {
      const cat = getEmailCategory(n.subject);
      return cat !== 'rejected' && cat !== 'library';
    });
    if (actionable.length === 0) return;

    const allSelected = actionable.every((n) => selectedIds[n.id]);
    setSelectedIds((prev) => {
      const next = { ...prev };
      actionable.forEach((n) => {
        if (allSelected) {
          delete next[n.id];
        } else {
          next[n.id] = true;
        }
      });
      return next;
    });
  };

  const toggleAllSubgroups = () => {
    const nextState = !allCollapsed;
    setAllCollapsed(nextState);
    const newClosed: Record<string, boolean> = {};
    if (nextState) {
      groupedData.forEach((g) => {
        g.categories.forEach((c) => {
          newClosed[`${g.brandKey}|${c.category}`] = true;
        });
      });
    }
    setClosedCats(newClosed);
  };

  const getTriggerLabel = (subject: string) => {
    const s = subject.toLowerCase().replace(/[\u2018\u2019]/g, "'");
    if (s.includes("issues with your template")) return 'Issues with Template';
    if (s.includes('not been added to canva') || s.includes('not added to canva')) return 'Not Added to Canva';
    if (s.includes('added to the canva library') || s.includes('canva library')) return 'Added to Canva Library';
    return subject.length > 25 ? subject.slice(0, 23) + '…' : subject;
  };

  const getStatusButtonLabel = () => {
    if (selectedStatus === 'UNRESOLVED') return 'STATUS: Unresolved Issues';
    if (selectedStatus === 'RESOLVED') return 'STATUS: Resolved';
    if (selectedStatus === 'ALL') return 'STATUS: All Emails';
    if (selectedStatus.startsWith('TRIGGER:')) {
      const sub = selectedStatus.replace(/^TRIGGER:/, '').trim();
      return `TRIGGER: ${getTriggerLabel(sub)}`;
    }
    return selectedStatus;
  };

  const brandOptions = [
    { value: 'ALL', label: 'ALL Canva Accounts' },
    ...accounts.map((a) => ({ value: a.displayName, label: a.displayName })),
    { value: 'OTHER', label: 'Other Brands' },
  ];

  const resolutionOptions = [
    { value: 'UNRESOLVED', label: 'STATUS: Unresolved Issues' },
    { value: 'RESOLVED', label: 'STATUS: Resolved' },
    { value: 'ALL', label: 'STATUS: All Emails' },
  ];

  return (
    <div className="w-full flex flex-col font-sans bg-white dark:bg-[#0d0e12]">
      {/* STICKY HEADER BLOCK [A] + [B] + [C] */}
      <div 
        ref={stickyHeaderRef}
        className="sticky top-[56px] z-30 bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] border-b border-[#f0f0f0] dark:border-[#272a34] shadow-xs"
      >
        {/* ROW 1 [B]: Expandable Searchbar + Unified More Filters + Full-Height Sync Email */}
        <div className="h-11 flex items-stretch divide-x divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">
          {!searchOpen ? (
            <>
              {/* Left Action 1: Search Trigger Icon Button */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="h-full px-3.5 flex items-center justify-center gap-1.5 text-gray-500 hover:text-[#ff5e1f] hover:bg-gray-50 dark:hover:bg-[#16181d] transition-colors cursor-pointer outline-none shrink-0"
                title="Search emails"
                aria-label="Open search bar"
              >
                <Search className="w-4 h-4" />
                {searchQuery && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e1f]" />
                )}
              </button>

              {/* Left Action 2: Unified More Filters Icon Button (Brand & Status) */}
              <div className="relative h-full flex items-stretch" ref={moreFilterRef}>
                <button
                  type="button"
                  onClick={() => setMoreFilterOpen(!moreFilterOpen)}
                  className={`h-full px-3 sm:px-3.5 flex items-center gap-1.5 text-xs font-sans font-medium transition-colors cursor-pointer outline-none shrink-0 ${
                    moreFilterOpen || selectedBrand !== 'ALL' || selectedStatus !== 'UNRESOLVED'
                      ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#16181d]'
                  }`}
                  title="Filter by Brand & Status"
                  aria-label="Filter options"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                  <span className="hidden sm:inline">Filters</span>
                  {(selectedBrand !== 'ALL' || selectedStatus !== 'UNRESOLVED') && (
                    <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#ff5e1f] text-white text-[10px] font-bold">
                      {(selectedBrand !== 'ALL' ? 1 : 0) + (selectedStatus !== 'UNRESOLVED' ? 1 : 0)}
                    </span>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${moreFilterOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Unified More Filters Dropdown Panel (Cloudflare Style) */}
                {moreFilterOpen && (
                  <div className="absolute left-0 top-full z-50 mt-0 w-72 sm:w-80 overflow-hidden rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-xl font-sans text-xs divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
                    {/* Section 1: Canva Account / Brand */}
                    <div className="pb-1.5">
                      <div className="px-2.5 py-1 text-[10px] font-sans font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        CANVA ACCOUNT (BRAND)
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-0.5">
                        {brandOptions.map((opt) => {
                          const isSelected = selectedBrand === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setSelectedBrand(opt.value);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-none text-left text-xs font-sans transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]'
                              }`}
                            >
                              <span className="truncate pr-2">{opt.label}</span>
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

                    {/* Section 2: Resolution Status */}
                    <div className="pt-1.5">
                      <div className="px-2.5 py-1 text-[10px] font-sans font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        STATUS & RESOLUTION
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-0.5">
                        {resolutionOptions.map((opt) => {
                          const isSelected = selectedStatus === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setSelectedStatus(opt.value);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-none text-left text-xs font-sans transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-gray-100 dark:bg-[#20232b] text-gray-900 dark:text-white font-bold'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]'
                              }`}
                            >
                              <span className="truncate pr-2">{opt.label}</span>
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
                  </div>
                )}
              </div>

              {/* Middle Section: Active Filter Summary */}
              <div className="flex-1 flex items-center px-3 min-w-0 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                <div className="flex items-center gap-1.5 text-xs font-sans text-gray-500 dark:text-gray-400 truncate">
                  <span className="truncate">
                    <strong className="text-gray-800 dark:text-gray-200">
                      {selectedBrand === 'ALL' ? 'All Brands' : selectedBrand}
                    </strong>
                    {' · '}
                    <span>{selectedStatus === 'UNRESOLVED' ? 'Unresolved' : (selectedStatus === 'RESOLVED' ? 'Resolved' : 'All Emails')}</span>
                  </span>
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-[#20232b] text-gray-700 dark:text-gray-300 text-[11px] font-sans shrink-0">
                      "{searchQuery}"
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
                        aria-label="Clear keyword"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Expanded Full-Width Search Input State */
            <div className="flex-1 flex items-center gap-2 pl-3.5 pr-2 min-w-0 bg-white dark:bg-[#0d0e12] animate-[fadeIn_120ms_ease-in]">
              <Search className="w-4 h-4 text-[#ff5e1f] shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search email subject, template name, brand, or issue message..."
                className="flex-1 bg-transparent text-xs font-sans text-gray-900 dark:text-white outline-none placeholder:text-gray-400 min-w-0"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs shrink-0 cursor-pointer"
                  aria-label="Clear search query"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                }}
                className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                aria-label="Close search bar"
                title="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Far-Right: SYNC EMAIL Action Button (Orange #ff5e1f, full-height) */}
          <button
            type="button"
            onClick={handleSyncEmail}
            disabled={syncing}
            className="h-full px-3.5 sm:px-5 flex items-center justify-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider bg-[#ff5e1f] hover:bg-[#ff7038] text-white transition-colors cursor-pointer shrink-0 border-l border-[#f0f0f0] dark:border-[#272a34] disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">{syncing ? 'SYNCING...' : 'SYNC EMAIL'}</span>
            <span className="xs:hidden">{syncing ? '...' : 'SYNC'}</span>
          </button>
        </div>

        {/* ROW 2 [C]: Category Slider Row with Horizontal Scrolling & Chevron Affordance */}
        <div className="relative flex items-center bg-[#fafafa] dark:bg-[#16181d] border-b border-[#f0f0f0] dark:border-[#272a34] px-1 sm:px-2 py-2">
          {/* Slide Left Button */}
          <button
            type="button"
            onClick={() => slideCategories('left')}
            aria-label="Slide categories left"
            className="p-1 rounded text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-[#20232b] transition-colors shrink-0 cursor-pointer hidden sm:flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Slider Container (Edge-to-edge Touch Swipe & Smooth Scroll) */}
          <div
            ref={categorySliderRef}
            className="flex-1 flex items-center gap-2 overflow-x-auto scroll-smooth whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-1.5"
          >
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mr-0.5 select-none shrink-0">
              CATEGORY
            </span>

            {/* All Categories Chip */}
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-sans font-semibold transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
                selectedCategory === 'ALL'
                  ? 'bg-[#111827] text-white border-[#111827] dark:bg-white dark:text-[#111827] dark:border-white'
                  : 'bg-white dark:bg-[#0d0e12] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#272a34] hover:bg-gray-50'
              }`}
            >
              <span>All categories</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                selectedCategory === 'ALL'
                  ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                  : 'bg-gray-100 dark:bg-[#20232b] text-gray-600 dark:text-gray-400'
              }`}>
                {categoryCounts.ALL}
              </span>
            </button>

            {/* Category Chips: PUBLISH ISSUE, TEMPLATE REJECTED, LIBRARY PUBLISHED */}
            {(['publish', 'rejected', 'library'] as Category[]).map((catKey) => {
              const cfg = CATEGORY_CONFIG[catKey];
              const isSelected = selectedCategory === catKey;
              const count = categoryCounts[catKey];
              const Icon = cfg.Icon;

              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setSelectedCategory(isSelected ? 'ALL' : catKey)}
                  className={`px-3 py-1 rounded-full text-xs font-sans font-semibold transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
                    isSelected
                      ? cfg.activeBgClass
                      : `bg-white dark:bg-[#0d0e12] ${cfg.inactiveTextClass} border-gray-200 dark:border-[#272a34] hover:bg-gray-50`
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{cfg.label}</span>
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : `${cfg.badgeBgClass} ${cfg.badgeTextClass}`
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {/* Separator before Subject Triggers */}
            <div className="w-px h-4 bg-gray-200 dark:bg-[#272a34] shrink-0 mx-1" />

            {/* SUBJECT TRIGGERS Button inside Slider */}
            <button
              type="button"
              onClick={() => setSubjectModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-sans font-bold uppercase tracking-wider bg-white dark:bg-[#0d0e12] border border-[#f0f0f0] dark:border-[#272a34] shadow-xs text-gray-700 dark:text-gray-300 hover:text-white hover:bg-[#ff5e1f] dark:hover:bg-[#ff5e1f] rounded-none transition-colors cursor-pointer shrink-0"
              title="Setting pattern subjek email Canva untuk sync"
            >
              <Sliders className="w-3 h-3 text-[#ff5e1f]" />
              <span>SUBJECT TRIGGERS</span>
            </button>
          </div>

          {/* Slide Right Button */}
          <button
            type="button"
            onClick={() => slideCategories('right')}
            aria-label="Slide categories right"
            className="p-1 rounded text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-[#20232b] transition-colors shrink-0 cursor-pointer hidden sm:flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SPLIT VIEW BODY (Brand Rail Left + Grouped List Right) */}
      <div className="flex flex-1 min-h-[calc(100vh-184px)]">
        {/* BRAND RAIL [D]: 270px width (Hidden on mobile < md to provide full width to email list) */}
        <div 
          className="hidden md:block w-[270px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-[#fafafa] dark:bg-[#16181d] divide-y divide-[#f0f0f0] dark:divide-[#272a34] sticky align-self-start overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ top: railTop, maxHeight: `calc(100vh - ${railTop}px)` }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between bg-[#fafafa] dark:bg-[#16181d]">
            <span className="text-[10px] font-sans font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
              CANVA ACCOUNTS (BRAND)
            </span>
            {totalUnresolved > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#ff5e1f]/10 text-[#ff5e1f] text-[10px] font-sans font-bold">
                {totalUnresolved} Issues
              </span>
            )}
          </div>

          <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
            {/* ALL Brands Row */}
            <button
              type="button"
              onClick={() => setSelectedBrand('ALL')}
              className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors cursor-pointer ${
                selectedBrand === 'ALL'
                  ? 'bg-white dark:bg-[#0d0e12] border-l-2 border-[#ff5e1f] shadow-xs'
                  : 'hover:bg-gray-100/50 dark:hover:bg-[#20232b]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] flex items-center justify-center shrink-0">
                  <Inbox className="w-4 h-4 text-gray-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-sans font-bold text-gray-900 dark:text-white truncate">
                    ALL Brands
                  </div>
                  <div className="text-[11px] font-sans text-gray-400">
                    {totalEmailsCount} Total Emails
                  </div>
                </div>
              </div>
              {totalUnresolved > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-[#ff5e1f]/10 text-[#ff5e1f]">
                  {totalUnresolved}
                </span>
              )}
            </button>

            {/* Registered Brand Rows */}
            {brandStats.map(({ account, total, unresolved }) => {
              const isSelected = selectedBrand === account.displayName;
              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => setSelectedBrand(account.displayName)}
                  className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-[#0d0e12] border-l-2 border-[#ff5e1f] shadow-xs'
                      : 'hover:bg-gray-100/50 dark:hover:bg-[#20232b]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-none border border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: account.color || '#ff5e1f' }}
                    >
                      {account.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-sans font-bold text-gray-900 dark:text-white truncate">
                        {account.displayName}
                      </div>
                      <div className="text-[11px] font-sans text-gray-400">
                        {total} Total Emails
                      </div>
                    </div>
                  </div>
                  {unresolved > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-[#ff5e1f]/10 text-[#ff5e1f]">
                      {unresolved}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Other Brands (Unregistered) */}
            <button
              type="button"
              onClick={() => setSelectedBrand('OTHER')}
              className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors cursor-pointer ${
                selectedBrand === 'OTHER' || selectedBrand === 'Other Brands'
                  ? 'bg-white dark:bg-[#0d0e12] border-l-2 border-[#ff5e1f] shadow-xs'
                  : 'hover:bg-gray-100/50 dark:hover:bg-[#20232b]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                  ?
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-sans font-bold text-gray-900 dark:text-white truncate">
                    Other Brands
                  </div>
                  <div className="text-[11px] font-sans text-gray-400">
                    {otherNotifications.length} Emails
                  </div>
                </div>
              </div>
              {otherUnresolvedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-[#ff5e1f]/10 text-[#ff5e1f]">
                  {otherUnresolvedCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* GROUPED LIST PANEL [E] */}
        <div className="flex-1 bg-white dark:bg-[#0d0e12] flex flex-col min-w-0">
          {/* BULK ACTION BAR (When ≥1 item checked) */}
          {selectedCount > 0 && (
            <div className="sticky top-[100px] z-20 bg-[#111827] text-white px-5 py-3 border-b border-gray-800 flex items-center justify-between shadow-lg animate-[fadeIn_150ms_ease-in]">
              <div className="flex items-center gap-2 text-xs font-sans font-bold">
                <span className="w-6 h-6 rounded-full bg-[#ff5e1f] text-white flex items-center justify-center text-[11px]">
                  {selectedCount}
                </span>
                <span>{selectedCount} email{selectedCount > 1 ? 's' : ''} selected</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBulkResolve}
                  className="px-4 py-1.5 bg-[#10b981] hover:bg-[#059669] text-white text-xs font-sans font-bold uppercase rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>MARK FIXED / RESOLVED</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds({})}
                  className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer px-2 py-1"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* GROUP LIST TOOLBAR HEADER (Collapse All / Expand All Toggle) */}
          <div className="px-5 py-2.5 bg-gray-50/50 dark:bg-[#16181d]/50 border-b border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-between text-xs font-sans">
            <div className="text-gray-500 dark:text-gray-400 font-medium">
              Showing <strong className="text-gray-900 dark:text-white font-bold">{filteredNotifications.length}</strong> Canva Notification Emails
            </div>

            <button
              type="button"
              onClick={toggleAllSubgroups}
              className="flex items-center gap-1.5 text-xs font-sans font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {allCollapsed ? (
                <>
                  <ChevronsUpDown className="w-3.5 h-3.5 text-[#ff5e1f]" />
                  <span>EXPAND ALL</span>
                </>
              ) : (
                <>
                  <ChevronsDownUp className="w-3.5 h-3.5 text-[#ff5e1f]" />
                  <span>COLLAPSE ALL</span>
                </>
              )}
            </button>
          </div>

          {/* MAIN CONTENT AREA */}
          {loading ? (
            <div className="p-12 text-center space-y-3 font-sans">
              <div className="w-8 h-8 rounded-full border-2 border-[#ff5e1f] border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-gray-500 font-medium">Memuat notifikasi email Canva...</p>
            </div>
          ) : groupedData.length === 0 ? (
            <div className="p-16 text-center space-y-4 font-sans">
              <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-[#16181d] border border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-center mx-auto text-gray-400">
                <Inbox className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Tidak ada notifikasi email</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Belum ada email yang cocok dengan filter aktif ({selectedBrand} - Category: {selectedCategory}). Klik tombol Sync Email untuk memeriksa inbox terbaru.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSyncEmail}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff5e1f] hover:bg-[#ff7038] text-white text-xs font-sans font-bold uppercase rounded-md transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'SYNCING INBOX...' : 'SYNC EMAIL SEKARANG'}</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
              {groupedData.map((group) => {
                const actionableEmails = group.emails.filter((n) => {
                  const cat = getEmailCategory(n.subject);
                  return cat !== 'rejected' && cat !== 'library';
                });
                const hasActionable = actionableEmails.length > 0;
                const isBrandAllSelected = hasActionable && actionableEmails.every((n) => selectedIds[n.id]);

                return (
                  <div key={group.brandKey} className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
                    {/* LEVEL 1: BRAND SECTION HEADER */}
                    <div className="sticky-free bg-[#f8f9fa] dark:bg-[#16181d]/80 px-5 py-3 border-b border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-between text-xs font-sans">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-none border border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                          style={{ backgroundColor: group.account?.color || '#6e7687' }}
                        >
                          {group.brandName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 dark:text-white text-sm">
                            {group.brandName}
                          </span>
                          {group.isUnregistered && (
                            <span className="text-gray-400 dark:text-gray-500 font-normal italic">
                              · not registered in system
                            </span>
                          )}
                          <span className="text-gray-500 dark:text-gray-400 text-xs font-normal">
                            ({group.totalCount} email{group.totalCount > 1 ? 's' : ''}
                            {group.unresolvedCount > 0 ? ` · ${group.unresolvedCount} unresolved` : ''})
                          </span>
                        </div>
                      </div>

                      {hasActionable && (
                        <button
                          type="button"
                          onClick={() => toggleSelectAllBrand(group.emails)}
                          className="text-xs font-sans font-medium text-gray-600 dark:text-gray-400 hover:text-[#ff5e1f] dark:hover:text-[#ff5e1f] transition-colors cursor-pointer"
                        >
                          {isBrandAllSelected ? 'Deselect all' : 'Select all'}
                        </button>
                      )}
                    </div>

                    {/* LEVEL 2: CATEGORY SUBGROUPS */}
                    <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
                      {group.categories.map(({ category, emails }) => {
                        const subKey = `${group.brandKey}|${category}`;
                        const isClosed = closedCats[subKey];
                        const cfg = CATEGORY_CONFIG[category];
                        const Icon = cfg.Icon;

                        return (
                          <div key={category} className="bg-white dark:bg-[#0d0e12]">
                            {/* Category Subgroup Header Row */}
                            <button
                              type="button"
                              onClick={() =>
                                setClosedCats((prev) => ({
                                  ...prev,
                                  [subKey]: !prev[subKey],
                                }))
                              }
                              className="w-full px-5 py-2.5 bg-gray-50/60 dark:bg-[#16181d]/30 hover:bg-gray-100/60 dark:hover:bg-[#16181d]/60 transition-colors flex items-center justify-between text-left text-xs font-sans cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {isClosed ? (
                                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                                )}

                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 shrink-0 ${cfg.badgeBgClass} ${cfg.badgeTextClass} ${cfg.badgeBorderClass}`}>
                                  <Icon className="w-3 h-3 shrink-0" />
                                  {cfg.label}
                                </span>

                                <span className="font-bold text-gray-800 dark:text-gray-200 truncate">
                                  {cfg.triggerSubject}
                                </span>
                              </div>

                              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#20232b] text-gray-600 dark:text-gray-400 text-[11px] font-bold shrink-0 ml-2">
                                {emails.length}
                              </span>
                            </button>

                            {/* Email Cards inside Subgroup */}
                            {!isClosed && (
                              <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
                                {emails.map((item) => {
                                  const isChecked = Boolean(selectedIds[item.id]);
                                  const isRejected = getEmailCategory(item.subject) === 'rejected';
                                  const isLibraryPublished = getEmailCategory(item.subject) === 'library';
                                  const isReadOnly = isRejected || isLibraryPublished;
                                  const effectiveStatus = isReadOnly ? 'RESOLVED' : item.status;
                                  const isResolved = effectiveStatus === 'RESOLVED';
                                  const isIssuesOpen = Boolean(openIssues[item.id]);
                                  const issues = visibleIssueMessages(item);

                                  const displayBrand = item.brandName && /uicreative/i.test(item.brandName)
                                    ? 'UICreative.net'
                                    : item.brandName || item.sender || 'Canva Account';

                                  const displayTitle = cleanTemplateTitle(item.templateTitle || item.subject, displayBrand);

                                  return (
                                    <div
                                      key={item.id}
                                      className={`transition-colors ${
                                        isChecked
                                          ? 'bg-amber-500/5 dark:bg-amber-500/10 border-l-2 border-[#ff5e1f]'
                                          : isResolved
                                          ? 'bg-gray-50/40 dark:bg-[#16181d]/20 opacity-75'
                                          : 'bg-white dark:bg-[#0d0e12]'
                                      }`}
                                    >
                                      {/* Medium Density Single-Row Card */}
                                      <div className="px-5 py-3.5 flex items-center justify-between gap-4 text-xs font-sans">
                                        {/* Left Side: Checkbox + Title + Status + Meta */}
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                          {/* 18px Checkbox (hidden for read-only categories: REJECTED & LIBRARY) */}
                                          {!isReadOnly && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setSelectedIds((prev) => ({
                                                  ...prev,
                                                  [item.id]: !prev[item.id],
                                                }))
                                              }
                                              className="cursor-pointer text-gray-400 hover:text-[#ff5e1f] transition-colors shrink-0"
                                            >
                                              {isChecked ? (
                                                <CheckSquare className="w-4.5 h-4.5 text-[#ff5e1f]" />
                                              ) : (
                                                <Square className="w-4.5 h-4.5 text-gray-300 dark:text-gray-600" />
                                              )}
                                            </button>
                                          )}

                                          <div className="min-w-0 flex-1 space-y-1">
                                            {/* Line 1: Title + Status Pill (hidden for read-only categories like REJECTED & LIBRARY) */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-bold text-gray-900 dark:text-white text-[13px] truncate">
                                                {displayTitle}
                                              </span>

                                              {!isReadOnly && (
                                                <span
                                                  className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                    isResolved
                                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                                  }`}
                                                >
                                                  {effectiveStatus}
                                                </span>
                                              )}
                                            </div>

                                            {/* Line 2: Meta Line (Brand · Received · Issue Pill) */}
                                            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap">
                                              <span>{displayBrand}</span>
                                              <span>·</span>
                                              <span>{new Date(item.receivedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>

                                              {/* Issue Count Toggle Pill */}
                                              {issues.length > 0 && (
                                                <>
                                                  <span>·</span>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setOpenIssues((prev) => ({
                                                        ...prev,
                                                        [item.id]: !prev[item.id],
                                                      }))
                                                    }
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                                                      isIssuesOpen
                                                        ? 'bg-rose-500 text-white'
                                                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                                                    }`}
                                                  >
                                                    <span>{issues.length} {issues.length === 1 ? 'issue' : 'issues'}</span>
                                                    <ChevronDown className={`w-3 h-3 transition-transform ${isIssuesOpen ? 'rotate-180' : ''}`} />
                                                  </button>
                                                </>
                                              )}

                                              {/* Quick Individual Toggle Resolution Status (hidden for read-only categories) */}
                                              {!isReadOnly && (
                                                <>
                                                  <span>·</span>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleToggleStatus(item.id, item.status)}
                                                    className="text-[10px] font-medium underline text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors ml-1"
                                                  >
                                                    {isResolved ? 'Mark Unresolved' : 'Mark Fixed'}
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Right Side: Canva Purple CTA Button (My Profile for Library Published, Edit Template for Revisable Issues) */}
                                        {item.templateUrl && (
                                          isLibraryPublished ? (
                                            <a
                                              href={item.templateUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="px-3.5 py-1.5 rounded-md bg-[#8b3dff] hover:bg-[#7a2eff] text-white text-xs font-bold font-sans flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
                                            >
                                              <span>My Profile</span>
                                              <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                                            </a>
                                          ) : !isRejected ? (
                                            <a
                                              href={item.templateUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="px-3.5 py-1.5 rounded-md bg-[#8b3dff] hover:bg-[#7a2eff] text-white text-xs font-bold font-sans flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
                                            >
                                              <span>Edit Template</span>
                                              <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                                            </a>
                                          ) : null
                                        )}
                                      </div>

                                      {/* ON-DEMAND ISSUE DETAIL DRAWER (Expanded when isIssuesOpen is true) */}
                                      {isIssuesOpen && (
                                        <div className="px-5 pb-4 pt-1">
                                          <div className={`p-3.5 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-lg space-y-2.5 ${!isReadOnly ? 'ml-7' : 'ml-0'}`}>
                                            <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center justify-between">
                                              <span>CANVA QUALITY REVIEW ISSUES ({issues.length})</span>
                                              <button
                                                type="button"
                                                onClick={() => setOpenIssues((prev) => ({ ...prev, [item.id]: false }))}
                                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            </div>

                                            {issues.length > 0 ? (
                                              <div className="space-y-2">
                                                {issues.map((msg, idx) => {
                                                  const [title, description] = msg.split(/\s+—\s+(.+)/);
                                                  return (
                                                    <div
                                                      key={idx}
                                                      className="p-3 bg-white dark:bg-[#16181d] border border-rose-200 dark:border-rose-900/30 rounded-md flex items-start gap-3 text-xs font-sans shadow-2xs"
                                                    >
                                                      <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                                                        {idx + 1}
                                                      </span>
                                                      <div className="space-y-0.5 flex-1 min-w-0 leading-relaxed">
                                                        {description ? (
                                                          <>
                                                            <div className="font-bold text-gray-900 dark:text-white text-xs">
                                                              {title}
                                                            </div>
                                                            <div className="text-gray-600 dark:text-gray-300 text-[11px] leading-normal">
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
                                              <div className="text-xs font-sans text-gray-700 dark:text-gray-300">
                                                Issues reported by Canva Quality Review team.
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Modal: Configure Custom Sync Subject Triggers */}
      <SyncSubjectSettingsSlideModal
        open={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        onSaved={() => {
          fetchTriggers();
          fetchNotifications();
        }}
      />
    </div>
  );
}

