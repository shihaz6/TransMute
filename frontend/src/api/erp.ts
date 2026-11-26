// One function per backend endpoint the screens use. Request bodies match the backend's
// input records; responses are the DTOs in dto.ts (the context maps them to UI types).

import { apiFileUrl, apiGet, apiSend, apiUpload } from '@/api/client';
import type {
  AiSettingDto,
  AnomalyAlertDto,
  ApprovalRuleDto,
  AuditEntryDto,
  BankLineDto,
  CatalystMessageDto,
  CollectionItemDto,
  CustomerDto,
  DashboardSummaryDto,
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

/** A line as sent to the backend. Stock levels are looked up on the server. */
export interface OrderLineInput {
  id?: string;
  sku?: string;
  productName?: string;
  qty: number;
  unit?: string;
  unitPrice?: number;
}

export interface ReceiptInput {
  receivedBy?: string;
  warehouse?: string;
  notes?: string;
  lines: { sku: string; qty: number }[];
}

export interface DocumentFieldsInput {
  supplier?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  supplierAddress?: string;
  supplierNtn?: string;
}

export interface PaymentInput {
  paymentDate?: string;
  customerName: string;
  method: string;
  amount: number;
  reference?: string;
  chequeNumber?: string;
  chequeBank?: string;
  chequeDueDate?: string;
  invoiceRef?: string;
}

export interface BankLineInput {
  statementDate: string;
  bankDescription: string;
  type: 'credit' | 'debit';
  amount: number;
}

export const erpApi = {
  // Customers
  customers: () => apiGet<CustomerDto[]>('/api/customers'),
  createCustomer: (body: Partial<CustomerDto>) => apiSend<CustomerDto>('POST', '/api/customers', body),
  updateCustomer: (id: string, body: Partial<CustomerDto>) => apiSend<CustomerDto>('PUT', `/api/customers/${id}`, body),

  // Inventory
  inventory: () => apiGet<InventoryItemDto[]>('/api/inventory'),
  createInventoryItem: (body: Partial<InventoryItemDto>) => apiSend<InventoryItemDto>('POST', '/api/inventory', body),
  updateInventoryItem: (id: string, body: Partial<InventoryItemDto>) =>
    apiSend<InventoryItemDto>('PUT', `/api/inventory/${id}`, body),
  adjustStock: (id: string, location: 'warehouse' | 'shop' | 'van', delta: number, reason?: string) =>
    apiSend<InventoryItemDto>('POST', `/api/inventory/${id}/stock`, { location, delta, reason }),

  // Sales orders and quotes
  orders: () => apiGet<SalesOrderDto[]>('/api/orders'),
  createOrder: (body: { type: 'order' | 'quote'; customerId: string; source?: string; items?: OrderLineInput[] }) =>
    apiSend<SalesOrderDto>('POST', '/api/orders', body),
  replaceQuoteItems: (id: string, lines: OrderLineInput[]) =>
    apiSend<SalesOrderDto>('PUT', `/api/orders/${id}/items`, lines),
  convertQuote: (id: string) => apiSend<SalesOrderDto>('POST', `/api/orders/${id}/convert`),
  confirmOrder: (id: string) => apiSend<SalesOrderDto>('POST', `/api/orders/${id}/confirm`),

  // Suppliers and purchasing
  suppliers: () => apiGet<SupplierDto[]>('/api/suppliers'),
  purchaseOrders: () => apiGet<PurchaseOrderDto[]>('/api/purchase-orders'),
  goodsReceivedNotes: () => apiGet<GoodsReceivedNoteDto[]>('/api/goods-received-notes'),
  draftPurchaseOrderFromInventory: (itemId: string) =>
    apiSend<PurchaseOrderDto>('POST', `/api/purchase-orders/from-inventory/${itemId}`),
  sendPurchaseOrder: (id: string) => apiSend<PurchaseOrderDto>('POST', `/api/purchase-orders/${id}/send`),
  receivePurchaseOrder: (id: string, receipt: ReceiptInput) =>
    apiSend<PurchaseOrderDto>('POST', `/api/purchase-orders/${id}/receive`, receipt),

  // Documents
  documents: () => apiGet<InboxDocumentDto[]>('/api/documents'),
  uploadDocument: (file: File, channel: string) => apiUpload<InboxDocumentDto>('/api/documents', file, channel),
  updateDocumentFields: (id: string, body: DocumentFieldsInput) =>
    apiSend<InboxDocumentDto>('PATCH', `/api/documents/${id}`, body),
  approveDocument: (id: string) => apiSend<InboxDocumentDto>('POST', `/api/documents/${id}/approve`),
  rejectDocument: (id: string) => apiSend<InboxDocumentDto>('POST', `/api/documents/${id}/reject`),
  documentFileUrl: (id: string) => apiFileUrl(`/api/documents/${id}/file`),

  // Collections
  collections: () => apiGet<CollectionItemDto[]>('/api/collections'),
  syncCollections: () => apiSend<{ added: number }>('POST', '/api/collections/sync'),
  changeCollectionTone: (id: string, tone: string) =>
    apiSend<CollectionItemDto>('PATCH', `/api/collections/${id}/tone`, { tone }),
  updateCollectionDraft: (id: string, message: string) =>
    apiSend<CollectionItemDto>('PATCH', `/api/collections/${id}/draft`, { message }),
  sendCollectionReminder: (id: string) => apiSend<CollectionItemDto>('POST', `/api/collections/${id}/send`),
  recordPromise: (id: string, body: { amount?: number; date: string }) =>
    apiSend<CollectionItemDto>('POST', `/api/collections/${id}/promise`, body),

  // Accounting
  ledger: () => apiGet<LedgerEntryDto[]>('/api/accounting/ledger'),
  payments: () => apiGet<PaymentRecordDto[]>('/api/accounting/payments'),
  recordPayment: (body: PaymentInput) => apiSend<PaymentRecordDto>('POST', '/api/accounting/payments', body),
  setChequeStatus: (id: string, status: string) =>
    apiSend<PaymentRecordDto>('PATCH', `/api/accounting/payments/${id}/cheque-status`, { status }),
  bankLines: () => apiGet<BankLineDto[]>('/api/accounting/bank-lines'),
  importBankLines: (lines: BankLineInput[]) => apiSend<BankLineDto[]>('POST', '/api/accounting/bank-lines', lines),
  acceptBankLine: (id: string) => apiSend<BankLineDto>('POST', `/api/accounting/bank-lines/${id}/accept`),

  // Alerts and audit log
  alerts: () => apiGet<AnomalyAlertDto[]>('/api/alerts'),
  raiseAlert: (body: Partial<AnomalyAlertDto>) => apiSend<AnomalyAlertDto>('POST', '/api/alerts', body),
  setAlertStatus: (id: string, status: 'open' | 'resolved' | 'dismissed') =>
    apiSend<AnomalyAlertDto>('PATCH', `/api/alerts/${id}/status`, { status }),
  auditLog: () => apiGet<AuditEntryDto[]>('/api/audit-log'),

  // Settings
  approvalRules: () => apiGet<ApprovalRuleDto[]>('/api/settings/approval-rules'),
  addApprovalRule: (body: { name: string; condition: string; approver?: string }) =>
    apiSend<ApprovalRuleDto>('POST', '/api/settings/approval-rules', body),
  setApprovalRuleActive: (id: string, active: boolean) =>
    apiSend<ApprovalRuleDto>('PATCH', `/api/settings/approval-rules/${id}`, { active }),
  aiSettings: () => apiGet<AiSettingDto[]>('/api/settings/ai'),
  addAiSetting: (body: { task: string; description?: string; mode: string; threshold?: string }) =>
    apiSend<AiSettingDto>('POST', '/api/settings/ai', body),
  setAiMode: (id: string, mode: string) => apiSend<AiSettingDto>('PATCH', `/api/settings/ai/${id}`, { mode }),

  // Catalyst chat
  catalystMessages: () => apiGet<CatalystMessageDto[]>('/api/catalyst/messages'),
  sendCatalystMessage: (text: string) => apiSend<CatalystMessageDto>('POST', '/api/catalyst/messages', { text }),

  // Reports and dashboard
  report: (kind: 'receivables' | 'stock' | 'purchase-orders') => apiGet<ReportViewDto>(`/api/reports/${kind}`),
  dashboard: () => apiGet<DashboardSummaryDto>('/api/dashboard'),
};
