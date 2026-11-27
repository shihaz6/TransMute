import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  AIActionLogEntry,
  AIAutomationSetting,
  AnomalyAlert,
  ApprovalRule,
  BankReconciliationItem,
  CatalystMessage,
  ChequeStatus,
  CollectionItem,
  Customer,
  GoodsReceivedNote,
  InboxDocument,
  InventoryItem,
  LanguageCode,
  LedgerEntry,
  NavRoute,
  PaymentRecord,
  PurchaseOrder,
  ReportResult,
  SalesOrder,
  Supplier,
  ToastItem,
} from '@/types/erp';
import { ApiError } from '@/api/client';
import {
  erpApi,
  type BankLineInput,
  type CustomerPatch,
  type DocumentFieldsInput,
  type OrderCreateInput,
  type OrderLineInput,
  type PaymentInput,
  type ReceiptInput,
} from '@/api/erp';
import type { AnomalyAlertDto, CustomerDto, InventoryItemDto, SalesOrderDto } from '@/api/dto';
import {
  toAiSetting,
  toAlert,
  toApprovalRule,
  toAuditEntry,
  toBankLine,
  toCatalystMessage,
  toCollectionItem,
  toCustomer,
  toGoodsReceivedNote,
  toInboxDocument,
  toInventoryItem,
  toLedgerEntry,
  toPaymentRecord,
  toPurchaseOrder,
  toReportResult,
  toSalesOrder,
  toSupplier,
} from '@/api/mappers';

/** The lists the context keeps. Actions reload only the lists they change. */
type Slice =
  | 'customers'
  | 'orders'
  | 'inventory'
  | 'suppliers'
  | 'pos'
  | 'grns'
  | 'documents'
  | 'collections'
  | 'ledger'
  | 'payments'
  | 'bankRecon'
  | 'alerts'
  | 'audit'
  | 'approvalRules'
  | 'aiSettings'
  | 'catalyst';

const ALL_SLICES: Slice[] = [
  'customers',
  'orders',
  'inventory',
  'suppliers',
  'pos',
  'grns',
  'documents',
  'collections',
  'ledger',
  'payments',
  'bankRecon',
  'alerts',
  'audit',
  'approvalRules',
  'aiSettings',
  'catalyst',
];

/** Maps a question typed into Reports to the report the backend computes. */
function reportKindFor(query: string): 'receivables' | 'stock' | 'purchase-orders' | null {
  const q = query.toLowerCase();
  if (/owe|overdue|receiv|debt|balance|slow/.test(q)) return 'receivables';
  if (/stock|inventory|reorder|low/.test(q)) return 'stock';
  if (/purchase|supplier|\bpo\b|\bpos\b/.test(q)) return 'purchase-orders';
  return null;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const fields = error.fields ? Object.values(error.fields).join(' ') : '';
    return fields ? `${error.message} ${fields}` : error.message;
  }
  return 'An unexpected error occurred.';
}

/** True when the server refused approval because the three-way match is not "matched". */
function isThreeWayMatchBlock(error: unknown): error is ApiError {
  return error instanceof ApiError && error.message.startsWith('Three-way match is');
}

/** The customer fields the PATCH endpoint accepts. Balance fields are never sent. */
const CUSTOMER_PATCH_KEYS: (keyof CustomerPatch)[] = ['name', 'contactPerson', 'phone', 'email', 'city', 'category'];

function setPatchKey<K extends keyof CustomerPatch>(target: CustomerPatch, key: K, value: CustomerPatch[K]) {
  target[key] = value;
}

/** Copies only the allowed keys whose value is not undefined. Nulls are kept so they clear a field. */
function pickCustomerPatch(input: CustomerPatch): CustomerPatch {
  const changes: CustomerPatch = {};
  for (const key of CUSTOMER_PATCH_KEYS) {
    if (input[key] !== undefined) setPatchKey(changes, key, input[key]);
  }
  return changes;
}

interface ErpContextValue {
  route: NavRoute;
  setRoute: (r: NavRoute) => void;
  navigateToEntity: (r: NavRoute, entityId?: string) => void;
  selectedDocId: string | null;
  setSelectedDocId: (id: string | null) => void;
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  selectedSupplierId: string | null;
  setSelectedSupplierId: (id: string | null) => void;
  selectedAlertId: string | null;
  setSelectedAlertId: (id: string | null) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  catalystOpen: boolean;
  setCatalystOpen: (open: boolean) => void;
  aiLogOpen: boolean;
  setAiLogOpen: (open: boolean) => void;

