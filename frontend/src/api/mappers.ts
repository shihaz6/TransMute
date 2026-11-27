// Converts backend records (src/api/dto.ts) into the types the screens use (src/types/erp.ts).
// Dates become display strings. Fields the backend does not store get honest defaults:
// a value a person typed is marked verified by the owner, and an empty value has no confidence.

import type {
  AIActionLogEntry,
  AIAutomationSetting,
  AnomalyAlert,
  ApprovalRule,
  BankReconciliationItem,
  CatalystMessage,
  CollectionItem,
  Customer,
  ExtractedField,
  GoodsReceivedNote,
  InboxDocument,
  InventoryItem,
  LedgerEntry,
  NavRoute,
  PaymentRecord,
  PurchaseOrder,
  ReportResult,
  SalesOrder,
  Supplier,
} from '@/types/erp';
import { formatDisplayDate, formatDisplayDateTime, formatTime } from '@/utils/dates';
import type {
  AiSettingDto,
  AnomalyAlertDto,
  ApprovalRuleDto,
  AuditEntryDto,
  BankLineDto,
  CatalystMessageDto,
  CollectionItemDto,
  CustomerDto,
  GoodsReceivedNoteDto,
  InboxDocumentDto,
  InventoryItemDto,
  LedgerEntryDto,
  PaymentRecordDto,
  PurchaseOrderDto,
  ReportViewDto,
  SalesOrderDto,
  SupplierDto,
} from '@/api/dto';

/** Minimum stock order the backend uses when it drafts a reorder. Kept in step with it. */
const REORDER_FLOOR = 50;

function field<T extends string | number>(value: T | null | undefined, fallback: T): ExtractedField<T> {
  if (value === null || value === undefined || value === '') {
    return { value: fallback, confidence: 0 };
  }
  // Values on a document are entered by the owner, so they count as verified.
  return { value: value as T, confidence: 100, verifiedBy: 'Owner' };
}

export function toCustomer(d: CustomerDto): Customer {
  return {
    id: d.id,
    name: d.name,
    contactPerson: d.contactPerson ?? '',
    phone: d.phone ?? '',
    email: d.email ?? '',
    city: d.city ?? '',
    category: (d.category ?? 'Grocery / Retail') as Customer['category'],
    outstandingBalance: d.outstandingBalance,
    creditLimit: d.creditLimit,
    daysOverdue: d.daysOverdue,
    risk: d.risk as Customer['risk'],
    avgPayDays: d.avgPayDays,
    lastOrderDate: formatDisplayDate(d.lastOrderDate),
    aiRiskNote: d.aiRiskNote ?? '',
    // The backend does not keep a per-customer timeline yet.
    timeline: [],
  };
}

export function toInventoryItem(d: InventoryItemDto): InventoryItem {
  const total = d.warehouseStock + d.shopStock + d.vanStock;
  return {
    id: d.id,
    sku: d.sku,
    name: d.name,
    category: (d.category ?? 'Spices & Essentials') as InventoryItem['category'],
    unit: d.unit ?? '',
    warehouseStock: d.warehouseStock,
    shopStock: d.shopStock,
    vanStock: d.vanStock,
    reorderLevel: d.reorderLevel,
    unitCost: d.unitCost,
    salePrice: d.salePrice,
    preferredSupplierId: d.preferredSupplierId ?? '',
    preferredSupplierName: d.preferredSupplierName ?? '',
    dailyVelocity: d.dailyVelocity,
    suggestedReorderQty: Math.max(d.reorderLevel * 2, REORDER_FLOOR),
    daysUntilStockout: d.dailyVelocity > 0 ? Math.floor(total / d.dailyVelocity) : undefined,
  };
}

export function toSalesOrder(d: SalesOrderDto): SalesOrder {
  return {
    id: d.id,
    type: d.type as SalesOrder['type'],
    customerId: d.customerId,
    customerName: d.customerName,
    source: d.source as SalesOrder['source'],
    createdAt: formatDisplayDateTime(d.createdAt),
    status: d.status as SalesOrder['status'],
    total: d.total,
    originalMessage: d.originalMessage
      ? {
          sender: d.originalMessage.sender,
          phoneOrEmail: d.originalMessage.phoneOrEmail,
          timestamp: formatDisplayDateTime(d.originalMessage.timestamp),
          text: d.originalMessage.text,
          isVoiceTranscript: d.originalMessage.voiceTranscript,
          voiceDuration: d.originalMessage.voiceDuration ?? undefined,
        }
      : undefined,
    items: d.items.map((line) => ({
      id: line.id,
      sku: line.sku ?? '',
      productName: line.productName,
      qty: line.qty,
      unit: line.unit ?? '',
      unitPrice: line.unitPrice,
      warehouseStock: line.warehouseStock,
      shopStock: line.shopStock,
      vanStock: line.vanStock,
    })),
    creditWarning: d.creditWarning
      ? {
          currentBalance: d.creditWarning.currentBalance,
          creditLimit: d.creditWarning.creditLimit,
          projectedBalance: d.creditWarning.projectedBalance,
          suggestion: d.creditWarning.suggestion,
        }
      : undefined,
    aiConfidence: d.aiConfidence ?? undefined,
  };
}

