export type NavRoute =
  | 'dashboard'
  | 'orders'
  | 'customers'
  | 'collections'
  | 'purchasing'
  | 'inventory'
  | 'accounting'
  | 'documents'
  | 'reports'
  | 'alerts'
  | 'settings';

export type LanguageCode = 'en' | 'si' | 'ta';

export type DocChannel = 'email' | 'whatsapp' | 'upload';
export type DocStatus = 'auto-posted' | 'needs-review' | 'failed' | 'approved' | 'rejected';

export interface ExtractedField<T = string | number> {
  value: T;
  confidence: number; // 0-100
  note?: string;
  verifiedBy?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  sku?: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
  confidence: number;
  note?: string;
}

export interface ThreeWayMatch {
  status: 'matched' | 'variance' | 'missing-grn' | 'no-po';
  poNumber: string;
  grnNumber?: string;
  summary: string;
  poTotal: number;
  grnQtyMatched: boolean;
  varianceAmount?: number;
}

export interface InboxDocument {
  id: string;
  fileName: string;
  docType: 'Supplier Invoice' | 'Credit Note' | 'Delivery Challan';
  channel: DocChannel;
  receivedAt: string;
  sender: string;
  status: DocStatus;
  overallConfidence: number;
  isPhoto?: boolean;
  failureReason?: string;
  supplier: ExtractedField<string>;
  invoiceNumber: ExtractedField<string>;
  invoiceDate: ExtractedField<string>;
  dueDate: ExtractedField<string>;
  subtotal: ExtractedField<number>;
  tax: ExtractedField<number>;
  total: ExtractedField<number>;
  lineItems: InvoiceLineItem[];
  threeWayMatch: ThreeWayMatch;
  rawNotes?: string;
  supplierAddress: string;
  supplierNtn: string;
}

export type OrderStatus = 'draft' | 'quote' | 'pending-review' | 'confirmed' | 'invoiced' | 'dispatched';
export type OrderSource = 'whatsapp' | 'email' | 'walk-in' | 'phone';

export interface OrderLineItem {
  id: string;
  sku: string;
  productName: string;
  qty: number;
  unit: string;
  unitPrice: number;
  warehouseStock: number;
  shopStock: number;
  vanStock: number;
}

export interface SalesOrder {
  id: string;
  type: 'order' | 'quote';
  customerId: string;
  customerName: string;
  source: OrderSource;
  createdAt: string;
  status: OrderStatus;
  total: number;
  originalMessage?: {
    sender: string;
    phoneOrEmail: string;
    timestamp: string;
    text: string;
    isVoiceTranscript?: boolean;
    voiceDuration?: string;
  };
  items: OrderLineItem[];
  creditWarning?: {
    currentBalance: number;
    creditLimit: number;
    projectedBalance: number;
    suggestion: string;
  };
  aiConfidence?: number;
}

export type PaymentRisk = 'low' | 'watch' | 'high';

export interface CustomerTimelineEvent {
  id: string;
  type: 'order' | 'payment' | 'whatsapp' | 'reminder';
  date: string;
  title: string;
  detail: string;
  amount?: number;
  status?: string;
  linkedOrderId?: string;
}

export interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  city: string;
  category: 'Supermarket' | 'Grocery / Retail' | 'Sub-Distributor' | 'Hotel / Bakery';
  outstandingBalance: number;
  creditLimit: number;
  daysOverdue: number;
  risk: PaymentRisk;
  avgPayDays: number;
  lastOrderDate: string;
  aiRiskNote: string;
  timeline: CustomerTimelineEvent[];
}

export type ReminderStatus = 'scheduled' | 'sent' | 'promised' | 'escalated';

export interface CollectionItem {
  id: string;
  customerId: string;
  customerName: string;
  contactPerson: string;
  phone: string;
  overdueAmount: number;
  daysOverdue: number;
  invoiceRefs: string[];
  status: ReminderStatus;
  scheduledFor: string;
  promisedDate?: string;
  promisedAmount?: number;
  lastContacted?: string;
  tone: 'friendly' | 'firm' | 'final';
  draftMessage: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: 'Cooking Oil & Coconut' | 'Flour, Rice & Sugar' | 'Beverages' | 'Tea & Dairy' | 'Spices & Essentials';
  unit: string;
  warehouseStock: number;
  shopStock: number;
  vanStock: number;
  reorderLevel: number;
  unitCost: number;
  salePrice: number;
  preferredSupplierId: string;
  preferredSupplierName: string;
  dailyVelocity: number;
  suggestedReorderQty?: number;
  daysUntilStockout?: number;
}