  /** True until the first load from the backend finishes. */
  loading: boolean;
  /** Set when the backend cannot be reached or the first load fails. */
  loadError: string | null;
  reload: () => Promise<void>;

  documents: InboxDocument[];
  orders: SalesOrder[];
  customers: Customer[];
  collections: CollectionItem[];
  inventory: InventoryItem[];
  suppliers: Supplier[];
  pos: PurchaseOrder[];
  grns: GoodsReceivedNote[];
  ledger: LedgerEntry[];
  payments: PaymentRecord[];
  bankRecon: BankReconciliationItem[];
  alerts: AnomalyAlert[];
  reports: ReportResult[];
  setReports: React.Dispatch<React.SetStateAction<ReportResult[]>>;
  aiLogs: AIActionLogEntry[];
  catalystMessages: CatalystMessage[];
  approvalRules: ApprovalRule[];
  aiSettings: AIAutomationSetting[];
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;

  // Actions. Each one calls the backend, reloads the lists it changed, and reports the outcome.
  createCustomer: (input: Partial<CustomerDto>) => Promise<void>;
  /** Resolves true when the change was saved. Errors are reported by toast. */
  updateCustomer: (id: string, input: CustomerPatch) => Promise<boolean>;
  createInventoryItem: (input: Partial<InventoryItemDto>) => Promise<void>;
  updateInventoryItem: (id: string, input: Partial<InventoryItemDto>) => Promise<void>;
  adjustStock: (id: string, location: 'warehouse' | 'shop' | 'van', delta: number, reason?: string) => Promise<void>;
  createDraftPoFromInventory: (item: InventoryItem) => Promise<void>;
  createOrder: (input: OrderCreateInput) => Promise<SalesOrderDto | undefined>;
  replaceQuoteItems: (id: string, lines: OrderLineInput[]) => Promise<boolean>;
  convertQuote: (id: string) => Promise<void>;
  /** creditOverride=true is the owner override for an order held at pending-review. */
  confirmOrder: (id: string, creditOverride?: boolean) => Promise<void>;
  sendPurchaseOrder: (id: string) => Promise<void>;
  receivePurchaseOrder: (id: string, receipt: ReceiptInput) => Promise<void>;
  uploadDocuments: (files: File[], channel?: string) => Promise<string | undefined>;
  updateDocumentFields: (id: string, fields: DocumentFieldsInput) => Promise<void>;
  /** Rejects with the ApiError when the three-way match blocks approval and overrideMatch is false. Other errors are reported by toast. */
  approveDocument: (id: string, overrideMatch?: boolean) => Promise<void>;
  rejectDocument: (id: string) => Promise<void>;
  syncCollections: () => Promise<void>;
  changeCollectionTone: (id: string, tone: string) => Promise<void>;
  updateCollectionDraft: (id: string, message: string) => Promise<void>;
  sendCollectionReminder: (id: string) => Promise<void>;
  recordPromise: (id: string, amount: number | undefined, date: string) => Promise<void>;
  recordPayment: (input: PaymentInput) => Promise<void>;
  updateChequeStatus: (paymentId: string, status: ChequeStatus) => Promise<void>;
  importBankLines: (lines: BankLineInput[]) => Promise<void>;
  acceptBankMatch: (itemId: string) => Promise<void>;
  setAlertStatus: (id: string, status: 'open' | 'resolved' | 'dismissed') => Promise<void>;
  raiseAlert: (input: Partial<AnomalyAlertDto>) => Promise<void>;
  addApprovalRule: (input: { name: string; condition: string; approver?: string }) => Promise<void>;
  setApprovalRuleActive: (id: string, active: boolean) => Promise<void>;
  addAiSetting: (input: { task: string; description?: string; mode: string; threshold?: string }) => Promise<void>;
  setAiMode: (id: string, mode: string) => Promise<void>;
  sendCatalystMessage: (text: string) => Promise<void>;
  runReport: (query: string) => Promise<ReportResult | undefined>;

  pendingReportQuery: string | null;
  setPendingReportQuery: (q: string | null) => void;
}

const ErpContext = createContext<ErpContextValue | null>(null);