export function toSupplier(d: SupplierDto): Supplier {
  return {
    id: d.id,
    name: d.name,
    category: d.category ?? '',
    contactPerson: d.contactPerson ?? '',
    phone: d.phone ?? '',
    paymentTerms: d.paymentTerms ?? '',
    ytdSpend: d.ytdSpend,
    onTimeRate: d.onTimeRate,
    bankAccountLast4: d.bankAccountLast4 ?? '',
    priceAlert: d.priceAlert
      ? {
          productName: d.priceAlert.productName,
          oldPrice: d.priceAlert.oldPrice,
          newPrice: d.priceAlert.newPrice,
          percentChange: d.priceAlert.percentChange,
          detectedOn: formatDisplayDate(d.priceAlert.detectedOn),
        }
      : undefined,
    trackedProduct: d.trackedProduct ?? '',
    priceHistory: d.priceHistory.map((p) => ({ month: p.month, price: p.price, marketAvg: p.marketAvg })),
  };
}

export function toPurchaseOrder(d: PurchaseOrderDto): PurchaseOrder {
  return {
    id: d.id,
    supplierId: d.supplierId,
    supplierName: d.supplierName,
    createdAt: formatDisplayDate(d.createdAt),
    expectedDate: formatDisplayDate(d.expectedDate),
    status: d.status as PurchaseOrder['status'],
    total: d.total,
    grnId: d.grnId ?? undefined,
    linkedInvoiceId: d.linkedInvoiceId ?? undefined,
    createdByAi: d.createdByAi,
    lines: d.lines.map((l) => ({
      sku: l.sku,
      productName: l.productName,
      unit: l.unit ?? '',
      orderedQty: l.orderedQty,
      receivedQty: l.receivedQty,
      invoicedQty: l.invoicedQty,
      unitCost: l.unitCost,
    })),
  };
}

export function toGoodsReceivedNote(d: GoodsReceivedNoteDto): GoodsReceivedNote {
  return {
    id: d.id,
    poId: d.poId,
    supplierName: d.supplierName,
    receivedDate: formatDisplayDate(d.receivedDate),
    receivedBy: d.receivedBy ?? '',
    warehouse: d.warehouse ?? '',
    status: d.status as GoodsReceivedNote['status'],
    linkedInvoiceId: d.linkedInvoiceId ?? undefined,
    notes: d.notes ?? '',
  };
}

export function toInboxDocument(d: InboxDocumentDto): InboxDocument {
  const match = d.threeWayMatch;
  return {
    id: d.id,
    fileName: d.fileName,
    docType: d.docType as InboxDocument['docType'],
    channel: d.channel as InboxDocument['channel'],
    receivedAt: formatDisplayDateTime(d.receivedAt),
    sender: d.sender ?? '',
    status: d.status as InboxDocument['status'],
    overallConfidence: d.overallConfidence,
    isPhoto: d.photo,
    failureReason: d.failureReason ?? undefined,
    supplier: field(d.supplier, ''),
    invoiceNumber: field(d.invoiceNumber, ''),
    invoiceDate: field(formatDisplayDate(d.invoiceDate), ''),
    dueDate: field(formatDisplayDate(d.dueDate), ''),
    subtotal: field(d.subtotal, 0),
    tax: field(d.tax, 0),
    total: field(d.total, 0),
    lineItems: d.lineItems.map((li) => ({
      id: li.id,
      description: li.description,
      sku: li.sku ?? undefined,
      qty: li.qty,
      unit: li.unit ?? '',
      rate: li.rate,
      amount: li.amount,
      confidence: li.confidence,
      note: li.note ?? undefined,
    })),
    threeWayMatch: {
      status: (match?.status ?? 'missing-grn') as InboxDocument['threeWayMatch']['status'],
      poNumber: match?.poNumber ?? '',
      grnNumber: match?.grnNumber ?? undefined,
      summary: match?.summary ?? 'Not matched yet. Review the invoice, then check the PO and GRN.',
      poTotal: match?.poTotal ?? 0,
      grnQtyMatched: match?.grnQtyMatched ?? false,
      varianceAmount: match?.varianceAmount ?? undefined,
    },
    rawNotes: d.rawNotes ?? undefined,
    supplierAddress: d.supplierAddress ?? '',
    supplierNtn: d.supplierNtn ?? '',
  };
}

