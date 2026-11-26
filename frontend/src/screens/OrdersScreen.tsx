import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Mail,
  MessageSquare,
  Mic,
  Package,
  Plus,
  ShoppingBag,
  Sparkles,
  Store,
} from 'lucide-react';
import { useErp } from '@/context/ErpContext';
import {
  Button,
  Card,
  cn,
  ConfidenceBadge,
  EmptyState,
  Modal,
  PageHeader,
  SearchInput,
  StatusChip,
} from '@/components/ui/Primitives';
import { OrderStatus, SalesOrder } from '@/types/erp';
import { formatRs } from '@/utils/format';

export function OrdersScreen() {
  const {
    orders,
    setOrders,
    selectedOrderId,
    setSelectedOrderId,
    navigateToEntity,
    addAiLog,
    addToast,
  } = useErp();

  const [tab, setTab] = useState<'all' | 'whatsapp' | 'quotes' | 'credit-hold'>('all');
  const [search, setSearch] = useState('');
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteThreadText, setQuoteThreadText] = useState(
    'Email from Sanjeewa (Gampaha Trade Mart):\n"Good morning Rohan, please send best wholesale quotation for 35 cases Marina Coconut Oil 1L and 20 cartons Anchor Milk Powder 400g delivered to Gampaha next week."'
  );
  const [quoteCustomer, setQuoteCustomer] = useState('Gampaha Trade Mart');

  const activeOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (tab === 'whatsapp' && o.source !== 'whatsapp') return false;
      if (tab === 'quotes' && o.type !== 'quote') return false;
      if (tab === 'credit-hold' && !o.creditWarning) return false;
      if (
        search.trim() &&
        !o.customerName.toLowerCase().includes(search.toLowerCase()) &&
        !o.id.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [orders, tab, search]);

  const handleConfirmAndInvoice = (order: SalesOrder) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status: 'invoiced', type: 'order' } : o))
    );
    addAiLog({
      module: 'Orders',
      action: `Confirmed & invoiced ${order.id} for ${order.customerName} (${formatRs(order.total)})`,
      reason: order.creditWarning
        ? 'Owner approved credit-limit override after reviewing customer overdue balance.'
        : 'Stock availability verified across Main Warehouse; WhatsApp invoice PDF dispatched.',
      confidence: order.aiConfidence ?? 96,
      approvedBy: 'Rohan (Owner)',
      outcome: 'approved',
    });
    addToast({
      title: `${order.id} Confirmed & Invoiced`,
      description: `Invoice sent to ${order.customerName} and warehouse picklist generated.`,
      variant: 'success',
    });
  };

  const handleCreateQuoteFromThread = () => {
    const newId = `QT-${1095 + orders.length}`;
    const newQuote: SalesOrder = {
      id: newId,
      type: 'quote',
      customerId: 'CUST-04',
      customerName: quoteCustomer,
      source: quoteThreadText.toLowerCase().includes('whatsapp') ? 'whatsapp' : 'email',
      createdAt: 'Just now',
      status: 'quote',
      total: 192100,
      aiConfidence: 96,
      originalMessage: {
        sender: quoteCustomer,
        phoneOrEmail: 'Parsed from chat/email thread',
        timestamp: 'Just now',
        text: quoteThreadText,
      },
      items: [
        {
          id: `q-${Date.now()}-1`,
          sku: 'OIL-MAR-1L',
          productName: 'Marina Coconut Oil 1L x 12 Bottle Case',
          qty: 35,
          unit: 'Cases',
          unitPrice: 3260,
          warehouseStock: 68,
          shopStock: 12,
          vanStock: 6,
        },
        {
          id: `q-${Date.now()}-2`,
          sku: 'MLK-ANC-400',
          productName: 'Anchor Full Cream Milk Powder 400g x 24',
          qty: 20,
          unit: 'Cartons',
          unitPrice: 3900,
          warehouseStock: 14,
          shopStock: 4,
          vanStock: 2,
        },
      ],
    };
    setOrders((prev) => [newQuote, ...prev]);
    setQuoteModalOpen(false);
    setSelectedOrderId(newId);
    addAiLog({
      module: 'Orders',
      action: `Drafted Quote ${newId} for ${quoteCustomer} (Rs. 192,100) from thread`,
      reason: 'Parsed 2 SKUs with current wholesale price list and checked live warehouse stock.',
      confidence: 96,
      approvedBy: 'Rohan (Owner)',
      outcome: 'approved',
    });
    addToast({
      title: `Quote ${newId} Drafted`,
      description: 'Parsed 2 line items with live stock check.',
      variant: 'success',
    });
  };

  const statusChip = (status: OrderStatus) => {
    switch (status) {
      case 'invoiced':
      case 'dispatched':
        return <StatusChip label={status === 'invoiced' ? 'Invoiced' : 'Dispatched'} tone="green" />;
      case 'confirmed':
        return <StatusChip label="Confirmed" tone="blue" />;
      case 'pending-review':
        return <StatusChip label="Needs Review" tone="amber" />;
      case 'quote':
        return <StatusChip label="Quote Draft" tone="gold" />;
      default:
        return <StatusChip label="Draft" tone="slate" />;
    }
  };

  const sourceBadge = (source: SalesOrder['source']) => {
    if (source === 'whatsapp') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
          <MessageSquare className="w-3 h-3" /> WhatsApp AI
        </span>
      );
    }
    if (source === 'email') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800">
          <Mail className="w-3 h-3" /> Email Thread
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Store className="w-3 h-3" /> Walk-in
      </span>
    );
  };

  // Order Detail View
  if (activeOrder) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => setSelectedOrderId(null)}
            >
              All Orders
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {activeOrder.id} · {activeOrder.customerName}
                </h1>
                {statusChip(activeOrder.status)}
                {sourceBadge(activeOrder.source)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Created {activeOrder.createdAt}
                {activeOrder.aiConfidence && ` · Parsed at ${activeOrder.aiConfidence}% AI confidence`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigateToEntity('customers', activeOrder.customerId)}
            >
              View Customer
            </Button>
            {activeOrder.status !== 'invoiced' && activeOrder.status !== 'dispatched' && (
              <Button
                variant="gold"
                size="sm"
                icon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() => handleConfirmAndInvoice(activeOrder)}
              >
                Confirm & Invoice
              </Button>
            )}
          </div>
        </div>

        {/* Credit-Limit Warning Banner */}
        {activeOrder.creditWarning && (
          <div className="p-4 rounded-xl bg-red-50/90 dark:bg-red-950/40 border border-red-200 dark:border-red-800/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-300">
                  Credit Limit Exceeded — Owner Approval Required
                </div>
                <p className="text-xs text-red-900/90 dark:text-red-200 mt-1">
                  Current balance <strong>{formatRs(activeOrder.creditWarning.currentBalance)}</strong> + this order ({formatRs(activeOrder.total)}) ={' '}
                  <strong>{formatRs(activeOrder.creditWarning.projectedBalance)}</strong> against credit limit of{' '}
                  <strong>{formatRs(activeOrder.creditWarning.creditLimit)}</strong>.
                </p>
                <p className="text-xs text-red-700 dark:text-red-300/90 mt-1">
                  <strong>AI Suggestion:</strong> {activeOrder.creditWarning.suggestion}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="xs"
              onClick={() => navigateToEntity('collections')}
            >
              Send Advance Request
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left: Original Chat / Email Message */}
          <Card className="xl:col-span-4 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                {activeOrder.source === 'whatsapp' ? (
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Mail className="w-4 h-4 text-sky-500" />
                )}
                Original Source Message
              </h2>
              {activeOrder.aiConfidence && (
                <ConfidenceBadge score={activeOrder.aiConfidence} compact />
              )}
            </div>

            {activeOrder.originalMessage ? (
              <div className="rounded-xl p-4 bg-[#F3F4F1] dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {activeOrder.originalMessage.sender}
                  </span>
                  <span>{activeOrder.originalMessage.timestamp}</span>
                </div>
                {activeOrder.originalMessage.isVoiceTranscript && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/90 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium">
                    <Mic className="w-3 h-3" />
                    Voice Note Transcribed ({activeOrder.originalMessage.voiceDuration})
                  </div>
                )}
                <div className="p-3.5 rounded-xl bg-[#DCF8C6] dark:bg-emerald-950/70 text-slate-900 dark:text-emerald-50 text-xs leading-relaxed border border-emerald-200/60 dark:border-emerald-800/50">
                  {activeOrder.originalMessage.text}
                </div>
                <div className="text-[11px] text-slate-500">
                  Channel: {activeOrder.originalMessage.phoneOrEmail}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Entered directly at counter (Walk-in order).</p>
            )}

            <div className="p-3.5 rounded-xl bg-[#FFF4EE]/85 dark:bg-[#EA581A]/10 border border-[#FFD5BE] dark:border-[#EA581A]/25 text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
              <div className="font-semibold text-[#C2410C] dark:text-[#FF9E66] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                How Transmute Parsed This
              </div>
              <p className="leading-relaxed">
                Matched customer mobile number, resolved local Singlish/English item names to exact SKUs, applied {activeOrder.customerName} wholesale tier pricing, and checked stock across Peliyagoda Stores, Pettah Shop & Van 1.
              </p>
            </div>
          </Card>

          {/* Right: Parsed Items + Stock Availability Per Line */}
          <Card className="xl:col-span-8 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Parsed Items & Live Stock Check
              </h2>
              <span className="text-xs text-slate-500">{activeOrder.items.length} line items</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product / SKU</th>
                    <th className="px-3 py-3 font-medium text-right">Ordered Qty</th>
                    <th className="px-3 py-3 font-medium">Stock Availability</th>
                    <th className="px-3 py-3 font-medium text-right">Unit Price</th>
                    <th className="px-4 py-3 font-medium text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeOrder.items.map((item) => {
                    const totalAvail = item.warehouseStock + item.shopStock + item.vanStock;
                    const enough = totalAvail >= item.qty;
                    return (
                      <tr key={item.id} className={!enough ? 'bg-amber-50/70 dark:bg-amber-950/20' : ''}>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {item.productName}
                          </div>
                          <div className="text-[11px] text-slate-400">{item.sku}</div>
                        </td>
                        <td className="px-3 py-3.5 text-right font-semibold tabular-nums whitespace-nowrap">
                          {item.qty} {item.unit}
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="flex flex-col gap-1">
                            {enough ? (
                              <StatusChip
                                label={`Available (${totalAvail} total)`}
                                tone="green"
                              />
                            ) : (
                              <StatusChip
                                label={`Short by ${item.qty - totalAvail} ${item.unit}`}
                                tone="red"
                              />
                            )}
                            <span className="text-[10px] text-slate-500">
                              WH: {item.warehouseStock} · Shop: {item.shopStock} · Van: {item.vanStock}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-right tabular-nums whitespace-nowrap">
                          {formatRs(item.unitPrice)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold tabular-nums whitespace-nowrap">
                          {formatRs(item.qty * item.unitPrice)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-400" />
                Warehouse picklist & WhatsApp invoice PDF will be generated on confirmation.
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Order Total (Rs.)</div>
                <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {formatRs(activeOrder.total)}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Orders & Quotes"
        subtitle="Orders created manually or parsed automatically from customer WhatsApp messages, voice notes, and email threads."
        actions={
          <Button
            variant="gold"
            size="sm"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => setQuoteModalOpen(true)}
          >
            Generate Quote from Chat / Email
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { id: 'all', label: `All (${orders.length})` },
                {
                  id: 'whatsapp',
                  label: `WhatsApp AI (${orders.filter((o) => o.source === 'whatsapp').length})`,
                },
                {
                  id: 'quotes',
                  label: `Quotes (${orders.filter((o) => o.type === 'quote').length})`,
                },
                {
                  id: 'credit-hold',
                  label: `Credit Warning (${orders.filter((o) => o.creditWarning).length})`,
                },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                  tab === t.id
                    ? 'bg-zinc-900 text-white dark:bg-[#EA581A] dark:text-white'
                    : 'text-zinc-600 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search order # or customer..."
            className="sm:w-64"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="w-6 h-6" />}
            title="No matching orders or quotes"
            description="Adjust your filters or generate a new quote from a WhatsApp or email thread."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-950/70 text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-medium">Order / Quote</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Checks</th>
                  <th className="px-4 py-3 font-medium text-right">Total (Rs.)</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filtered.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {order.id}
                        {order.originalMessage?.isVoiceTranscript && (
                          <Mic className="w-3 h-3 text-emerald-600" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{order.createdAt}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {order.customerName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {order.items.length} items
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{sourceBadge(order.source)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {order.creditWarning ? (
                        <StatusChip label="Over Credit Limit" tone="red" />
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          ✓ Stock & Credit OK
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                      {formatRs(order.total)}
                    </td>
                    <td className="px-4 py-3.5">{statusChip(order.status)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant={order.status === 'pending-review' ? 'gold' : 'secondary'}
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrderId(order.id);
                        }}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Generate Quote Modal */}
      <Modal
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        title="Generate Quote from Chat or Email Thread"
        subtitle="Paste a customer WhatsApp message or email — Transmute extracts SKUs, checks warehouse stock, and prices it automatically."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setQuoteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleCreateQuoteFromThread}
            >
              Draft Quote with AI
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Customer
            </label>
            <select
              value={quoteCustomer}
              onChange={(e) => setQuoteCustomer(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            >
              <option>Gampaha Trade Mart</option>
              <option>Nugegoda Fresh Mart & Bakery</option>
              <option>Kandy City Stores</option>
              <option>Ceylon Spice Kitchen & Catering</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Paste WhatsApp Chat or Email Thread
            </label>
            <textarea
              rows={4}
              value={quoteThreadText}
              onChange={(e) => setQuoteThreadText(e.target.value)}
              className="w-full p-3 text-xs rounded-xl bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 focus:outline-none focus:border-[#EA581A] leading-relaxed"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-[#FFF4EE] dark:bg-[#EA581A]/10 border border-[#FFD5BE] dark:border-[#EA581A]/30 space-y-2 text-xs">
            <div className="font-semibold text-[#C2410C] dark:text-[#FF9E66] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              AI Live Preview
            </div>
            <div className="flex justify-between text-slate-700 dark:text-slate-200">
              <span>• Marina Coconut Oil 1L x 12 Case (35 × Rs. 3,260)</span>
              <span className="font-semibold tabular-nums">Rs. 114,100</span>
            </div>
            <div className="flex justify-between text-slate-700 dark:text-slate-200">
              <span>• Anchor Full Cream Milk Powder 400g x 24 (20 × Rs. 3,900)</span>
              <span className="font-semibold tabular-nums">Rs. 78,000</span>
            </div>
            <div className="pt-1.5 border-t border-[#FFD5BE]/70 flex justify-between font-bold text-zinc-900 dark:text-white">
              <span>Draft Quote Total</span>
              <span className="tabular-nums">Rs. 192,100</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
