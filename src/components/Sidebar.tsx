"use client";

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Files, 
  Users, 
  CreditCard, 
  FileText, 
  Network,
  Settings,
  UserRound,
  UserCog,
  Library,
  Menu,
  X,
  ChevronRight,
  Plus
} from 'lucide-react';
import SyncButton from './SyncButton';
import AccountSwitcher from './AccountSwitcher';
import { getProductionUnitsAction } from '@/app/actions/production-unit';
import { NAV_REQUIREMENTS, type AccessInfo } from '@/lib/permissions';
import { DEV_TOOLS_ENABLED } from '@/lib/dev-tools';

interface ProductionUnitNav {
  id: string;
  name: string;
  slug: string;
}

interface SidebarProps {
  currentSyncLog: any;
  access: AccessInfo;
}

interface MenuItem {
  name: string;
  icon: any;
  href: string;
  active: boolean;
  group: string;
}

export default function Sidebar({ currentSyncLog, access }: SidebarProps) {
  const allows = (p: string) => !access.enabled || access.permissions.includes(p as AccessInfo['permissions'][number]);
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const searchParams = useSearchParams();
  const periodFromUrl = searchParams.get('period');
  const activeProduction = searchParams.get('production');
  const [savedPeriod, setSavedPeriod] = useState<string | null>(null);
  const activePeriod = periodFromUrl ?? savedPeriod;
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [productionUnits, setProductionUnits] = useState<ProductionUnitNav[]>([]);

  // Refetch senyap tiap navigasi (daftar lama tetap tampil, tanpa kedip) agar production baru ikut muncul.
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getProductionUnitsAction()
        .then((units) => { if (!cancelled) setProductionUnits(units); })
        .catch(() => { /* sidebar tetap tampil tanpa submenu */ });
    };
    load();
    // Production Hub memberi tahu setelah rename / arsip / hapus agar submenu langsung ikut berubah.
    window.addEventListener('production-units-changed', load);
    return () => {
      cancelled = true;
      window.removeEventListener('production-units-changed', load);
    };
  }, [pathname]);

  useEffect(() => {
    const handleToggle = () => setIsMobileOpen((prev) => !prev);
    window.addEventListener('toggle-mobile-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-mobile-sidebar', handleToggle);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('can_freelance_active_period');
      if (saved) setSavedPeriod(saved);
    } catch { /* abaikan */ }
  }, []);

  const getHrefWithPeriod = (baseHref: string) => {
    const periodToUse = activePeriod;
    if (!periodToUse || periodToUse === 'all') return baseHref;
    return `${baseHref}?period=${encodeURIComponent(periodToUse)}`;
  };

  const menuItems: MenuItem[] = [
    { name: 'Overview', icon: LayoutDashboard, href: '/', active: false, group: 'GET STARTED' },
    { name: 'Production', icon: Files, href: '/production', active: pathname === '/production', group: 'GET STARTED' },
    { name: 'Account & Team', icon: Users, href: '/account-team', active: pathname === '/account-team', group: 'BUILD' },
    { name: 'Asset Library', icon: Library, href: '/assets', active: pathname === '/assets', group: 'BUILD' },
    { name: 'Rate Card', icon: CreditCard, href: '/rate-card', active: pathname === '/rate-card', group: 'BUILD' },
    { name: 'Billing Statement', icon: FileText, href: '/billing-statement', active: pathname === '/billing-statement', group: 'BUILD' },
    { name: 'Profil', icon: UserRound, href: '/profile', active: pathname === '/profile', group: 'BUILD' },
    { name: 'Knowledge Graph', icon: Network, href: '/knowledge-graph', active: pathname === '/knowledge-graph', group: 'MANAGE & OBSERVE' },
    { name: 'User & Role', icon: UserCog, href: '/user-role', active: pathname === '/user-role', group: 'MANAGE & OBSERVE' },
    { name: 'Notion Config', icon: Settings, href: '/notion-config', active: pathname === '/notion-config', group: 'MANAGE & OBSERVE' },
  ];

  // Menu yang tidak diizinkan untuk role ini tidak ditampilkan (server tetap menjaga akses).
  // Knowledge Graph hanya alat developer lokal (lihat lib/dev-tools.ts).
  const visibleMenuItems = menuItems.filter((i) =>
    i.href === '/knowledge-graph' && !DEV_TOOLS_ENABLED ? false
    : i.href === '/profile' ? access.enabled && access.hasProfile : (NAV_REQUIREMENTS[i.href] ?? []).some(allows),
  );

  // Group items by category
  const groups = Array.from(new Set(visibleMenuItems.map((i) => i.group)));

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-45 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Drawer — Fixed w-56 on desktop below top bar.
          z-45: di atas tab sticky halaman (z-40, mis. ProductionTabNav), di bawah TopBar (z-50) & drawer. */}
      <aside className={`
        fixed top-14 left-0 bottom-0 z-45 h-[calc(100vh-56px)] bg-white dark:bg-[#0d0e12] 
        border-r border-[#f0f0f0] dark:border-[#272a34] py-4 px-4 flex flex-col 
        justify-between transition-transform duration-300 w-56
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        <div className="space-y-4 flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Mobile Header / Close Button */}
          <div className="flex md:hidden items-center justify-between px-2 pt-1 pb-1">
            <span className="font-sans font-bold text-xs text-[#262626] dark:text-white uppercase tracking-wider">
              Navigation
            </span>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-[#ff5e1f] hover:bg-gray-100 dark:hover:bg-[#1e2028] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Account Switcher (Visible only in mobile drawer) */}
          {access.enabled && access.userCode && (
            <div className="flex md:hidden flex-col gap-1.5 px-2 pb-2 border-b border-[#f0f0f0] dark:border-[#272a34]">
              <span className="text-[10px] font-sans font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">
                Akun Saya
              </span>
              <AccountSwitcher />
            </div>
          )}

          {/* Grouped Navigation Menu */}
          <nav className="space-y-5 pt-1">
            {groups.map((group) => {
              const groupItems = visibleMenuItems.filter((i) => i.group === group);
              if (groupItems.length === 0) return null;

              return (
                <div key={group} className="space-y-1">
                  <div className="px-3 pb-1 text-[10px] font-sans font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">
                    {group}
                  </div>
                  {groupItems.map((item) => {
                    const Icon = item.icon;
                    const isProduction = item.href === '/production';
                    const isOverview = item.href === '/';
                    const hasChildren = (isOverview || isProduction) && productionUnits.length > 0;
                    const childActive = isOverview
                      ? pathname === '/' && !!activeProduction
                      : pathname.startsWith('/production/');
                    const expanded = !!expandedGroups[item.name];
                    const isOpen = hasChildren && (expanded || childActive);
                    const chevronOpen = expanded;
                    const onToggle = () => setExpandedGroups((prev) => ({ ...prev, [item.name]: !prev[item.name] }));
                    const activeUnitOnly = !expanded && childActive;
                    const href = getHrefWithPeriod(item.href);

                    const row = (
                      <div className="relative flex items-stretch">
                        {isOverview ? (
                        <button
                          type="button"
                          onClick={onToggle}
                          className={`flex flex-1 min-w-0 items-center justify-between pl-3 ${hasChildren ? 'pr-8' : 'pr-3'} py-2 rounded-lg text-xs font-medium transition-all duration-150 group cursor-pointer text-left ${
                            childActive
                              ? 'text-[#262626] dark:text-white font-semibold'
                              : 'text-gray-600 dark:text-gray-400 hover:text-[#262626] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#16181d]/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                              item.active || childActive ? 'text-[#ff5e1f]' : 'text-gray-400 dark:text-gray-500 group-hover:text-[#ff5e1f]'
                            }`} />
                            <span className="whitespace-nowrap">{item.name}</span>
                          </div>
                          {item.active && <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e1f]" />}
                        </button>
                        ) : (
                        <Link
                          href={href}
                          onClick={() => setIsMobileOpen(false)}
                          className={`flex flex-1 min-w-0 items-center justify-between pl-3 ${hasChildren ? 'pr-8' : 'pr-3'} py-2 rounded-lg text-xs font-medium transition-all duration-150 group cursor-pointer ${
                            item.active
                              ? 'bg-[#f0f0f0] dark:bg-[#16181d] text-[#262626] dark:text-white font-semibold'
                              : 'text-gray-600 dark:text-gray-400 hover:text-[#262626] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#16181d]/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                              item.active || childActive ? 'text-[#ff5e1f]' : 'text-gray-400 dark:text-gray-500 group-hover:text-[#ff5e1f]'
                            }`} />
                            <span className="whitespace-nowrap">{item.name}</span>
                          </div>
                          {item.active && <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e1f]" />}
                        </Link>
                        )}
                        {hasChildren && (
                          <button
                            type="button"
                            aria-label={chevronOpen ? `Ciutkan ${item.name}` : `Buka ${item.name}`}
                            aria-expanded={chevronOpen}
                            onClick={onToggle}
                            className="absolute right-0 inset-y-0 w-8 flex items-center justify-center text-gray-400 hover:text-[#ff5e1f] cursor-pointer"
                          >
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${chevronOpen ? 'rotate-90' : ''}`} />
                          </button>
                        )}
                      </div>
                    );

                    if (!hasChildren) {
                      return <div key={item.name}>{row}</div>;
                    }

                    const childClass = (active: boolean) =>
                      `flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff5e1f]/60 ${
                        active
                          ? 'bg-gray-50 dark:bg-[#16181d] border-gray-200 dark:border-[#272a34] text-[#ff5e1f] font-semibold'
                          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-[#262626] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#16181d]/60'
                      }`;

                    return (
                      <div
                        key={item.name}
                        className="transition-colors duration-200"
                      >
                        {row}
                        <div
                          aria-hidden={!isOpen}
                          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                            isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                          }`}
                        >
                          <div className="overflow-hidden min-h-0">
                          <div className="space-y-0.5 pt-1 ml-5 pl-3 border-l border-gray-200 dark:border-[#272a34]">
                            {productionUnits.filter((unit) => !activeUnitOnly || (isOverview ? unit.slug === activeProduction : pathname === `/production/${unit.slug}`)).map((unit) => {
                              const unitHref = isOverview ? `/?production=${encodeURIComponent(unit.slug)}` : `/production/${unit.slug}`;
                              const unitActive = isOverview
                                ? pathname === '/' && activeProduction === unit.slug
                                : pathname === `/production/${unit.slug}`;
                              const period = activePeriod && activePeriod !== 'all' ? `${isOverview ? '&' : '?'}period=${encodeURIComponent(activePeriod)}` : '';
                              return (
                                <Link key={unit.id} href={`${unitHref}${period}`} onClick={() => setIsMobileOpen(false)} className={childClass(unitActive)}>
                                  <span className="whitespace-nowrap truncate">{unit.name}</span>
                                  
                                </Link>
                              );
                            })}
                            {isProduction && allows('production.create') && !(activeUnitOnly && pathname !== '/production/new') && (
                              <Link
                                href="/production/new"
                                onClick={() => setIsMobileOpen(false)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff5e1f]/60 ${
                                  pathname === '/production/new'
                                    ? 'bg-gray-50 dark:bg-[#16181d] border-gray-200 dark:border-[#272a34] text-[#ff5e1f] font-semibold'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-[#ff5e1f]'
                                }`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span className="whitespace-nowrap">Tambah Production</span>
                              </Link>
                            )}
                          </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions: Symmetrical Sidebar Sync Table */}
        <div className="-mx-4 -mb-4">
          {allows('integration.manage') && <SyncButton initialSyncLog={currentSyncLog} isCollapsed={false} />}
        </div>
      </aside>
    </>
  );
}