export function toCollectionItem(d: CollectionItemDto): CollectionItem {
  return {
    id: d.id,
    customerId: d.customerId,
    customerName: d.customerName,
    contactPerson: d.contactPerson ?? '',
    phone: d.phone ?? '',
    overdueAmount: d.overdueAmount,
    daysOverdue: d.daysOverdue,
    invoiceRefs: d.invoiceRefs,
    status: d.status as CollectionItem['status'],
    scheduledFor: d.scheduledFor ?? '',
    promisedDate: d.promisedDate ? formatDisplayDate(d.promisedDate) : undefined,
    promisedAmount: d.promisedAmount ?? undefined,
    lastContacted: d.lastContacted ? formatDisplayDateTime(d.lastContacted) : undefined,
    tone: d.tone as CollectionItem['tone'],
    draftMessage: d.draftMessage ?? '',
  };
}

export function toLedgerEntry(d: LedgerEntryDto): LedgerEntry {
  return {
    id: d.id,
    date: formatDisplayDate(d.entryDate),
    description: d.description,
    party: d.party ?? '',
    category: d.category ?? '',
    type: d.type as LedgerEntry['type'],
    amount: d.amount,
    runningBalance: d.runningBalance,
    source: d.source as LedgerEntry['source'],
  };
}

export function toPaymentRecord(d: PaymentRecordDto): PaymentRecord {
  return {
    id: d.id,
    date: formatDisplayDate(d.paymentDate),
    customerName: d.customerName,
    method: d.method as PaymentRecord['method'],
    amount: d.amount,
    reference: d.reference ?? '',
    chequeNumber: d.chequeNumber ?? undefined,
    chequeBank: d.chequeBank ?? undefined,
    chequeDueDate: d.chequeDueDate ? formatDisplayDate(d.chequeDueDate) : undefined,
    chequeStatus: (d.chequeStatus ?? undefined) as PaymentRecord['chequeStatus'],
    invoiceRef: d.invoiceRef ?? '',
  };
}

export function toBankLine(d: BankLineDto): BankReconciliationItem {
  return {
    id: d.id,
    date: formatDisplayDate(d.statementDate),
    bankDescription: d.bankDescription,
    type: d.type as BankReconciliationItem['type'],
    amount: d.amount,
    status: d.status as BankReconciliationItem['status'],
    aiSuggestion: d.aiSuggestion ?? undefined,
  };
}

export function toAlert(d: AnomalyAlertDto): AnomalyAlert {
  return {
    id: d.id,
    title: d.title,
    category: d.category as AnomalyAlert['category'],
    severity: d.severity as AnomalyAlert['severity'],
    status: d.status as AnomalyAlert['status'],
    detectedAt: formatDisplayDateTime(d.detectedAt),
    amountImpact: d.amountImpact ?? undefined,
    summary: d.summary ?? '',
    whyFlagged: d.whyFlagged ?? '',
    evidence: d.evidence,
    linkedRoute: (d.linkedRoute ?? undefined) as NavRoute | undefined,
    linkedEntityId: d.linkedEntityId ?? undefined,
  };
}

const AUDIT_OUTCOMES: AIActionLogEntry['outcome'][] = ['auto-executed', 'approved', 'flagged', 'rejected'];

export function toAuditEntry(d: AuditEntryDto): AIActionLogEntry {
  return {
    id: d.id,
    timestamp: formatDisplayDateTime(d.timestamp),
    module: d.module as AIActionLogEntry['module'],
    action: d.action,
    reason: d.reason ?? '',
    confidence: d.confidence ?? undefined,
    approvedBy: d.approvedBy ?? '',
    outcome: AUDIT_OUTCOMES.includes(d.outcome as AIActionLogEntry['outcome'])
      ? (d.outcome as AIActionLogEntry['outcome'])
      : 'flagged',
  };
}

export function toApprovalRule(d: ApprovalRuleDto): ApprovalRule {
  return {
    id: d.id,
    name: d.name,
    condition: d.condition,
    approver: d.approver ?? 'Owner',
    active: d.active,
  };
}

export function toAiSetting(d: AiSettingDto): AIAutomationSetting {
  return {
    id: d.id,
    task: d.task,
    description: d.description ?? '',
    mode: d.mode as AIAutomationSetting['mode'],
    threshold: d.threshold ?? undefined,
  };
}

export function toCatalystMessage(d: CatalystMessageDto): CatalystMessage {
  return {
    id: d.id,
    sender: d.sender as CatalystMessage['sender'],
    senderLabel: d.senderLabel ?? undefined,
    timestamp: formatTime(d.createdAt),
    text: d.text ?? undefined,
  };
}

export function toReportResult(d: ReportViewDto, query: string): ReportResult {
  return {
    id: `REP-${Date.now()}`,
    query,
    timestamp: formatDisplayDateTime(new Date().toISOString()),
    title: d.title,
    summary: d.summary,
    methodology: d.methodology,
    chartType: d.chartType === 'line' ? 'line' : 'bar',
    chartData: d.chartData.map((p) => ({ name: p.name, value: Number(p.value) })),
    valueLabel: d.valueLabel,
    columns: d.columns,
    rows: d.rows.map((row) =>
      row.map((cell) => (typeof cell === 'number' ? cell : cell === null || cell === undefined ? '' : String(cell)))
    ),
    saved: false,
  };
}
