// Shapes of the JSON the TransMute backend returns. Field names match the Java classes.
// Timestamps are ISO-8601 strings; calendar dates are "yyyy-MM-dd". Money is a number.

export interface CustomerDto {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  city: string | null;
  category: string | null;
  outstandingBalance: number;
  creditLimit: number;
  daysOverdue: number;
  risk: string;
  avgPayDays: number;
  lastOrderDate: string | null;
  aiRiskNote: string | null;
}

export interface InventoryItemDto {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: string | null;
  warehouseStock: number;
  shopStock: number;
  vanStock: number;
  reorderLevel: number;
  dailyVelocity: number;
  unitCost: number;
  salePrice: number;
  preferredSupplierId: string | null;
  preferredSupplierName: string | null;
}

export interface OrderLineDto {
  id: string;
  sku: string | null;
  productName: string;
  qty: number;
  unit: string | null;
  unitPrice: number;
  warehouseStock: number;
  shopStock: number;
  vanStock: number;
}

export interface OriginalMessageDto {
  sender: string;
  phoneOrEmail: string;
  timestamp: string | null;
  text: string;
  voiceTranscript: boolean;
  voiceDuration: string | null;
}

export interface CreditWarningDto {
  currentBalance: number;
  creditLimit: number;
  projectedBalance: number;
  suggestion: string;
}

export interface SalesOrderDto {
  id: string;
  type: string;
  customerId: string;
  customerName: string;
  source: string;
  createdAt: string;
  status: string;
  total: number;
  originalMessage: OriginalMessageDto | null;
  items: OrderLineDto[];
  creditWarning: CreditWarningDto | null;
  aiConfidence: number | null;
}

export interface PriceAlertDto {
  productName: string;
  oldPrice: number;
  newPrice: number;
  percentChange: number;
  detectedOn: string;
}

export interface PricePointDto {
  month: string;
  price: number;
  marketAvg: number;
}

export interface SupplierDto {
  id: string;
  name: string;
  category: string | null;
  contactPerson: string | null;
  phone: string | null;
  paymentTerms: string | null;
  ytdSpend: number;
  onTimeRate: number;
  bankAccountLast4: string | null;
  trackedProduct: string | null;
  priceAlert: PriceAlertDto | null;
  priceHistory: PricePointDto[];
}

export interface PoLineDto {
  sku: string;
  productName: string;
  unit: string | null;
  orderedQty: number;
  receivedQty: number;
  invoicedQty: number;
  unitCost: number;
}

export interface PurchaseOrderDto {
  id: string;
  supplierId: string;
  supplierName: string;
  createdAt: string;
  expectedDate: string | null;
  status: string;
  total: number;
  grnId: string | null;
  linkedInvoiceId: string | null;
  createdByAi: boolean;
  lines: PoLineDto[];
}

export interface GoodsReceivedNoteDto {
  id: string;
  poId: string;
  supplierName: string;
  receivedDate: string | null;
  receivedBy: string | null;
  warehouse: string | null;
  status: string;
  linkedInvoiceId: string | null;
  notes: string | null;
}

export interface InvoiceLineDto {
  id: string;
  description: string;
  sku: string | null;
  qty: number;
  unit: string | null;
  rate: number;
  amount: number;
  confidence: number;
  note: string | null;
}

export interface ThreeWayMatchDto {
  status: string;
  poNumber: string | null;
  grnNumber: string | null;
  summary: string | null;
  poTotal: number;
  grnQtyMatched: boolean;
  varianceAmount: number | null;
}

export interface InboxDocumentDto {
  id: string;
  fileName: string;
  docType: string;
  channel: string;
  receivedAt: string;
  sender: string | null;
  status: string;
  overallConfidence: number;
  photo: boolean;
  failureReason: string | null;
  supplier: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  subtotal: number;
  tax: number;
  total: number;
  lineItems: InvoiceLineDto[];
  threeWayMatch: ThreeWayMatchDto | null;
  rawNotes: string | null;
  supplierAddress: string | null;
  supplierNtn: string | null;
}

export interface CollectionItemDto {
  id: string;
  customerId: string;
  customerName: string;
  contactPerson: string | null;
  phone: string | null;
  overdueAmount: number;
  daysOverdue: number;
  invoiceRefs: string[];
  status: string;
  scheduledFor: string | null;
  promisedDate: string | null;
  promisedAmount: number | null;
  lastContacted: string | null;
  tone: string;
  draftMessage: string | null;
}

export interface LedgerEntryDto {
  id: string;
  entryDate: string;
  description: string;
  party: string | null;
  category: string | null;
  type: string;
  amount: number;
  runningBalance: number;
  source: string;
  createdAt: string;
}

export interface PaymentRecordDto {
  id: string;
  paymentDate: string;
  customerName: string;
  method: string;
  amount: number;
  reference: string | null;
  chequeNumber: string | null;
  chequeBank: string | null;
  chequeDueDate: string | null;
  chequeStatus: string | null;
  invoiceRef: string | null;
}

export interface BankLineDto {
  id: string;
  statementDate: string;
  bankDescription: string;
  type: string;
  amount: number;
  status: string;
  aiSuggestion: { matchRef: string; party: string; confidence: number; reason: string } | null;
}

export interface AnomalyAlertDto {
  id: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  detectedAt: string;
  amountImpact: number | null;
  summary: string | null;
  whyFlagged: string | null;
  evidence: { label: string; value: string }[];
  linkedRoute: string | null;
  linkedEntityId: string | null;
}

export interface AuditEntryDto {
  id: string;
  timestamp: string;
  module: string;
  action: string;
  reason: string | null;
  confidence: number | null;
  approvedBy: string | null;
  outcome: string;
}

export interface ApprovalRuleDto {
  id: string;
  name: string;
  condition: string;
  approver: string | null;
  active: boolean;
}

export interface AiSettingDto {
  id: string;
  task: string;
  description: string | null;
  mode: string;
  threshold: string | null;
}

export interface CatalystMessageDto {
  id: string;
  sender: string;
  senderLabel: string | null;
  createdAt: string;
  text: string | null;
}

export interface ReportViewDto {
  title: string;
  summary: string;
  methodology: string;
  chartType: string;
  valueLabel: string;
  chartData: { name: string; value: number }[];
  columns: string[];
  rows: unknown[][];
}

export interface DailyHaikuDto {
  date: string;
  lines: string[];
}

export interface DashboardSummaryDto {
  cashPosition: number;
  salesOrdersTotal: number;
  receivables: number;
  accountsOverdue30Days: number;
  openPurchaseOrdersTotal: number;
  documentsNeedingReview: number;
  openAlerts: number;
  lowStockItems: number;
}
