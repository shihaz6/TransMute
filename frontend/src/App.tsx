import React, { Suspense, lazy } from 'react';
import { ErpProvider, useErp } from '@/context/ErpContext';
import { SignInGate } from '@/components/auth/SignInGate';
import { AppShell } from '@/components/layout/AppShell';
import { AIActionLogDrawer } from '@/components/overlays/AIActionLogDrawer';
import { CatalystPanel } from '@/components/overlays/CatalystPanel';
import { ToastContainer } from '@/components/ui/Primitives';

const DashboardScreen = lazy(() => import('@/screens/DashboardScreen').then((m) => ({ default: m.DashboardScreen })));
const DocumentsScreen = lazy(() => import('@/screens/DocumentsScreen').then((m) => ({ default: m.DocumentsScreen })));
const OrdersScreen = lazy(() => import('@/screens/OrdersScreen').then((m) => ({ default: m.OrdersScreen })));
const CustomersScreen = lazy(() => import('@/screens/CustomersScreen').then((m) => ({ default: m.CustomersScreen })));
const CollectionsScreen = lazy(() => import('@/screens/CollectionsScreen').then((m) => ({ default: m.CollectionsScreen })));
const InventoryScreen = lazy(() => import('@/screens/InventoryScreen').then((m) => ({ default: m.InventoryScreen })));
const PurchasingScreen = lazy(() => import('@/screens/PurchasingScreen').then((m) => ({ default: m.PurchasingScreen })));
const AccountingScreen = lazy(() => import('@/screens/AccountingScreen').then((m) => ({ default: m.AccountingScreen })));
const AlertsScreen = lazy(() => import('@/screens/AlertsScreen').then((m) => ({ default: m.AlertsScreen })));
const ReportsScreen = lazy(() => import('@/screens/ReportsScreen').then((m) => ({ default: m.ReportsScreen })));
const SettingsScreen = lazy(() => import('@/screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen })));

function BackendNotice() {
  const { loadError, loading, reload } = useErp();
  if (!loadError || loading) return null;
  return (
    <div
      role="alert"
      className="fixed bottom-0 inset-x-0 z-[60] flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-950 border-t border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200"
    >
      <span>
        {loadError} Start the backend with <code className="font-mono">./mvnw spring-boot:run</code> in the backend folder, then retry.
      </span>
      <button
        onClick={() => void reload()}
        className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 cursor-pointer"
      >
        Retry
      </button>
    </div>
  );
}

function TransmuteRouter() {
  const { route, toasts, dismissToast } = useErp();

  const renderScreen = () => {
    switch (route) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'documents':
        return <DocumentsScreen />;
      case 'orders':
        return <OrdersScreen />;
      case 'customers':
        return <CustomersScreen />;
      case 'collections':
        return <CollectionsScreen />;
      case 'inventory':
        return <InventoryScreen />;
      case 'purchasing':
        return <PurchasingScreen />;
      case 'accounting':
        return <AccountingScreen />;
      case 'alerts':
        return <AlertsScreen />;
      case 'reports':
        return <ReportsScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <>
      <AppShell>
        <Suspense
          fallback={
            <div className="flex h-full min-h-[40vh] items-center justify-center text-sm text-stone-500 dark:text-zinc-400">
              Loading...
            </div>
          }
        >
          {renderScreen()}
        </Suspense>
      </AppShell>
      <BackendNotice />
      <AIActionLogDrawer />
      <CatalystPanel />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default function App() {
  // The data provider mounts only after sign-in, so no screen requests data before then.
  return (
    <SignInGate>
      <ErpProvider>
        <TransmuteRouter />
      </ErpProvider>
    </SignInGate>
  );
}
