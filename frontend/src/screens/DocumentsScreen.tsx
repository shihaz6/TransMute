import React, { useState, useMemo, useRef } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Edit3,
  FileCheck2,
  FileText,
  Mail,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Upload,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useErp } from '@/context/ErpContext';
import {
  Button,
  Card,
  cn,
  ConfidenceBadge,
  EmptyState,
  PageHeader,
  SearchInput,
  StatusChip,
} from '@/components/ui/Primitives';
import { DocChannel, DocStatus, InboxDocument } from '@/types/erp';
import { formatRs } from '@/utils/format';
import { apiDateFromText } from '@/utils/dates';
import type { DocumentFieldsInput } from '@/api/erp';

const DOC_STATUS_FILTERS = ['all', 'needs-review', 'auto-posted', 'approved', 'rejected', 'failed'] as const;
type DocStatusFilter = (typeof DOC_STATUS_FILTERS)[number];

const isDocStatusFilter = (value: string): value is DocStatusFilter =>
  (DOC_STATUS_FILTERS as readonly string[]).includes(value);

// Strict amount parsing for inline edits. Returns null when the text is not a clear number,
// so the caller refuses to save instead of writing a wrong value. Thousands separators are
// removed only in the unambiguous "1,234.50" and "1.234,50" forms.
const parseAmount = (text: string): number | null => {
  const t = text.trim();
  const lastComma = t.lastIndexOf(',');
  const lastDot = t.lastIndexOf('.');
  let normalized = t;
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // "1.234,50": dots are thousands separators, the comma is the decimal point
      if (!/^-?\d{1,3}(\.\d{3})+,\d+$/.test(t)) return null;
      normalized = t.replace(/\./g, '').replace(',', '.');
    } else {
      // "1,234.50": commas are thousands separators, the dot is the decimal point
      if (!/^-?\d{1,3}(,\d{3})+\.\d+$/.test(t)) return null;
      normalized = t.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    // A lone comma is ambiguous ("1,234" could mean 1.234), so it is refused.
    return null;
  }
  if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
};