export function ErpProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<NavRoute>('dashboard');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [catalystOpen, setCatalystOpen] = useState(false);
  const [aiLogOpen, setAiLogOpen] = useState(false);
  const [pendingReportQuery, setPendingReportQuery] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [documents, setDocuments] = useState<InboxDocument[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [grns, setGrns] = useState<GoodsReceivedNote[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [bankRecon, setBankRecon] = useState<BankReconciliationItem[]>([]);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [reports, setReports] = useState<ReportResult[]>([]);
  const [aiLogs, setAiLogs] = useState<AIActionLogEntry[]>([]);
  const [catalystMessages, setCatalystMessages] = useState<CatalystMessage[]>([]);
  const [approvalRules, setApprovalRules] = useState<ApprovalRule[]>([]);
  const [aiSettings, setAiSettings] = useState<AIAutomationSetting[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const navigateToEntity = useCallback((r: NavRoute, entityId?: string) => {
    setRoute(r);
    if (r === 'documents' && entityId) setSelectedDocId(entityId);
    if (r === 'orders' && entityId) setSelectedOrderId(entityId);
    if (r === 'customers' && entityId) setSelectedCustomerId(entityId);
    if (r === 'purchasing' && entityId) setSelectedSupplierId(entityId);
    if (r === 'alerts' && entityId) setSelectedAlertId(entityId);
  }, []);

  /** Latest request number per slice. Only the newest response for a slice is applied. */
  const sliceRequestSeq = useRef<Map<Slice, number>>(new Map());

  /** Fetches one list from the backend and returns a function that applies it to state. */
  const fetchSlice = useCallback(async (slice: Slice): Promise<() => void> => {
    switch (slice) {
      case 'customers': {
        const rows = (await erpApi.customers()).map(toCustomer);
        return () => setCustomers(rows);
      }
      case 'orders': {
        const rows = (await erpApi.orders()).map(toSalesOrder);
        return () => setOrders(rows);
      }
      case 'inventory': {
        const rows = (await erpApi.inventory()).map(toInventoryItem);
        return () => setInventory(rows);
      }
      case 'suppliers': {
        const rows = (await erpApi.suppliers()).map(toSupplier);
        return () => setSuppliers(rows);
      }
      case 'pos': {
        const rows = (await erpApi.purchaseOrders()).map(toPurchaseOrder);
        return () => setPos(rows);
      }
      case 'grns': {
        const rows = (await erpApi.goodsReceivedNotes()).map(toGoodsReceivedNote);
        return () => setGrns(rows);
      }
      case 'documents': {
        const rows = (await erpApi.documents()).map(toInboxDocument);
        return () => setDocuments(rows);
      }
      case 'collections': {
        const rows = (await erpApi.collections()).map(toCollectionItem);
        return () => setCollections(rows);
      }
      case 'ledger': {
        const rows = (await erpApi.ledger()).map(toLedgerEntry);
        return () => setLedger(rows);
      }
      case 'payments': {
        const rows = (await erpApi.payments()).map(toPaymentRecord);
        return () => setPayments(rows);
      }
      case 'bankRecon': {
        const rows = (await erpApi.bankLines()).map(toBankLine);
        return () => setBankRecon(rows);
      }
      case 'alerts': {
        const rows = (await erpApi.alerts()).map(toAlert);
        return () => setAlerts(rows);
      }
      case 'audit': {
        const rows = (await erpApi.auditLog()).map(toAuditEntry);
        return () => setAiLogs(rows);
      }
      case 'approvalRules': {
        const rows = (await erpApi.approvalRules()).map(toApprovalRule);
        return () => setApprovalRules(rows);
      }
      case 'aiSettings': {
        const rows = (await erpApi.aiSettings()).map(toAiSetting);
        return () => setAiSettings(rows);
      }
      case 'catalyst': {
        const rows = (await erpApi.catalystMessages()).map(toCatalystMessage);
        return () => setCatalystMessages(rows);
      }
    }
  }, []);

  /** Reloads one list. If a newer request for the same list started meanwhile, this response is dropped. */
  const loadSlice = useCallback(
    async (slice: Slice) => {
      const seq = (sliceRequestSeq.current.get(slice) ?? 0) + 1;
      sliceRequestSeq.current.set(slice, seq);
      const apply = await fetchSlice(slice);
      if (sliceRequestSeq.current.get(slice) === seq) apply();
    },
    [fetchSlice]
  );

  const refresh = useCallback(
    async (slices: Slice[]) => {
      await Promise.all(slices.map((s) => loadSlice(s)));
    },
    [loadSlice]
  );

  /** Refreshes lists after a successful write. A failed refresh warns instead of reporting the write as failed. */
  const refreshAfterWrite = useCallback(
    async (slices: Slice[]) => {
      try {
        await refresh(slices);
      } catch {
        addToast({
          title: 'Saved, but the screen could not refresh. Reload to see the latest.',
          variant: 'warning',
        });
      }
    },
    [refresh, addToast]
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await refresh(ALL_SLICES);
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /**
   * Runs one backend action, reloads the lists it changed, and shows a success or error toast.
   * Returns the action's result, or undefined when it failed.
   */
  const run = useCallback(
    async <T,>(slices: Slice[], work: () => Promise<T>, success?: string): Promise<T | undefined> => {
      let result: T;
      try {
        result = await work();
      } catch (error) {
        addToast({ title: 'Could not complete that', description: errorMessage(error), variant: 'error' });
        return undefined;
      }
      await refreshAfterWrite(slices);
      if (success) addToast({ title: success, variant: 'success' });
      return result;
    },
    [refreshAfterWrite, addToast]
  );

  // ----- Customers and inventory -----

  const createCustomer = useCallback(
    async (input: Partial<CustomerDto>) => {
      await run(['customers', 'audit'], () => erpApi.createCustomer(input), 'Customer added');
    },
    [run]
  );

  // Sends a PATCH with only the allowed keys that were given. Undefined means "leave it
  // unchanged" and is dropped; an explicit null is kept so it clears the field.
  const updateCustomer = useCallback(
    async (id: string, input: CustomerPatch) => {
      const changes = pickCustomerPatch(input);
      const saved = await run(['customers'], () => erpApi.patchCustomer(id, changes), 'Customer updated');
      return saved !== undefined;
    },
    [run]
  );

  const createInventoryItem = useCallback(
    async (input: Partial<InventoryItemDto>) => {
      await run(['inventory', 'audit'], () => erpApi.createInventoryItem(input), 'Item added');
    },
    [run]
  );

  const updateInventoryItem = useCallback(
    async (id: string, input: Partial<InventoryItemDto>) => {
      await run(['inventory'], () => erpApi.updateInventoryItem(id, input), 'Item updated');
    },
    [run]
  );

  const adjustStock = useCallback(
    async (id: string, location: 'warehouse' | 'shop' | 'van', delta: number, reason?: string) => {
      await run(['inventory', 'audit'], () => erpApi.adjustStock(id, location, delta, reason), 'Stock updated');
    },
    [run]
  );

  const createDraftPoFromInventory = useCallback(
    async (item: InventoryItem) => {
      await run(
        ['pos', 'audit'],
        () => erpApi.draftPurchaseOrderFromInventory(item.id),
        `Draft PO created for ${item.name}`
      );
    },
    [run]
  );

  // ----- Sales orders and quotes -----

  const createOrder = useCallback(
    async (input: OrderCreateInput) =>
      run(
        ['orders', 'inventory', 'audit'],
        () => erpApi.createOrder(input),
        input.type === 'quote' ? 'Quote created' : 'Order created'
      ),
    [run]
  );

  const replaceQuoteItems = useCallback(
    async (id: string, lines: OrderLineInput[]) => {
      const saved = await run(['orders', 'audit'], () => erpApi.replaceQuoteItems(id, lines), 'Quote lines saved');
      return saved !== undefined;
    },
    [run]
  );

  const convertQuote = useCallback(
    async (id: string) => {
      await run(['orders', 'audit'], () => erpApi.convertQuote(id), 'Quote converted to an order');
    },
    [run]
  );

  // The backend holds an order over its credit limit as pending-review and does not invoice it.
  // Only an owner override (creditOverride) invoices it, so the success toast depends on the returned status.
  const confirmOrder = useCallback(
    async (id: string, creditOverride = false) => {
      const confirmed = await run(['orders', 'customers', 'audit'], () => erpApi.confirmOrder(id, creditOverride));
      if (!confirmed) return;
      if (confirmed.status === 'pending-review') {
        addToast({
          title: 'Held for credit review. Confirm again with the owner override to invoice.',
          variant: 'warning',
        });
      } else {
        addToast({ title: 'Order confirmed and invoiced', variant: 'success' });
      }
    },
    [run, addToast]
  );

  // ----- Purchasing -----

  const sendPurchaseOrder = useCallback(
    async (id: string) => {
      await run(['pos', 'audit'], () => erpApi.sendPurchaseOrder(id), 'Purchase order sent');
    },
    [run]
  );

  const receivePurchaseOrder = useCallback(
    async (id: string, receipt: ReceiptInput) => {
      await run(['pos', 'grns', 'inventory', 'audit'], () => erpApi.receivePurchaseOrder(id, receipt), 'Goods received');
    },
    [run]
  );

  // ----- Documents -----

  const uploadDocuments = useCallback(
    async (files: File[], channel = 'upload'): Promise<string | undefined> => {
      let lastId: string | undefined;
      let uploaded = 0;
      const failures: string[] = [];
      for (const file of files) {
        try {
          lastId = (await erpApi.uploadDocument(file, channel)).id;
          uploaded += 1;
        } catch (error) {
          failures.push(errorMessage(error));
        }
      }
      if (uploaded > 0) await refreshAfterWrite(['documents', 'audit']);
      if (failures.length === 0) {
        addToast({
          title: files.length === 1 ? 'Document added to review' : `${files.length} documents added to review`,
          variant: 'success',
        });
      } else {
        addToast({
          title: `${uploaded} uploaded, ${failures.length} failed: ${failures[0]}`,
          variant: 'error',
        });
      }
      return lastId;
    },
    [refreshAfterWrite, addToast]
  );

  const updateDocumentFields = useCallback(
    async (id: string, fields: DocumentFieldsInput) => {
      await run(['documents'], () => erpApi.updateDocumentFields(id, fields));
    },
    [run]
  );

  /**
   * overrideMatch=true is the owner override for a document whose three-way match is not "matched".
   * A match block is rethrown as the ApiError so the screen can ask for confirmation instead of
   * showing an error toast. Every other failure is reported by toast, as in run().
   */
  const approveDocument = useCallback(
    async (id: string, overrideMatch = false) => {
      try {
        await erpApi.approveDocument(id, overrideMatch);
      } catch (error) {
        if (isThreeWayMatchBlock(error)) throw error;
        addToast({ title: 'Could not complete that', description: errorMessage(error), variant: 'error' });
        return;
      }
      await refreshAfterWrite(['documents', 'audit']);
      addToast({ title: 'Invoice approved', variant: 'success' });
    },
    [refreshAfterWrite, addToast]
  );

  const rejectDocument = useCallback(
    async (id: string) => {
      await run(['documents', 'audit'], () => erpApi.rejectDocument(id), 'Document rejected');
    },
    [run]
  );

  // ----- Collections -----

  const syncCollections = useCallback(async () => {
    await run(
      ['collections', 'audit'],
      () => erpApi.syncCollections(),
      'Collections board updated'
    );
  }, [run]);

  const changeCollectionTone = useCallback(
    async (id: string, tone: string) => {
      await run(['collections'], () => erpApi.changeCollectionTone(id, tone));
    },
    [run]
  );

  const updateCollectionDraft = useCallback(
    async (id: string, message: string) => {
      await run(['collections'], () => erpApi.updateCollectionDraft(id, message));
    },
    [run]
  );

  const sendCollectionReminder = useCallback(
    async (id: string) => {
      await run(['collections', 'audit'], () => erpApi.sendCollectionReminder(id), 'Reminder marked as sent');
    },
    [run]
  );

  const recordPromise = useCallback(
    async (id: string, amount: number | undefined, date: string) => {
      await run(['collections', 'audit'], () => erpApi.recordPromise(id, { amount, date }), 'Promise to pay recorded');
    },
    [run]
  );

  // ----- Accounting -----

  const recordPayment = useCallback(
    async (input: PaymentInput) => {
      await run(
        ['payments', 'ledger', 'customers', 'collections', 'audit'],
        () => erpApi.recordPayment(input),
        'Payment recorded'
      );
    },
    [run]
  );

  const updateChequeStatus = useCallback(
    async (paymentId: string, status: ChequeStatus) => {
      await run(
        ['payments', 'ledger', 'customers', 'collections', 'audit'],
        () => erpApi.setChequeStatus(paymentId, status),
        `Cheque marked ${status}`
      );
    },
    [run]
  );

  const importBankLines = useCallback(
    async (lines: BankLineInput[]) => {
      await run(['bankRecon'], () => erpApi.importBankLines(lines), 'Statement lines imported');
    },
    [run]
  );

  const acceptBankMatch = useCallback(
    async (itemId: string) => {
      await run(
        ['bankRecon', 'ledger', 'customers', 'collections', 'audit'],
        () => erpApi.acceptBankLine(itemId),
        'Bank transaction reconciled'
      );
    },
    [run]
  );

  // ----- Alerts -----

  const setAlertStatus = useCallback(
    async (id: string, status: 'open' | 'resolved' | 'dismissed') => {
      await run(
        ['alerts', 'audit'],
        () => erpApi.setAlertStatus(id, status),
        status === 'resolved' ? 'Anomaly marked resolved' : status === 'dismissed' ? 'Alert dismissed' : undefined
      );
    },
    [run]
  );

  const raiseAlert = useCallback(
    async (input: Partial<AnomalyAlertDto>) => {
      await run(['alerts', 'audit'], () => erpApi.raiseAlert(input), 'Alert raised');
    },
    [run]
  );

  // ----- Settings -----

  const addApprovalRule = useCallback(
    async (input: { name: string; condition: string; approver?: string }) => {
      await run(['approvalRules', 'audit'], () => erpApi.addApprovalRule(input), 'Approval rule added');
    },
    [run]
  );

  const setApprovalRuleActive = useCallback(
    async (id: string, active: boolean) => {
      await run(['approvalRules', 'audit'], () => erpApi.setApprovalRuleActive(id, active));
    },
    [run]
  );

  const addAiSetting = useCallback(
    async (input: { task: string; description?: string; mode: string; threshold?: string }) => {
      await run(['aiSettings', 'audit'], () => erpApi.addAiSetting(input), 'AI automation added');
    },
    [run]
  );

  const setAiMode = useCallback(
    async (id: string, mode: string) => {
      await run(['aiSettings', 'audit'], () => erpApi.setAiMode(id, mode), 'AI automation updated');
    },
    [run]
  );

  // ----- Catalyst and reports -----

  const sendCatalystMessage = useCallback(
    async (text: string) => {
      await run(['catalyst'], () => erpApi.sendCatalystMessage(text));
    },
    [run]
  );

  const runReport = useCallback(
    async (query: string): Promise<ReportResult | undefined> => {
      const kind = reportKindFor(query);
      if (!kind) {
        addToast({
          title: 'No report for that question yet',
          description: 'Try "who owes me the most", "low stock items" or "open purchase orders".',
          variant: 'info',
        });
        return undefined;
      }
      try {
        const dto = await erpApi.report(kind);
        const report = toReportResult(dto, query);
        setReports((prev) => [report, ...prev]);
        return report;
      } catch (error) {
        addToast({ title: 'Could not build the report', description: errorMessage(error), variant: 'error' });
        return undefined;
      }
    },
    [addToast]
  );

  return (
    <ErpContext.Provider
      value={{
        route,
        setRoute,
        navigateToEntity,
        selectedDocId,
        setSelectedDocId,
        selectedOrderId,
        setSelectedOrderId,
        selectedCustomerId,
        setSelectedCustomerId,
        selectedSupplierId,
        setSelectedSupplierId,
        selectedAlertId,
        setSelectedAlertId,
        darkMode,
        toggleDarkMode,
        language,
        setLanguage,
        catalystOpen,
        setCatalystOpen,
        aiLogOpen,
        setAiLogOpen,
        loading,
        loadError,
        reload,
        documents,
        orders,
        customers,
        collections,
        inventory,
        suppliers,
        pos,
        grns,
        ledger,
        payments,
        bankRecon,
        alerts,
        reports,
        setReports,
        aiLogs,
        catalystMessages,
        approvalRules,
        aiSettings,
        toasts,
        addToast,
        dismissToast,
        createCustomer,
        updateCustomer,
        createInventoryItem,
        updateInventoryItem,
        adjustStock,
        createDraftPoFromInventory,
        createOrder,
        replaceQuoteItems,
        convertQuote,
        confirmOrder,
        sendPurchaseOrder,
        receivePurchaseOrder,
        uploadDocuments,
        updateDocumentFields,
        approveDocument,
        rejectDocument,
        syncCollections,
        changeCollectionTone,
        updateCollectionDraft,
        sendCollectionReminder,
        recordPromise,
        recordPayment,
        updateChequeStatus,
        importBankLines,
        acceptBankMatch,
        setAlertStatus,
        raiseAlert,
        addApprovalRule,
        setApprovalRuleActive,
        addAiSetting,
        setAiMode,
        sendCatalystMessage,
        runReport,
        pendingReportQuery,
        setPendingReportQuery,
      }}
    >
      {children}
    </ErpContext.Provider>
  );
}

export function useErp() {
  const ctx = useContext(ErpContext);
  if (!ctx) throw new Error('useErp must be used within ErpProvider');
  return ctx;
}
