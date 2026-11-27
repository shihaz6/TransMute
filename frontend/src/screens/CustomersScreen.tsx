import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Bell,
  CreditCard,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  ShoppingBag,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { useErp } from '@/context/ErpContext';
import { erpApi } from '@/api/erp';
import { ApiError } from '@/api/client';
import {
  Button,
  Card,
  cn,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  StatusChip,
} from '@/components/ui/Primitives';
import { Customer, PaymentRisk } from '@/types/erp';
import { formatRs } from '@/utils/format';

// Credit utilisation as a whole percentage; 0 when no credit limit is set.
function utilisationPct(balance: number, limit: number): number {
  return limit > 0 ? Math.round((balance / limit) * 100) : 0;
}

// Simple check: something@something.something, no spaces. Empty is handled separately.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CustomersScreen() {
  const {
    customers,
    selectedCustomerId,
    setSelectedCustomerId,
    navigateToEntity,
    setRoute,
    reload,
  } = useErp();

  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | PaymentRisk>('all');
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'order' | 'payment' | 'whatsapp' | 'reminder'>('all');

  // Edit contact (phone and email) form state.
  const [contactOpen, setContactOpen] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSaving, setContactSaving] = useState(false);

  const activeCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (riskFilter !== 'all' && c.risk !== riskFilter) return false;
      if (
        search.trim() &&
        !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.contactPerson.toLowerCase().includes(search.toLowerCase()) &&
        !c.city.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [customers, riskFilter, search]);

  const openContactForm = () => {
    if (!activeCustomer) return;
    setContactPhone(activeCustomer.phone);
    setContactEmail(activeCustomer.email);
    setContactError(null);
    setContactOpen(true);
  };

  // The backend PUT copies every field, so send the full stored record with only
  // phone and email changed. Otherwise balances and limits would be overwritten.
  const saveContact = async () => {
    if (!activeCustomer) return;
    const phone = contactPhone.trim();
    const email = contactEmail.trim();
    if (email && !EMAIL_PATTERN.test(email)) {
      setContactError('Enter a valid email address, such as name@example.com.');
      return;
    }
    setContactSaving(true);
    setContactError(null);
    try {
      const current = await erpApi.getCustomer(activeCustomer.id);
      await erpApi.updateCustomer(activeCustomer.id, {
        ...current,
        phone: phone || null,
        email: email || null,
      });
      await reload();
      setContactOpen(false);
    } catch (error) {
      setContactError(error instanceof ApiError ? error.message : 'Could not save the contact details.');
    } finally {
      setContactSaving(false);
    }
  };

  const riskChip = (risk: PaymentRisk) => {
    if (risk === 'high') return <StatusChip label="High Risk" tone="red" />;
    if (risk === 'watch') return <StatusChip label="Watch" tone="amber" />;
    return <StatusChip label="Low Risk" tone="green" />;
  };

  // Customer Detail View
  if (activeCustomer) {
    const util = utilisationPct(activeCustomer.outstandingBalance, activeCustomer.creditLimit);
    const timeline = activeCustomer.timeline.filter(
      (ev) => timelineFilter === 'all' || ev.type === timelineFilter
    );

    const eventIcon = {
      order: <ShoppingBag className="w-4 h-4 text-sky-600" />,
      payment: <CreditCard className="w-4 h-4 text-emerald-600" />,
      whatsapp: <MessageSquare className="w-4 h-4 text-emerald-600" />,
      reminder: <Bell className="w-4 h-4 text-amber-600" />,
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => setSelectedCustomerId(null)}
            >
              Customers
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {activeCustomer.name}
                </h1>
                {riskChip(activeCustomer.risk)}
                <StatusChip label={activeCustomer.category} tone="slate" dot={false} />
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                <span>{activeCustomer.contactPerson}</span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {activeCustomer.phone}
                </span>
                {activeCustomer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {activeCustomer.email}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {activeCustomer.city}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Pencil className="w-4 h-4" />}
              onClick={openContactForm}
            >
              Edit contact
            </Button>
            <Button
              variant="gold"
              size="sm"
              icon={<Wallet className="w-4 h-4" />}
              onClick={() => setRoute('collections')}
            >
              Send WhatsApp Reminder
            </Button>
          </div>
        </div>

        <Modal
          open={contactOpen}
          onClose={() => setContactOpen(false)}
          title="Edit contact"
          subtitle={activeCustomer.name}
          maxWidth="max-w-md"
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setContactOpen(false)} disabled={contactSaving}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={saveContact} disabled={contactSaving}>
                {contactSaving ? 'Saving...' : 'Save'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Phone</span>
              <Input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="e.g. 0300 1234567"
                icon={<Phone className="w-4 h-4" />}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Email</span>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="name@example.com"
                icon={<Mail className="w-4 h-4" />}
              />
            </label>
            {contactError && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {contactError}
              </p>
            )}
          </div>
        </Modal>

        {/* Balance & Credit Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-xs text-slate-500">Outstanding Balance</div>
            <div className="text-xl font-bold tabular-nums mt-1 text-slate-900 dark:text-white">
              {formatRs(activeCustomer.outstandingBalance)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {activeCustomer.daysOverdue > 0
                ? `${activeCustomer.daysOverdue} days oldest overdue`
                : 'No overdue invoices'}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-slate-500">Credit Limit Used</div>
            <div className="text-xl font-bold tabular-nums mt-1 text-slate-900 dark:text-white">
              {util}%
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  util >= 100 ? 'bg-red-500' : util >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                )}
                style={{ width: `${Math.min(100, util)}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Limit: {formatRs(activeCustomer.creditLimit)}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-slate-500">Average Pay Speed</div>
            <div className="text-xl font-bold tabular-nums mt-1 text-slate-900 dark:text-white">
              {activeCustomer.avgPayDays} days
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Last order: {activeCustomer.lastOrderDate}
            </div>
          </Card>
          <Card className="p-4 border-[#FFD5BE] dark:border-[#EA581A]/35 bg-[#FFF4EE]/75 dark:bg-[#EA581A]/10">
            <div className="text-xs font-semibold text-[#C2410C] dark:text-[#FF9E66] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              AI Risk Insight
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed">
              {activeCustomer.aiRiskNote}
            </p>
          </Card>
        </div>

        {/* Unified Timeline */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Activity Timeline
              </h2>
              <p className="text-xs text-slate-500">
                Orders, payments, WhatsApp conversations, and payment reminders in one chronological thread.
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'order', label: 'Orders' },
                  { id: 'payment', label: 'Payments' },
                  { id: 'whatsapp', label: 'WhatsApp' },
                  { id: 'reminder', label: 'Reminders' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTimelineFilter(t.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer',
                    timelineFilter === t.id
                      ? 'bg-zinc-900 text-white dark:bg-[#EA581A] dark:text-white'
                      : 'text-zinc-600 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {timeline.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="w-5 h-5" />}
              title="No timeline events for this filter"
              description="Switch back to All to inspect the complete customer history."
            />
          ) : (
            <div className="space-y-3 relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
              {timeline.map((ev) => (
                <div key={ev.id} className="relative pl-12">
                  <div className="absolute left-1.5 top-3 w-7 h-7 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs">
                    {eventIcon[ev.type]}
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50/75 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {ev.title}
                        </span>
                        {ev.status && (
                          <StatusChip
                            label={ev.status}
                            tone={
                              ev.status === 'Cleared' || ev.status === 'Dispatched'
                                ? 'green'
                                : ev.status === 'Overdue'
                                ? 'red'
                                : 'amber'
                            }
                          />
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{ev.date}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                      {ev.detail}
                    </p>
                    <div className="flex items-center justify-between mt-2.5">
                      {ev.amount !== undefined ? (
                        <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                          {formatRs(ev.amount)}
                        </span>
                      ) : (
                        <span />
                      )}
                      {ev.linkedOrderId && (
                        <button
                          onClick={() => navigateToEntity('orders', ev.linkedOrderId)}
                          className="text-xs font-medium text-[#EA581A] dark:text-[#FF9E66] hover:underline cursor-pointer"
                        >
                          Open {ev.linkedOrderId} →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Table View
  const totalOutstanding = customers.reduce((s, c) => s + c.outstandingBalance, 0);
  const highRiskCount = customers.filter((c) => c.risk === 'high').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle="Track credit exposure, payment speed, overdue balances, and complete WhatsApp & order history."
        actions={
          <Button variant="gold" size="sm" onClick={() => setRoute('collections')}>
            Open Collections Board
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-slate-500">Total Active Accounts</div>
          <div className="text-2xl font-bold mt-1 tabular-nums">{customers.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">Total Receivables</div>
          <div className="text-2xl font-bold mt-1 tabular-nums">{formatRs(totalOutstanding)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">High Payment-Risk Accounts</div>
          <div className="text-2xl font-bold mt-1 tabular-nums text-red-600 dark:text-red-400">
            {highRiskCount}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { id: 'all', label: 'All Risk Levels' },
                { id: 'high', label: 'High Risk' },
                { id: 'watch', label: 'Watch' },
                { id: 'low', label: 'Low Risk' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setRiskFilter(f.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer',
                  riskFilter === f.id
                    ? 'bg-zinc-900 text-white dark:bg-[#EA581A] dark:text-white'
                    : 'text-zinc-600 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search customer, owner or city..."
            className="sm:w-64"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="No customers found"
            description="Try a different search term or risk filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-950/70 text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium text-right">Outstanding (Rs.)</th>
                  <th className="px-4 py-3 font-medium">Credit Limit</th>
                  <th className="px-4 py-3 font-medium text-right">Days Overdue</th>
                  <th className="px-4 py-3 font-medium">Payment Risk</th>
                  <th className="px-5 py-3 font-medium text-right">Timeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filtered.map((c: Customer) => {
                  const util = utilisationPct(c.outstandingBalance, c.creditLimit);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white">{c.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {c.contactPerson} · {c.city}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                        {formatRs(c.outstandingBalance)}
                      </td>
                      <td className="px-4 py-3.5 min-w-[160px]">
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="tabular-nums text-slate-600 dark:text-slate-300">
                            {formatRs(c.creditLimit)}
                          </span>
                          <span
                            className={cn(
                              'font-semibold tabular-nums',
                              util >= 100
                                ? 'text-red-600'
                                : util >= 80
                                ? 'text-amber-600'
                                : 'text-slate-500'
                            )}
                          >
                            {util}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              util >= 100
                                ? 'bg-red-500'
                                : util >= 80
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            )}
                            style={{ width: `${Math.min(100, util)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap">
                        {c.daysOverdue > 0 ? (
                          <span
                            className={cn(
                              'font-semibold',
                              c.daysOverdue >= 30 ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
                            )}
                          >
                            {c.daysOverdue} days
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">On time</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">{riskChip(c.risk)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomerId(c.id);
                          }}
                        >
                          View History
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