export function DocumentsScreen() {
  const {
    documents,
    selectedDocId,
    setSelectedDocId,
    addToast,
    navigateToEntity,
    uploadDocuments,
    updateDocumentFields,
    approveDocument,
    rejectDocument,
  } = useErp();

  const [channelFilter, setChannelFilter] = useState<'all' | DocChannel>('all');
  const [statusFilter, setStatusFilter] = useState<DocStatusFilter>('all');
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [highlightField, setHighlightField] = useState<string | null>(null);

  const activeDoc = useMemo(
    () => documents.find((d) => d.id === selectedDocId) || null,
    [documents, selectedDocId]
  );

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      if (channelFilter !== 'all' && d.channel !== channelFilter) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (
        search.trim() &&
        !d.supplier.value.toLowerCase().includes(search.toLowerCase()) &&
        !d.invoiceNumber.value.toLowerCase().includes(search.toLowerCase()) &&
        !d.fileName.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [documents, channelFilter, statusFilter, search]);

  // Uploaded files are stored by the backend. No values are extracted from them, so each
  // document waits in review for its fields to be entered by hand.
  // In-flight guard: a repeat click on the same action is ignored until the first one finishes.
  // The ref is checked and set synchronously before the await; the state mirrors it so the
  // matching button can be disabled while the request is pending.
  const inFlight = useRef<Set<string>>(new Set());
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

  const runGuarded = async (key: string, task: () => Promise<unknown>): Promise<boolean> => {
    if (inFlight.current.has(key)) return false;
    inFlight.current.add(key);
    setPendingActions((prev) => new Set(prev).add(key));
    try {
      await task();
      return true;
    } finally {
      inFlight.current.delete(key);
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const addUploadedFiles = async (files: FileList | null, channel: DocChannel = 'upload') => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    const ran = await runGuarded('upload', async () => {
      const newId = await uploadDocuments(list, channel);
      if (newId && list.length === 1) setSelectedDocId(newId);
    });
    if (!ran) {
      addToast({ title: 'Upload in progress', description: 'Wait for the current upload to finish.', variant: 'warning' });
    }
  };

  const handleDocAction = async (doc: InboxDocument, action: 'approved' | 'rejected') => {
    setEditMode(false);
    const key = `${action === 'approved' ? 'approve' : 'reject'}:${doc.id}`;
    await runGuarded(key, () => (action === 'approved' ? approveDocument(doc.id) : rejectDocument(doc.id)));
  };

  // Field edits are held here while typing and saved to the backend when the field loses focus.
  const [fieldDraft, setFieldDraft] = useState<{ docId: string; field: string; value: string } | null>(null);

  const draftValue = (docId: string, field: string, saved: string) =>
    fieldDraft && fieldDraft.docId === docId && fieldDraft.field === field ? fieldDraft.value : saved;

  const handleUpdateField = (
    docId: string,
    field: 'invoiceNumber' | 'invoiceDate' | 'dueDate' | 'total',
    newValue: string
  ) => {
    setFieldDraft({ docId, field, value: newValue });
  };

  const commitField = (
    docId: string,
    field: 'invoiceNumber' | 'invoiceDate' | 'dueDate' | 'total',
    value: string
  ) => {
    setFieldDraft(null);
    const doc = documents.find((d) => d.id === docId);
    const payload: DocumentFieldsInput = {};
    if (field === 'total') {
      const amount = parseAmount(value);
      if (amount === null) {
        addToast({
          title: 'Enter a valid amount',
          description: 'Use digits with an optional minus sign and decimal point, such as 12500.00. The saved amount was not changed.',
          variant: 'warning',
        });
        return;
      }
      if (amount === doc?.total.value) return;
      payload.total = amount;
    } else if (field === 'invoiceNumber') {
      const text = value.trim();
      if (!text) {
        addToast({ title: 'Invoice number is required', description: 'The saved invoice number was not changed.', variant: 'warning' });
        return;
      }
      if (text === doc?.invoiceNumber.value) return;
      payload.invoiceNumber = text;
    } else {
      const iso = apiDateFromText(value);
      if (!iso) {
        if (value.trim()) {
          addToast({ title: 'Enter a valid date', description: 'Use a date such as 14 Apr 2026.', variant: 'warning' });
        }
        return;
      }
      if (value.trim() === doc?.[field].value) return;
      payload[field] = iso;
    }
    void runGuarded(`field:${docId}:${field}`, () => updateDocumentFields(docId, payload));
  };

  const statusChip = (status: DocStatus) => {
    switch (status) {
      case 'auto-posted':
        return <StatusChip label="Auto-posted" tone="green" />;
      case 'approved':
        return <StatusChip label="Approved" tone="green" />;
      case 'needs-review':
        return <StatusChip label="Needs review" tone="amber" />;
      case 'failed':
        return <StatusChip label="Failed" tone="red" />;
      case 'rejected':
        return <StatusChip label="Rejected" tone="slate" />;
    }
  };

  const channelBadge = (ch: DocChannel) => {
    if (ch === 'whatsapp') {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Photo
        </span>
      );
    }
    if (ch === 'email') {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-sky-700 dark:text-sky-400 font-medium">
          <Mail className="w-3.5 h-3.5" /> Email
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 font-medium">
        <Upload className="w-3.5 h-3.5" /> Upload
      </span>
    );
  };

  // Split View Detail Mode
  if (activeDoc) {
    const match = activeDoc.threeWayMatch;
    const isLowConf = (score: number, verifiedBy?: string) => !verifiedBy && score < 85;

    return (
      <div className="space-y-5">
        {/* Detail Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => {
                setSelectedDocId(null);
                setEditMode(false);
              }}
            >
              Back to Inbox
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {activeDoc.invoiceNumber.value}
                </h1>
                {statusChip(activeDoc.status)}
                <ConfidenceBadge score={activeDoc.overallConfidence} />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeDoc.fileName} · Received {activeDoc.receivedAt} from {activeDoc.sender}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              icon={<Edit3 className="w-3.5 h-3.5" />}
              onClick={() => setEditMode((e) => !e)}
            >
              {editMode ? 'Done Editing' : 'Edit Fields'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<XCircle className="w-3.5 h-3.5" />}
              onClick={() => handleDocAction(activeDoc, 'rejected')}
              disabled={pendingActions.has(`reject:${activeDoc.id}`)}
            >
              Reject
            </Button>
            <Button
              variant="gold"
              size="sm"
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              onClick={() => handleDocAction(activeDoc, 'approved')}
              disabled={pendingActions.has(`approve:${activeDoc.id}`)}
            >
              Approve & Post
            </Button>
          </div>
        </div>

        {/* Three-Way Match Banner */}
        <div
          className={cn(
            'p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3',
            match.status === 'matched'
              ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/70'
              : match.status === 'variance'
              ? 'bg-amber-50/90 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800/70'
              : 'bg-red-50/90 border-red-200 dark:bg-red-950/40 dark:border-red-800/70'
          )}
        >
          <div className="flex items-start gap-3">
            {match.status === 'matched' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : match.status === 'variance' ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Three-Way Match:{' '}
                  {match.status === 'matched'
                    ? 'Exact Match'
                    : match.status === 'variance'
                    ? 'Price / Charge Variance'
                    : 'Missing Goods-Received Note'}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  PO: {match.poNumber}
                </span>
                {match.grnNumber && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-white/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    GRN: {match.grnNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                {match.summary}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="xs"
            onClick={() => navigateToEntity('purchasing')}
          >
            Inspect PO & GRN
          </Button>
        </div>

        {/* Split View */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left: Original Invoice Preview */}
          <Card className="xl:col-span-5 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/70">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                {activeDoc.isPhoto ? (
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>Original {activeDoc.isPhoto ? 'WhatsApp Photo' : 'PDF Document'}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoom((z) => Math.max(85, z - 10))}
                  className="p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] tabular-nums w-9 text-center">{zoom}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(120, z + 10))}
                  className="p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Realistic Paper Invoice Visual */}
            <div className="p-5 bg-slate-200/70 dark:bg-slate-950 overflow-auto max-h-[680px]">
              <div
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                className={cn(
                  'bg-[#FFFDF8] text-slate-900 rounded-md shadow-md border border-slate-300 p-6 font-mono text-[11px] transition-transform relative',
                  activeDoc.isPhoto && 'rotate-[-0.6deg]',
                  activeDoc.status === 'failed' && 'blur-[1.2px] opacity-85'
                )}
              >
                {/* Watermark stamp */}
                <div className="absolute top-6 right-6 border-2 border-emerald-700/40 text-emerald-800/50 rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rotate-[-12deg]">
                  RECEIVED
                </div>

                {/* Letterhead */}
                <div className="border-b-2 border-slate-800 pb-3 mb-4">
                  <div className="text-sm font-bold tracking-tight uppercase text-slate-950">
                    {activeDoc.supplier.value}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5">{activeDoc.supplierAddress}</div>
                  <div className="text-[10px] text-slate-500">{activeDoc.supplierNtn}</div>
                </div>

                {/* Invoice Header Fields */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-[10px]">
                  <div>
                    <div className="text-slate-500 uppercase">Bill To:</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div
                      className={cn(
                        'px-1 rounded inline-block',
                        highlightField === 'invoiceNumber' && 'bg-amber-200/90 ring-2 ring-amber-500'
                      )}
                    >
                      <span className="text-slate-500">INV #:</span>{' '}
                      <strong>{activeDoc.invoiceNumber.value}</strong>
                    </div>
                    <div className="block">
                      <span className="text-slate-500">DATE:</span> {activeDoc.invoiceDate.value}
                    </div>
                    <div
                      className={cn(
                        'px-1 rounded inline-block',
                        (highlightField === 'dueDate' || isLowConf(activeDoc.dueDate.confidence, activeDoc.dueDate.verifiedBy)) &&
                          'bg-amber-200/80 ring-1 ring-amber-400'
                      )}
                    >
                      <span className="text-slate-500">DUE:</span>{' '}
                      <strong>{activeDoc.dueDate.value}</strong>
                    </div>
                  </div>
                </div>

                {/* Paper Line Items */}
                <table className="w-full border-collapse border-t border-b border-slate-400 mb-4">
                  <thead>
                    <tr className="border-b border-slate-300 text-left text-[9px] text-slate-500 uppercase">
                      <th className="py-1.5">Description</th>
                      <th className="py-1.5 text-right">Qty</th>
                      <th className="py-1.5 text-right">Rate</th>
                      <th className="py-1.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeDoc.lineItems.map((li) => (
                      <tr
                        key={li.id}
                        className={cn(
                          'border-b border-slate-200/80',
                          li.confidence < 85 && 'bg-amber-100/80'
                        )}
                      >
                        <td className="py-2 pr-2 font-medium">{li.description}</td>
                        <td className="py-2 text-right tabular-nums">{li.qty}</td>
                        <td className="py-2 text-right tabular-nums">
                          {li.rate.toLocaleString()}
                        </td>
                        <td className="py-2 text-right font-bold tabular-nums">
                          {li.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-48 space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Subtotal:</span>
                      <span className="tabular-nums">{formatRs(activeDoc.subtotal.value)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tax:</span>
                      <span className="tabular-nums">{formatRs(activeDoc.tax.value)}</span>
                    </div>
                    <div
                      className={cn(
                        'flex justify-between pt-1.5 border-t border-slate-800 text-xs font-bold px-1 rounded',
                        (highlightField === 'total' || isLowConf(activeDoc.total.confidence, activeDoc.total.verifiedBy)) &&
                          'bg-amber-200/80 ring-1 ring-amber-400'
                      )}
                    >
                      <span>NET TOTAL:</span>
                      <span className="tabular-nums">{formatRs(activeDoc.total.value)}</span>
                    </div>
                  </div>
                </div>

                {activeDoc.rawNotes && (
                  <div className="mt-5 pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-500 italic">
                    Note: {activeDoc.rawNotes}
                  </div>
                )}
              </div>
              {activeDoc.failureReason && (
                <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  <strong>OCR Issue:</strong> {activeDoc.failureReason}
                </div>
              )}
            </div>
          </Card>

          {/* Right: AI Extracted Fields */}
          <Card className="xl:col-span-7 p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#EA581A]" />
                  Extracted Invoice Fields
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Amber fields have lower confidence or variances. Hover a field to highlight it on the invoice.
                </p>
              </div>
              {editMode && <StatusChip label="Inline Edit Mode Active" tone="gold" />}
            </div>

            {/* Key Header Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {(
                [
                  { key: 'supplier', label: 'Supplier', field: activeDoc.supplier, editable: false },
                  { key: 'invoiceNumber', label: 'Invoice Number', field: activeDoc.invoiceNumber, editable: true },
                  { key: 'invoiceDate', label: 'Invoice Date', field: activeDoc.invoiceDate, editable: true },
                  { key: 'dueDate', label: 'Payment Due Date', field: activeDoc.dueDate, editable: true },
                ] as const
              ).map(({ key, label, field, editable }) => {
                const low = isLowConf(field.confidence, field.verifiedBy);
                return (
                  <div
                    key={key}
                    onMouseEnter={() => setHighlightField(key)}
                    onMouseLeave={() => setHighlightField(null)}
                    className={cn(
                      'p-3.5 rounded-xl border transition-all',
                      low
                        ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700/70'
                        : 'bg-slate-50/60 border-slate-200/80 dark:bg-slate-950/60 dark:border-slate-800'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {label}
                      </span>
                      <ConfidenceBadge
                        score={field.confidence}
                        verifiedBy={field.verifiedBy}
                        compact
                      />
                    </div>
                    {editMode && editable ? (
                      <input
                        value={draftValue(activeDoc.id, key, String(field.value))}
                        onChange={(e) =>
                          handleUpdateField(
                            activeDoc.id,
                            key as 'invoiceNumber' | 'invoiceDate' | 'dueDate',
                            e.target.value
                          )
                        }
                        onBlur={() =>
                          commitField(
                            activeDoc.id,
                            key as 'invoiceNumber' | 'invoiceDate' | 'dueDate',
                            draftValue(activeDoc.id, key, String(field.value))
                          )
                        }
                        className="w-full px-2.5 py-1.5 text-sm font-semibold rounded-lg bg-white dark:bg-zinc-900 border border-[#EA581A] focus:outline-none"
                      />
                    ) : (
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {field.value}
                      </div>
                    )}
                    {field.note && (
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1.5 flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                        {field.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Extracted Line Items */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5">
                Line Items ({activeDoc.lineItems.length})
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5 font-medium">Item</th>
                      <th className="px-3 py-2.5 font-medium text-right">Qty</th>
                      <th className="px-3 py-2.5 font-medium text-right">Rate (Rs.)</th>
                      <th className="px-3 py-2.5 font-medium text-right">Total</th>
                      <th className="px-3.5 py-2.5 font-medium text-right">AI Conf.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeDoc.lineItems.map((li) => {
                      const low = li.confidence < 85;
                      return (
                        <tr
                          key={li.id}
                          className={cn(
                            low && 'bg-amber-50/75 dark:bg-amber-950/25'
                          )}
                        >
                          <td className="px-3.5 py-3">
                            <div className="font-medium text-slate-900 dark:text-white">
                              {li.description}
                            </div>
                            {li.sku && (
                              <div className="text-[10px] text-slate-400">SKU: {li.sku}</div>
                            )}
                            {li.note && (
                              <div className="text-[11px] text-amber-800 dark:text-amber-300 mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                {li.note}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
                            {li.qty} {li.unit}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
                            {formatRs(li.rate)}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap">
                            {formatRs(li.amount)}
                          </td>
                          <td className="px-3.5 py-3 text-right">
                            <ConfidenceBadge score={li.confidence} compact />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Box */}
            <div
              onMouseEnter={() => setHighlightField('total')}
              onMouseLeave={() => setHighlightField(null)}
              className={cn(
                'p-4 rounded-xl border space-y-2',
                isLowConf(activeDoc.total.confidence, activeDoc.total.verifiedBy)
                  ? 'bg-amber-50/80 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700/70'
                  : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
              )}
            >
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium">{formatRs(activeDoc.subtotal.value)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                <span>Tax</span>
                <span className="tabular-nums font-medium">{formatRs(activeDoc.tax.value)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Invoice Total
                  </span>
                  <ConfidenceBadge
                    score={activeDoc.total.confidence}
                    verifiedBy={activeDoc.total.verifiedBy}
                  />
                </div>
                {editMode ? (
                  <input
                    value={draftValue(activeDoc.id, 'total', String(activeDoc.total.value))}
                    onChange={(e) => handleUpdateField(activeDoc.id, 'total', e.target.value)}
                    onBlur={() =>
                      commitField(
                        activeDoc.id,
                        'total',
                        draftValue(activeDoc.id, 'total', String(activeDoc.total.value))
                      )
                    }
                    className="w-36 text-right px-2.5 py-1 text-base font-bold rounded-lg bg-white dark:bg-zinc-900 border border-[#EA581A] tabular-nums"
                  />
                ) : (
                  <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                    {formatRs(activeDoc.total.value)}
                  </span>
                )}
              </div>
              {activeDoc.total.note && (
                <p className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5 pt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {activeDoc.total.note}
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Queue List View
  return (
    <div className="space-y-6">
      <PageHeader
        title="Document AI Inbox"
        subtitle="Invoices, bills, and delivery challans captured from Email, WhatsApp photos, and uploads — automatically matched to POs & GRNs."
        actions={
          <Button
            variant="gold"
            size="sm"
            icon={<Upload className="w-4 h-4" />}
            onClick={() => fileInputRef.current?.click()}
            disabled={pendingActions.has('upload')}
          >
            Upload Invoice
          </Button>
        }
      />

      {/* Drag & Drop Upload + Channel Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            addUploadedFiles(e.dataTransfer.files, 'upload');
          }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'lg:col-span-2 p-5 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4',
            isDragging
              ? 'border-[#EA581A] bg-[#FFF4EE] dark:bg-[#EA581A]/10'
              : 'border-stone-300 dark:border-zinc-700 bg-white dark:bg-[#18181B] hover:border-[#EA581A]/70'
          )}
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#FFF4EE] dark:bg-[#EA581A]/15 text-[#EA581A] flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Drop supplier PDFs or bill photos here
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Files are added to the review queue. Enter the invoice details, then review the PO/GRN match.
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="shrink-0">
            Browse Files
          </Button>
        </div>

        <Card className="p-4 flex flex-col justify-between space-y-2.5">
          <div className="text-xs font-semibold text-slate-900 dark:text-white">
            Connected Capture Channels
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Mail className="w-3.5 h-3.5 text-sky-500" />
                Email intake
              </span>
              <StatusChip label="Not connected" tone="slate" />
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                WhatsApp photos
              </span>
              <StatusChip label="Not connected" tone="slate" />
            </div>
          </div>
        </Card>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          addUploadedFiles(e.target.files, 'upload');
          e.target.value = '';
        }}
      />

      {/* Filter Bar + Document Queue Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { id: 'all', label: 'All Channels' },
                { id: 'email', label: 'Email' },
                { id: 'whatsapp', label: 'WhatsApp Photo' },
                { id: 'upload', label: 'Upload' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setChannelFilter(tab.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                  channelFilter === tab.id
                    ? 'bg-zinc-900 text-white dark:bg-[#EA581A] dark:text-white'
                    : 'text-zinc-600 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => {
                const next = e.target.value;
                setStatusFilter(isDocStatusFilter(next) ? next : 'all');
              }}
              className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-[#EA581A]"
            >
              <option value="all">All Statuses</option>
              <option value="needs-review">Needs review</option>
              <option value="auto-posted">Auto-posted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="failed">Failed</option>
            </select>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search supplier or invoice #..."
              className="w-56"
            />
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <EmptyState
            icon={<FileCheck2 className="w-6 h-6" />}
            title="No documents match your filters"
            description="Try clearing your search or channel filter, or upload a new supplier invoice."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setChannelFilter('all');
                  setStatusFilter('all');
                  setSearch('');
                }}
              >
                Reset Filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-950/70 text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-medium">Invoice & Supplier</th>
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">3-Way Match</th>
                  <th className="px-4 py-3 font-medium text-right">Amount (Rs.)</th>
                  <th className="px-4 py-3 font-medium">AI Confidence</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {doc.supplier.value}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {doc.invoiceNumber.value} · {doc.receivedAt}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">{channelBadge(doc.channel)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {doc.threeWayMatch.status === 'matched' ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          ✓ {doc.threeWayMatch.poNumber} + {doc.threeWayMatch.grnNumber}
                        </span>
                      ) : doc.threeWayMatch.status === 'variance' ? (
                        <span className="text-amber-700 dark:text-amber-400 font-medium">
                          ⚠ Variance vs {doc.threeWayMatch.poNumber}
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          Missing GRN
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                      {formatRs(doc.total.value)}
                    </td>
                    <td className="px-4 py-3.5">
                      <ConfidenceBadge score={doc.overallConfidence} compact />
                    </td>
                    <td className="px-4 py-3.5">{statusChip(doc.status)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant={doc.status === 'needs-review' ? 'gold' : 'secondary'}
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDocId(doc.id);
                        }}
                      >
                        {doc.status === 'needs-review' ? 'Review' : 'Open'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
