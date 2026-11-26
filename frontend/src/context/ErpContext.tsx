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
  documents: InboxDocument[];
  setDocuments: React.Dispatch<React.SetStateAction<InboxDocument[]>>;
  orders: SalesOrder[];
  setOrders: React.Dispatch<React.SetStateAction<SalesOrder[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  collections: CollectionItem[];
  setCollections: React.Dispatch<React.SetStateAction<CollectionItem[]>>;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  suppliers: Supplier[];
  pos: PurchaseOrder[];
  setPos: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  grns: GoodsReceivedNote[];
  ledger: LedgerEntry[];
  setLedger: React.Dispatch<React.SetStateAction<LedgerEntry[]>>;
  payments: PaymentRecord[];
  setPayments: React.Dispatch<React.SetStateAction<PaymentRecord[]>>;
  bankRecon: BankReconciliationItem[];
  setBankRecon: React.Dispatch<React.SetStateAction<BankReconciliationItem[]>>;
  alerts: AnomalyAlert[];
  setAlerts: React.Dispatch<React.SetStateAction<AnomalyAlert[]>>;
  reports: ReportResult[];
  setReports: React.Dispatch<React.SetStateAction<ReportResult[]>>;
  aiLogs: AIActionLogEntry[];
  addAiLog: (entry: Omit<AIActionLogEntry, 'id' | 'timestamp'>) => void;
  catalystMessages: CatalystMessage[];
  setCatalystMessages: React.Dispatch<React.SetStateAction<CatalystMessage[]>>;
  approvalRules: ApprovalRule[];
  setApprovalRules: React.Dispatch<React.SetStateAction<ApprovalRule[]>>;
  aiSettings: AIAutomationSetting[];
  setAiSettings: React.Dispatch<React.SetStateAction<AIAutomationSetting[]>>;
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
  createDraftPoFromInventory: (item: InventoryItem) => void;
  updateChequeStatus: (paymentId: string, status: ChequeStatus) => void;
  acceptBankMatch: (itemId: string) => void;
  pendingReportQuery: string | null;
  setPendingReportQuery: (q: string | null) => void;
}

const ErpContext = createContext<ErpContextValue | null>(null);

// e.g. "14 Apr 2026" — the format used across ERP records.
function formatErpDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

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

  // All business data starts empty. Records must come from a real data source,
  // not from seeded demo fixtures.
  const [documents, setDocuments] = useState<InboxDocument[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [suppliers] = useState<Supplier[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [grns] = useState<GoodsReceivedNote[]>([]);
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

  const addAiLog = useCallback((entry: Omit<AIActionLogEntry, 'id' | 'timestamp'>) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAiLogs((prev) => [
      {
        ...entry,
        id: `LOG-${Date.now()}`,
        timestamp: `Today, ${timeStr}`,
      },
      ...prev,
    ]);
  }, []);

  const navigateToEntity = useCallback((r: NavRoute, entityId?: string) => {
    setRoute(r);
    if (r === 'documents' && entityId) setSelectedDocId(entityId);
    if (r === 'orders' && entityId) setSelectedOrderId(entityId);
    if (r === 'customers' && entityId) setSelectedCustomerId(entityId);
    if (r === 'purchasing' && entityId) setSelectedSupplierId(entityId);
    if (r === 'alerts' && entityId) setSelectedAlertId(entityId);
  }, []);

  const createDraftPoFromInventory = useCallback(
    (item: InventoryItem) => {
      const qty = item.suggestedReorderQty || Math.max(item.reorderLevel * 2, 50);
      const now = new Date();
      const expected = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const poId = `PO-${now.getFullYear()}-${String(pos.length + 1).padStart(4, '0')}`;
      const newPo: PurchaseOrder = {
        id: poId,
        supplierId: item.preferredSupplierId,
        supplierName: item.preferredSupplierName,
        createdAt: formatErpDate(now),
        expectedDate: formatErpDate(expected),
        status: 'draft',
        total: qty * item.unitCost,
        createdByAi: true,
        lines: [
          {
            sku: item.sku,
            productName: item.name,
            unit: item.unit,
            orderedQty: qty,
            receivedQty: 0,
            invoicedQty: 0,
            unitCost: item.unitCost,
          },
        ],
      };
      setPos((prev) => [newPo, ...prev]);
      addAiLog({
        module: 'Inventory',
        action: `Created Draft PO ${poId} for ${qty} ${item.unit} of ${item.name}`,
        reason: `Stock projected to run out in ${item.daysUntilStockout ?? 0} days at ${item.dailyVelocity} ${item.unit}/day velocity.`,
        confidence: 95,
        approvedBy: 'Owner',
        outcome: 'approved',
      });
      addToast({
        title: `Draft PO ${poId} Created`,
        description: `${qty} ${item.unit} of ${item.name} queued for ${item.preferredSupplierName}.`,
        variant: 'success',
      });
    },
    [pos.length, addAiLog, addToast]
  );

  const updateChequeStatus = useCallback(
    (paymentId: string, status: ChequeStatus) => {
      setPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, chequeStatus: status } : p))
      );
      const payment = payments.find((p) => p.id === paymentId);
      if (payment) {
        addToast({
          title: `Cheque #${payment.chequeNumber} marked ${status}`,
          description: `${payment.customerName} · Rs. ${payment.amount.toLocaleString()}`,
          variant: status === 'bounced' ? 'error' : 'success',
        });
        if (status === 'cleared') {
          setLedger((prev) => [
            {
              id: `LDG-${Date.now()}`,
              date: formatErpDate(new Date()),
              description: `Cheque Cleared — CHQ-${payment.chequeNumber} (${payment.invoiceRef})`,
              party: payment.customerName,
              category: 'Sales Receipt',
              type: 'in',
              amount: payment.amount,
              runningBalance: (prev[0]?.runningBalance ?? 0) + payment.amount,
              source: 'Cheque Cleared',
            },
            ...prev,
          ]);
        }
      }
    },
    [payments, addToast]
  );

  const acceptBankMatch = useCallback(
    (itemId: string) => {
      const target = bankRecon.find((b) => b.id === itemId);
      if (!target) return;
      setBankRecon((prev) =>
        prev.map((b) => (b.id === itemId ? { ...b, status: 'matched' } : b))
      );
      addAiLog({
        module: 'Accounting',
        action: `Reconciled bank line Rs. ${target.amount.toLocaleString()} with ${target.aiSuggestion?.matchRef ?? 'Ledger'}`,
        reason: target.aiSuggestion?.reason ?? 'Manual match approved by owner',
        confidence: target.aiSuggestion?.confidence ?? 100,
        approvedBy: 'Owner',
        outcome: 'approved',
      });
      addToast({
        title: 'Bank transaction reconciled',
        description: `Matched to ${target.aiSuggestion?.matchRef}`,
        variant: 'success',
      });
    },
    [bankRecon, addAiLog, addToast]
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
        documents,
        setDocuments,
        orders,
        setOrders,
        customers,
        setCustomers,
        collections,
        setCollections,
        inventory,
        setInventory,
        suppliers,
        pos,
        setPos,
        grns,
        ledger,
        setLedger,
        payments,
        setPayments,
        bankRecon,
        setBankRecon,
        alerts,
        setAlerts,
        reports,
        setReports,
        aiLogs,
        addAiLog,
        catalystMessages,
        setCatalystMessages,
        approvalRules,
        setApprovalRules,
        aiSettings,
        setAiSettings,
        toasts,
        addToast,
        dismissToast,
        createDraftPoFromInventory,
        updateChequeStatus,
        acceptBankMatch,
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
