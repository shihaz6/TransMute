import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Phone,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useErp } from '@/context/ErpContext';
import { Button, Card, cn, PageHeader, StatusChip } from '@/components/ui/Primitives';
import { PurchaseOrder, Supplier } from '@/types/erp';
import { formatRs } from '@/utils/format';

export function PurchasingScreen() {
  const {
    pos,
    grns,
    suppliers,
    selectedSupplierId,
    setSelectedSupplierId,
    navigateToEntity,
  } = useErp();

  const [subTab, setSubTab] = useState<'pos' | 'grns' | 'suppliers'>('pos');
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedSupplierId) {
      setSubTab('suppliers');
    }
  }, [selectedSupplierId]);

  const activePo = useMemo(
    () => pos.find((p) => p.id === selectedPoId) || null,
    [pos, selectedPoId]
  );
  const activeSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierId) || null,
    [suppliers, selectedSupplierId]
  );

  const poStatusChip = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'matched':
        return <StatusChip label="3-Way Matched" tone="green" />;
      case 'received':
        return <StatusChip label="Received" tone="blue" />;
      case 'partial-received':
        return <StatusChip label="Partial Delivery" tone="amber" />;
      case 'sent':
        return <StatusChip label="Sent to Supplier" tone="slate" />;
      case 'draft':
        return <StatusChip label="AI Draft PO" tone="gold" />;
    }
  };

  // PO Detail View (Ordered vs Received vs Invoiced)
  if (activePo) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => setSelectedPoId(null)}
            >
              Back to POs
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {activePo.id} · {activePo.supplierName}
                </h1>
                {poStatusChip(activePo.status)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Created {activePo.createdAt} · Expected delivery {activePo.expectedDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activePo.linkedInvoiceId && (
              <Button
                variant="gold"
                size="sm"
                icon={<ExternalLink className="w-3.5 h-3.5" />}
                onClick={() => navigateToEntity('documents', activePo.linkedInvoiceId)}
              >
                Open Matched Invoice
              </Button>
            )}
          </div>
        </div>

        {/* Linked GRN & Invoice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-xs text-slate-500">Purchase Order Total</div>
            <div className="text-xl font-bold tabular-nums mt-1">{formatRs(activePo.total)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{activePo.lines.length} line items</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" /> Linked Goods-Received Note
            </div>
            <div className="text-base font-semibold mt-1 text-slate-900 dark:text-white">
              {activePo.grnId ? activePo.grnId : 'Not received yet'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {activePo.grnId ? 'Goods received note recorded' : 'Awaiting physical delivery'}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#EA581A]" /> Linked Supplier Invoice
            </div>
            <div className="text-base font-semibold mt-1 text-slate-900 dark:text-white flex items-center justify-between">
              <span>{activePo.linkedInvoiceId || 'Pending invoice'}</span>
              {activePo.linkedInvoiceId && (
                <button
                  onClick={() => navigateToEntity('documents', activePo.linkedInvoiceId)}
                  className="text-xs font-medium text-[#EA581A] dark:text-[#FF9E66] hover:underline cursor-pointer"
                >
                  Inspect →
                </button>
              )}
            </div>
          </Card>
        </div>

        {/* Ordered vs Received vs Invoiced Table */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            Ordered vs Received vs Invoiced Quantities
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Instant three-way reconciliation so you never pay for short-shipped goods.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium text-right">Ordered</th>
                  <th className="px-4 py-3 font-medium text-right">Received (GRN)</th>
                  <th className="px-4 py-3 font-medium text-right">Invoiced</th>
                  <th className="px-4 py-3 font-medium text-right">PO Rate</th>
                  <th className="px-4 py-3 font-medium">Match Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activePo.lines.map((line) => {
                  const qtyMatch =
                    line.orderedQty === line.receivedQty &&
                    line.receivedQty === line.invoicedQty;
                  const invoicedWithoutGrn = line.invoicedQty > line.receivedQty;
                  return (
                    <tr
                      key={line.sku}
                      className={
                        invoicedWithoutGrn ? 'bg-red-50/60 dark:bg-red-950/20' : ''
                      }
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {line.productName}
                        </div>
                        <div className="text-[11px] text-slate-400">{line.sku}</div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums">
                        {line.orderedQty} {line.unit}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums">
                        <span
                          className={
                            line.receivedQty < line.orderedQty
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }
                        >
                          {line.receivedQty} {line.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums">
                        {line.invoicedQty} {line.unit}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {formatRs(line.unitCost)}
                      </td>
                      <td className="px-4 py-3.5">
                        {qtyMatch ? (
                          <StatusChip label="Matched" tone="green" />
                        ) : invoicedWithoutGrn ? (
                          <StatusChip label="Invoiced > Received" tone="red" />
                        ) : (
                          <StatusChip label="Short Delivery" tone="amber" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  // Supplier Detail View (with Price-History Chart & Price Increase Alerts)
  if (activeSupplier) {
    const supPos = pos.filter((p) => p.supplierId === activeSupplier.id);
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => setSelectedSupplierId(null)}
            >
              Suppliers
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {activeSupplier.name}
                </h1>
                <StatusChip label={activeSupplier.paymentTerms} tone="slate" dot={false} />
                {activeSupplier.priceAlert && (
                  <StatusChip
                    label={`Price Increase +${activeSupplier.priceAlert.percentChange}%`}
                    tone="red"
                  />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                <span>{activeSupplier.contactPerson}</span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {activeSupplier.phone}
                </span>
                <span>Verified Bank: ····{activeSupplier.bankAccountLast4}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Price Increase Alert Banner */}
        {activeSupplier.priceAlert && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                  Price Increase Alert · +{activeSupplier.priceAlert.percentChange}%
                </div>
                <p className="text-xs text-amber-900/90 dark:text-amber-200 mt-1">
                  <strong>{activeSupplier.priceAlert.productName}</strong> jumped from{' '}
                  <strong>{formatRs(activeSupplier.priceAlert.oldPrice)}</strong> to{' '}
                  <strong>{formatRs(activeSupplier.priceAlert.newPrice)}</strong> ({activeSupplier.priceAlert.detectedOn}).
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="xs"
              onClick={() => navigateToEntity('documents')}
            >
              Inspect Invoice
            </Button>
          </div>
        )}

        {/* KPIs + Price History Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Supplier Performance
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">YTD Purchase Volume</span>
                <span className="font-bold tabular-nums">{formatRs(activeSupplier.ytdSpend)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">On-Time Delivery Rate</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {activeSupplier.onTimeRate}%
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Payment Terms</span>
                <span className="font-semibold">{activeSupplier.paymentTerms}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Verified Bank</span>
                <span className="font-semibold">····{activeSupplier.bankAccountLast4}</span>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-2 p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#EA581A]" />
                  6-Month Price History — {activeSupplier.trackedProduct}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your invoiced supplier rate (gold) vs regional wholesale market benchmark (slate)
                </p>
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeSupplier.priceHistory} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.18} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={['dataMin - 120', 'dataMax + 120']}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `Rs.${v}`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, fontSize: 12 }}
                    formatter={(val, name) => [
                      formatRs(Number(val ?? 0)),
                      name === 'price' ? 'Supplier Rate' : 'Market Benchmark',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#EA581A"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#EA581A' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="marketAvg"
                    stroke="#64748B"
                    strokeWidth={1.75}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Linked POs */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
            Recent Purchase Orders ({supPos.length})
          </h3>
          <div className="space-y-2">
            {supPos.map((po) => (
              <div
                key={po.id}
                onClick={() => {
                  setSelectedSupplierId(null);
                  setSelectedPoId(po.id);
                }}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    {po.id} · {po.createdAt}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    GRN: {po.grnId || 'Pending'} · Invoice: {po.linkedInvoiceId || 'Pending'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold tabular-nums">{formatRs(po.total)}</span>
                  {poStatusChip(po.status)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchasing & Suppliers"
        subtitle="Purchase orders, goods-received notes, matched invoices, and supplier price-increase tracking."
      />

      {/* Sub-navigation */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-3">
        {(
          [
            { id: 'pos', label: `Purchase Orders (${pos.length})` },
            { id: 'grns', label: `Goods-Received Notes (${grns.length})` },
            { id: 'suppliers', label: `Suppliers & Price Alerts (${suppliers.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={cn(
              'px-3.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors',
              subTab === t.id
                ? 'bg-zinc-900 text-white dark:bg-[#EA581A] dark:text-white'
                : 'text-zinc-600 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'pos' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-950/70 text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-medium">PO Number</th>
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 font-medium">Linked GRN</th>
                  <th className="px-4 py-3 font-medium">Matched Invoice</th>
                  <th className="px-4 py-3 font-medium text-right">Total (Rs.)</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Compare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {pos.map((po) => (
                  <tr
                    key={po.id}
                    onClick={() => setSelectedPoId(po.id)}
                    className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 cursor-pointer"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {po.id}
                        {po.createdByAi && <Sparkles className="w-3 h-3 text-[#EA581A]" />}
                      </div>
                      <div className="text-[11px] text-slate-500">{po.createdAt}</div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-white">
                      {po.supplierName}
                    </td>
                    <td className="px-4 py-3.5">
                      {po.grnId ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          ✓ {po.grnId}
                        </span>
                      ) : (
                        <span className="text-slate-400">Awaiting GRN</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {po.linkedInvoiceId ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToEntity('documents', po.linkedInvoiceId);
                          }}
                          className="text-[#EA581A] dark:text-[#FF9E66] font-medium hover:underline cursor-pointer"
                        >
                          {po.linkedInvoiceId} →
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums">
                      {formatRs(po.total)}
                    </td>
                    <td className="px-4 py-3.5">{poStatusChip(po.status)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Button variant="secondary" size="xs">
                        3-Way Detail
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {subTab === 'grns' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {grns.map((grn) => (
            <Card key={grn.id} className="p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{grn.id}</span>
                  <StatusChip
                    label={grn.status === 'complete' ? 'Complete' : 'Short Delivery'}
                    tone={grn.status === 'complete' ? 'green' : 'amber'}
                  />
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {grn.supplierName}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  PO: {grn.poId} · {grn.warehouse}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70">
                  {grn.notes}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>{grn.receivedBy}</span>
                {grn.linkedInvoiceId && (
                  <button
                    onClick={() => navigateToEntity('documents', grn.linkedInvoiceId)}
                    className="font-medium text-[#EA581A] dark:text-[#FF9E66] hover:underline cursor-pointer"
                  >
                    Invoice {grn.linkedInvoiceId} →
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {subTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map((sup: Supplier) => (
            <Card
              key={sup.id}
              onClick={() => setSelectedSupplierId(sup.id)}
              className="p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {sup.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {sup.category} · {sup.paymentTerms}
                    </div>
                  </div>
                </div>
                {sup.priceAlert ? (
                  <StatusChip
                    label={`Price +${sup.priceAlert.percentChange}%`}
                    tone="red"
                  />
                ) : (
                  <StatusChip label="Price Stable" tone="green" icon={<CheckCircle2 className="w-3 h-3" />} />
                )}
              </div>

              {sup.priceAlert && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {sup.priceAlert.productName}: {formatRs(sup.priceAlert.oldPrice)} →{' '}
                    <strong>{formatRs(sup.priceAlert.newPrice)}</strong>
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  YTD Spend: <strong className="text-slate-900 dark:text-white tabular-nums">{formatRs(sup.ytdSpend)}</strong>
                </span>
                <span className="text-[#EA581A] dark:text-[#FF9E66] font-medium">
                  View Price History →
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
