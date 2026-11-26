import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  ChevronRight,
  FileCheck2,
  FileText,
  Globe,
  Home,
  Menu,
  MessageSquare,
  Moon,
  Package,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  Truck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useErp } from '@/context/ErpContext';
import { LanguageCode, NavRoute } from '@/types/erp';
import { cn, StatusChip } from '@/components/ui/Primitives';
import { formatRs } from '@/utils/format';
import { TransmuteWordmark } from '@/components/ui/TransmuteLogo';

interface NavItem {
  id: NavRoute;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  badgeTone?: 'amber' | 'red' | 'slate';
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    route,
    setRoute,
    navigateToEntity,
    darkMode,
    toggleDarkMode,
    language,
    setLanguage,
    setAiLogOpen,
    documents,
    orders,
    customers,
    inventory,
    collections,
    alerts,
    aiLogs,
    addToast,
    setPendingReportQuery,
  } = useErp();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const docsReviewCount = documents.filter((d) => d.status === 'needs-review' || d.status === 'failed').length;
  const openAlertsCount = alerts.filter((a) => a.status === 'open').length;
  const pendingOrdersCount = orders.filter((o) => o.status === 'pending-review').length;
  const overdueCollectionsCount = collections.filter((c) => c.status === 'scheduled' || c.status === 'sent').length;

  const primaryNav: NavItem[] = [
    { id: 'dashboard', label: 'Home', icon: <Home className="w-4 h-4" /> },
  ];

  const salesNav: NavItem[] = [
    {
      id: 'orders',
      label: 'Orders',
      icon: <ShoppingBag className="w-4 h-4" />,
      badge: pendingOrdersCount || undefined,
      badgeTone: 'amber',
    },
    { id: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
    {
      id: 'collections',
      label: 'Collections',
      icon: <Wallet className="w-4 h-4" />,
      badge: overdueCollectionsCount || undefined,
      badgeTone: 'amber',
    },
  ];

  const operationsNav: NavItem[] = [
    { id: 'purchasing', label: 'Purchasing', icon: <Truck className="w-4 h-4" /> },
    { id: 'inventory', label: 'Inventory', icon: <Package className="w-4 h-4" /> },
    { id: 'accounting', label: 'Accounting', icon: <BookOpen className="w-4 h-4" /> },
    {
      id: 'documents',
      label: 'Documents',
      icon: <FileCheck2 className="w-4 h-4" />,
      badge: docsReviewCount || undefined,
      badgeTone: 'amber',
    },
    { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: openAlertsCount || undefined,
      badgeTone: 'red',
    },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return {
      documents: documents
        .filter(
          (d) =>
            d.supplier.value.toLowerCase().includes(q) ||
            d.invoiceNumber.value.toLowerCase().includes(q) ||
            d.fileName.toLowerCase().includes(q)
        )
        .slice(0, 3),
      customers: customers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.contactPerson.toLowerCase().includes(q) ||
            c.city.toLowerCase().includes(q)
        )
        .slice(0, 3),
      products: inventory
        .filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
        .slice(0, 3),
      chats: orders
        .filter(
          (o) =>
            o.originalMessage &&
            (o.originalMessage.text.toLowerCase().includes(q) ||
              o.customerName.toLowerCase().includes(q) ||
              o.id.toLowerCase().includes(q))
        )
        .slice(0, 3),
    };
  }, [searchQuery, documents, customers, inventory, orders]);

  const hasAnySearchHit =
    searchResults &&
    (searchResults.documents.length > 0 ||
      searchResults.customers.length > 0 ||
      searchResults.products.length > 0 ||
      searchResults.chats.length > 0);

  const langLabels: Record<LanguageCode, string> = {
    en: 'English',
    si: 'සිංහල (Sinhala)',
    ta: 'தமிழ் (Tamil)',
  };

  const handleLanguageChange = (code: LanguageCode) => {
    setLanguage(code);
    setLangOpen(false);
    addToast({
      title: `Language switched to ${langLabels[code]}`,
      description: 'WhatsApp drafts and greetings updated to match your preference.',
      variant: 'info',
    });
  };

  const handleAskFromSearch = () => {
    if (!searchQuery.trim()) return;
    setPendingReportQuery(searchQuery.trim());
    setRoute('reports');
    setSearchOpen(false);
    setSearchQuery('');
  };

  const renderNavButton = (item: NavItem) => {
    const active = route === item.id;
    return (
      <button
        key={item.id}
        onClick={() => {
          setRoute(item.id);
          setMobileNavOpen(false);
        }}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer group',
          active
            ? 'bg-[#FFF4EE] text-zinc-950 dark:bg-[#EA581A]/15 dark:text-white'
            : 'text-zinc-600 hover:bg-stone-100/90 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100'
        )}
      >
        <span className="flex items-center gap-2.5 truncate">
          <span
            className={cn(
              'transition-colors',
              active
                ? 'text-[#EA581A] dark:text-[#FF9E66]'
                : 'text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300'
            )}
          >
            {item.icon}
          </span>
          <span className="truncate">{item.label}</span>
        </span>
        {item.badge !== undefined && item.badge > 0 && (
          <span
            className={cn(
              'px-2 py-0.5 text-[10px] font-semibold rounded-full tabular-nums',
              item.badgeTone === 'red'
                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                : 'bg-[#FFE6D8] text-[#C2410C] dark:bg-[#EA581A]/20 dark:text-[#FF9E66]'
            )}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#151517] border-r border-stone-200/85 dark:border-zinc-800/90">
      {/* Brand */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-stone-100 dark:border-zinc-800/80 shrink-0">
        <button
          onClick={() => setRoute('dashboard')}
          className="flex flex-col items-start text-left cursor-pointer group"
        >
          <TransmuteWordmark />
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 leading-none flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Business workspace
          </div>
        </button>
        <button
          onClick={() => setMobileNavOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav list */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div className="space-y-0.5">{primaryNav.map(renderNavButton)}</div>

        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Sales
          </div>
          <div className="space-y-0.5">{salesNav.map(renderNavButton)}</div>
        </div>

        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Operations & Finance
          </div>
          <div className="space-y-0.5">{operationsNav.map(renderNavButton)}</div>
        </div>
      </nav>

      {/* Transparent AI Audit Footer */}
      <div className="p-3.5 border-t border-stone-100 dark:border-zinc-800/80 space-y-3 shrink-0">
        <button
          onClick={() => {
            setAiLogOpen(true);
            setMobileNavOpen(false);
          }}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-stone-50 hover:bg-[#FFF4EE] dark:bg-zinc-900 dark:hover:bg-zinc-800/90 border border-stone-200/75 dark:border-zinc-800 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#FFF4EE] dark:bg-[#EA581A]/15 text-[#EA581A] dark:text-[#FF9E66] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                AI Action Log
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {aiLogs.length} audited actions
              </div>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        </button>

        <div className="flex items-center gap-2.5 px-1.5">
          <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-[#EA581A] text-white text-xs font-semibold flex items-center justify-center shrink-0">
            OW
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
              Owner
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              Workspace owner
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#FAF9F7] dark:bg-[#111113] text-zinc-900 dark:text-zinc-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative w-64 max-w-[82vw] h-full z-10">{sidebarContent}</div>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 h-16 bg-[#FAF9F7]/90 dark:bg-[#111113]/90 backdrop-blur-md border-b border-stone-200/80 dark:border-zinc-800/80 px-4 lg:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 max-w-2xl">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-lg text-zinc-600 hover:bg-stone-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search */}
            <div className="relative flex-1" ref={searchRef}>
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      handleAskFromSearch();
                    }
                  }}
                  placeholder="Search or ask anything — invoices, customers, stock, WhatsApp chats..."
                  className="w-full pl-10 pr-24 py-2 text-[13px] rounded-xl bg-white dark:bg-[#18181B] border border-stone-200/90 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-[#EA581A] focus:ring-2 focus:ring-[#EA581A]/15 shadow-[0_1px_2px_rgba(24,24,27,0.03)] transition-all"
                />
                <div className="hidden sm:flex items-center gap-1 absolute right-2.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-[#FFF4EE] text-[#C2410C] border border-[#FFD5BE]/80 dark:bg-[#EA581A]/15 dark:text-[#FF9E66] dark:border-[#EA581A]/30">
                    <Sparkles className="w-3 h-3" />
                    Ask AI
                  </span>
                </div>
              </div>

              {/* Search Dropdown */}
              {searchOpen && (
                <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-[#18181B] border border-stone-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden z-40">
                  {!searchQuery.trim() ? (
                    <div className="p-3.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                        Quick jumps & AI questions
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {[
                          {
                            label: 'Who owes me the most?',
                            action: () => {
                              setPendingReportQuery('Who owes me the most?');
                              setRoute('reports');
                              setSearchOpen(false);
                            },
                          },
                          {
                            label: 'Open the document inbox',
                            action: () => {
                              setRoute('documents');
                              setSearchOpen(false);
                            },
                          },
                          {
                            label: 'Open customers',
                            action: () => {
                              setRoute('customers');
                              setSearchOpen(false);
                            },
                          },
                          {
                            label: 'Open purchasing',
                            action: () => {
                              setRoute('purchasing');
                              setSearchOpen(false);
                            },
                          },
                        ].map((item) => (
                          <button
                            key={item.label}
                            onClick={item.action}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs text-zinc-700 dark:text-zinc-200 hover:bg-stone-50 dark:hover:bg-zinc-800/80 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#EA581A] shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      <button
                        onClick={handleAskFromSearch}
                        className="w-full px-4 py-3 flex items-center justify-between bg-[#FFF4EE]/75 dark:bg-[#EA581A]/10 hover:bg-[#FFF4EE] dark:hover:bg-[#EA581A]/20 text-left cursor-pointer"
                      >
                        <span className="flex items-center gap-2 text-xs font-medium text-zinc-900 dark:text-white">
                          <Sparkles className="w-4 h-4 text-[#EA581A]" />
                          Ask Transmute: “{searchQuery}”
                        </span>
                        <span className="text-[11px] text-[#C2410C] dark:text-[#FF9E66] font-medium">
                          Run Report ↵
                        </span>
                      </button>

                      {hasAnySearchHit ? (
                        <div className="p-2 space-y-2">
                          {searchResults!.documents.length > 0 && (
                            <div>
                              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Documents
                              </div>
                              {searchResults!.documents.map((doc) => (
                                <button
                                  key={doc.id}
                                  onClick={() => {
                                    navigateToEntity('documents', doc.id);
                                    setSearchOpen(false);
                                    setSearchQuery('');
                                  }}
                                  className="w-full px-2.5 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-xs cursor-pointer"
                                >
                                  <span className="flex items-center gap-2 min-w-0">
                                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="font-medium text-slate-900 dark:text-white truncate">
                                      {doc.invoiceNumber.value} · {doc.supplier.value}
                                    </span>
                                  </span>
                                  <span className="tabular-nums text-slate-500 ml-2 shrink-0">
                                    {formatRs(doc.total.value)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          {searchResults!.customers.length > 0 && (
                            <div>
                              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Customers
                              </div>
                              {searchResults!.customers.map((c) => (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                    navigateToEntity('customers', c.id);
                                    setSearchOpen(false);
                                    setSearchQuery('');
                                  }}
                                  className="w-full px-2.5 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-xs cursor-pointer"
                                >
                                  <span className="flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="font-medium text-slate-900 dark:text-white">
                                      {c.name}
                                    </span>
                                    <span className="text-slate-400">· {c.city}</span>
                                  </span>
                                  <span className="tabular-nums text-slate-500">
                                    {formatRs(c.outstandingBalance)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          {searchResults!.products.length > 0 && (
                            <div>
                              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Inventory Products
                              </div>
                              {searchResults!.products.map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => {
                                    setRoute('inventory');
                                    setSearchOpen(false);
                                    setSearchQuery('');
                                  }}
                                  className="w-full px-2.5 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-xs cursor-pointer"
                                >
                                  <span className="flex items-center gap-2 truncate">
                                    <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="font-medium text-slate-900 dark:text-white truncate">
                                      {p.name}
                                    </span>
                                  </span>
                                  <span className="tabular-nums text-slate-500 shrink-0 ml-2">
                                    {p.warehouseStock + p.shopStock + p.vanStock} {p.unit}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          {searchResults!.chats.length > 0 && (
                            <div>
                              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                WhatsApp & Email Orders
                              </div>
                              {searchResults!.chats.map((o) => (
                                <button
                                  key={o.id}
                                  onClick={() => {
                                    navigateToEntity('orders', o.id);
                                    setSearchOpen(false);
                                    setSearchQuery('');
                                  }}
                                  className="w-full px-2.5 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-xs cursor-pointer"
                                >
                                  <span className="flex items-center gap-2 truncate">
                                    <MessageSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <span className="truncate text-slate-700 dark:text-slate-200">
                                      <strong className="text-slate-900 dark:text-white">{o.id}</strong> —{' '}
                                      {o.originalMessage?.text}
                                    </span>
                                  </span>
                                  <Receipt className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-500">
                          No direct records matched. Press Enter to ask Transmute AI for a custom report.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Language Switcher */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen((o) => !o)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-[#18181B] text-zinc-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 border border-stone-200/85 dark:border-zinc-800 cursor-pointer"
                title="Switch Language"
              >
                <Globe className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">
                  {language === 'en' ? 'EN' : language === 'si' ? 'සිංහල' : 'தமிழ்'}
                </span>
              </button>
              {langOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-[#18181B] border border-stone-200 dark:border-zinc-800 rounded-xl shadow-lg py-1.5 z-40">
                  {(['en', 'si', 'ta'] as LanguageCode[]).map((code) => (
                    <button
                      key={code}
                      onClick={() => handleLanguageChange(code)}
                      className={cn(
                        'w-full px-3.5 py-2 text-left text-xs flex items-center justify-between hover:bg-stone-50 dark:hover:bg-zinc-800 cursor-pointer',
                        language === code
                          ? 'font-semibold text-[#C2410C] dark:text-[#FF9E66] bg-[#FFF4EE]/70 dark:bg-[#EA581A]/10'
                          : 'text-zinc-700 dark:text-zinc-300'
                      )}
                    >
                      <span>{langLabels[code]}</span>
                      {language === code && <span className="w-1.5 h-1.5 rounded-full bg-[#EA581A]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl bg-white dark:bg-[#18181B] text-zinc-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 border border-stone-200/85 dark:border-zinc-800 cursor-pointer"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle color theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-[#FF9E66]" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative p-2 rounded-xl bg-white dark:bg-[#18181B] text-zinc-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 border border-stone-200/85 dark:border-zinc-800 cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {openAlertsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#EA581A] ring-2 ring-white dark:ring-[#18181B]" />
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#18181B] border border-stone-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden z-40">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Notifications & AI Flags
                    </span>
                    <StatusChip label={`${openAlertsCount} open`} tone="red" dot={false} />
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {alerts
                      .filter((a) => a.status === 'open')
                      .slice(0, 4)
                      .map((alert) => (
                        <button
                          key={alert.id}
                          onClick={() => {
                            navigateToEntity('alerts', alert.id);
                            setNotifOpen(false);
                          }}
                          className="w-full p-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <StatusChip
                              label={alert.category}
                              tone={alert.severity === 'critical' ? 'red' : 'amber'}
                            />
                            <span className="text-[11px] text-slate-400">{alert.detectedAt}</span>
                          </div>
                          <p className="text-xs font-medium text-slate-900 dark:text-white">
                            {alert.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {alert.summary}
                          </p>
                        </button>
                      ))}
                  </div>
                  <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/70 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                    <button
                      onClick={() => {
                        setRoute('alerts');
                        setNotifOpen(false);
                      }}
                      className="text-xs font-medium text-[#EA581A] dark:text-[#FF9E66] hover:underline cursor-pointer"
                    >
                      View all alerts →
                    </button>
                    <button
                      onClick={() => {
                        setAiLogOpen(true);
                        setNotifOpen(false);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    >
                      AI Action Log
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-[1400px] w-full mx-auto pb-28">
          {children}
        </main>
      </div>
    </div>
  );
}
