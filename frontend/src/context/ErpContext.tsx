import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
  updateCustomer: (id: string, input: Partial<CustomerDto>) => Promise<void>;
  createInventoryItem: (input: Partial<InventoryItemDto>) => Promise<void>;
  updateInventoryItem: (id: string, input: Partial<InventoryItemDto>) => Promise<void>;
  adjustStock: (id: string, location: 'warehouse' | 'shop' | 'van', delta: number, reason?: string) => Promise<void>;
  createDraftPoFromInventory: (item: InventoryItem) => Promise<void>;
  createOrder: (input: OrderCreateInput) => Promise<SalesOrderDto | undefined>;
  replaceQuoteItems: (id: string, lines: OrderLineInput[]) => Promise<boolean>;
  convertQuote: (id: string) => Promise<void>;
  confirmOrder: (id: string) => Promise<void>;
  sendPurchaseOrder: (id: string) => Promise<void>;
  receivePurchaseOrder: (id: string, receipt: ReceiptInput) => Promise<void>;
  uploadDocuments: (files: File[], channel?: string) => Promise<string | undefined>;
  updateDocumentFields: (id: string, fields: DocumentFieldsInput) => Promise<void>;
  approveDocument: (id: string) => Promise<void>;
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

  /** Fetches one list from the backend and maps it to the UI type. */
  const loadSlice = useCallback(async (slice: Slice) => {
    switch (slice) {
      case 'customers':
        return setCustomers((await erpApi.customers()).map(toCustomer));
      case 'orders':
        return setOrders((await erpApi.orders()).map(toSalesOrder));
      case 'inventory':
        return setInventory((await erpApi.inventory()).map(toInventoryItem));
      case 'suppliers':
        return setSuppliers((await erpApi.suppliers()).map(toSupplier));
      case 'pos':
        return setPos((await erpApi.purchaseOrders()).map(toPurchaseOrder));
      case 'grns':
        return setGrns((await erpApi.goodsReceivedNotes()).map(toGoodsReceivedNote));
      case 'documents':
        return setDocuments((await erpApi.documents()).map(toInboxDocument));
      case 'collections':
        return setCollections((await erpApi.collections()).map(toCollectionItem));
      case 'ledger':
        return setLedger((await erpApi.ledger()).map(toLedgerEntry));
      case 'payments':
        return setPayments((await erpApi.payments()).map(toPaymentRecord));
      case 'bankRecon':
        return setBankRecon((await erpApi.bankLines()).map(toBankLine));
      case 'alerts':
        return setAlerts((await erpApi.alerts()).map(toAlert));
      case 'audit':
        return setAiLogs((await erpApi.auditLog()).map(toAuditEntry));
      case 'approvalRules':
        return setApprovalRules((await erpApi.approvalRules()).map(toApprovalRule));
      case 'aiSettings':
        return setAiSettings((await erpApi.aiSettings()).map(toAiSetting));
      case 'catalyst':
        return setCatalystMessages((await erpApi.catalystMessages()).map(toCatalystMessage));
    }
  }, []);

  const refresh = useCallback(
    async (slices: Slice[]) => {
      await Promise.all(slices.map((s) => loadSlice(s)));
    },
    [loadSlice]
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
      try {
        const result = await work();
        await refresh(slices);
        if (success) addToast({ title: success, variant: 'success' });
        return result;
      } catch (error) {
        addToast({ title: 'Could not complete that', description: errorMessage(error), variant: 'error' });
        return undefined;
      }
    },
    [refresh, addToast]
  );

  // ----- Customers and inventory -----

  const createCustomer = useCallback(
    async (input: Partial<CustomerDto>) => {
      await run(['customers', 'audit'], () => erpApi.createCustomer(input), 'Customer added');
    },
    [run]
  );

  const updateCustomer = useCallback(
    async (id: string, input: Partial<CustomerDto>) => {
      await run(['customers'], () => erpApi.updateCustomer(id, input), 'Customer updated');
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

  const confirmOrder = useCallback(
    async (id: string) => {
      await run(['orders', 'customers', 'audit'], () => erpApi.confirmOrder(id), 'Order confirmed and invoiced');
    },
    [run]
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
    async (files: File[], channel = 'upload') =>
      run(
        ['documents', 'audit'],
        async () => {
          let lastId: string | undefined;
          for (const file of files) {
            lastId = (await erpApi.uploadDocument(file, channel)).id;
          }
          return lastId;
        },
        files.length === 1 ? 'Document added to review' : `${files.length} documents added to review`
      ),
    [run]
  );

  const updateDocumentFields = useCallback(
    async (id: string, fields: DocumentFieldsInput) => {
      await run(['documents'], () => erpApi.updateDocumentFields(id, fields));
    },
    [run]
  );

  const approveDocument = useCallback(
    async (id: string) => {
      await run(['documents', 'audit'], () => erpApi.approveDocument(id), 'Invoice approved');
    },
    [run]
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
      await run(['payments', 'ledger', 'audit'], () => erpApi.recordPayment(input), 'Payment recorded');
    },
    [run]
  );

  const updateChequeStatus = useCallback(
    async (paymentId: string, status: ChequeStatus) => {
      await run(['payments', 'ledger', 'audit'], () => erpApi.setChequeStatus(paymentId, status), `Cheque marked ${status}`);
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
      await run(['bankRecon', 'ledger', 'audit'], () => erpApi.acceptBankLine(itemId), 'Bank transaction reconciled');
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