export interface PurchaseOrderLine {
  sku: string;
  productName: string;
  unit: string;
  orderedQty: number;
  receivedQty: number;
  invoicedQty: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  createdAt: string;
  expectedDate: string;
  status: 'draft' | 'sent' | 'partial-received' | 'received' | 'matched';
  total: number;
  grnId?: string;
  linkedInvoiceId?: string;
  lines: PurchaseOrderLine[];
  createdByAi?: boolean;
}

export interface GoodsReceivedNote {
  id: string;
  poId: string;
  supplierName: string;
  receivedDate: string;
  receivedBy: string;
  warehouse: string;
  status: 'complete' | 'short-delivery';
  linkedInvoiceId?: string;
  notes: string;
}

export interface PriceHistoryPoint {
  month: string;
  price: number;
  marketAvg: number;
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  contactPerson: string;
  phone: string;
  paymentTerms: string;
  ytdSpend: number;
  onTimeRate: number;
  bankAccountLast4: string;
  priceAlert?: {
    productName: string;
    oldPrice: number;
    newPrice: number;
    percentChange: number;
    detectedOn: string;
  };
  trackedProduct: string;
  priceHistory: PriceHistoryPoint[];
}

export interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  party: string;
  category: string;
  type: 'in' | 'out';
  amount: number;
  runningBalance: number;
  source: 'AI Auto-posted' | 'Bank Match' | 'Manual' | 'Cheque Cleared';
}

export type ChequeStatus = 'received' | 'deposited' | 'cleared' | 'bounced';

export interface PaymentRecord {
  id: string;
  date: string;
  customerName: string;
  method: 'Cash' | 'Bank Transfer' | 'Cheque';
  amount: number;
  reference: string;
  chequeNumber?: string;
  chequeBank?: string;
  chequeDueDate?: string;
  chequeStatus?: ChequeStatus;
  invoiceRef: string;
}

export interface BankReconciliationItem {
  id: string;
  date: string;
  bankDescription: string;
  type: 'credit' | 'debit';
  amount: number;
  status: 'suggested' | 'matched' | 'unmatched';
  aiSuggestion?: {
    matchRef: string;
    party: string;
    confidence: number;
    reason: string;
  };
}

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'open' | 'resolved' | 'dismissed';

export interface AnomalyAlert {
  id: string;
  title: string;
  category: 'Duplicate Invoice' | 'Unusual Amount' | 'Bank Details Changed' | 'Stock Shrinkage' | 'Margin Drop';
  severity: AlertSeverity;
  status: AlertStatus;
  detectedAt: string;
  amountImpact?: number;
  summary: string;
  whyFlagged: string;
  evidence: { label: string; value: string }[];
  linkedRoute?: NavRoute;
  linkedEntityId?: string;
}

export interface ReportResult {
  id: string;
  query: string;
  timestamp: string;
  title: string;
  summary: string;
  methodology: string;
  chartType: 'bar' | 'line';
  chartData: { name: string; value: number; secondary?: number }[];
  valueLabel: string;
  secondaryLabel?: string;
  columns: string[];
  rows: (string | number)[][];
  saved?: boolean;
}

export interface AIActionLogEntry {
  id: string;
  timestamp: string;
  module: 'Documents' | 'Orders' | 'Collections' | 'Inventory' | 'Accounting' | 'Alerts' | 'Catalyst';
  action: string;
  reason: string;
  confidence?: number;
  approvedBy: string;
  outcome: 'auto-executed' | 'approved' | 'flagged' | 'rejected';
}

export interface CatalystMessage {
  id: string;
  sender: 'user' | 'ai';
  senderLabel?: string;
  timestamp: string;
  text?: string;
  voiceNote?: {
    duration: string;
    seconds: number;
    transcript: string;
    waveform: number[];
  };
  orderPreview?: {
    customer: string;
    orderId: string;
    items: { name: string; qty: string; price: number; stockStatus: 'in-stock' | 'low-stock'; stockNote: string }[];
    total: number;
    creditStatus: string;
    confirmed?: boolean;
  };
}

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'warning' | 'error' | 'info';
}

export interface ApprovalRule {
  id: string;
  name: string;
  condition: string;
  approver: string;
  active: boolean;
}

export interface AIAutomationSetting {
  id: string;
  task: string;
  description: string;
  mode: 'auto-post' | 'always-review';
  threshold?: string;
}
