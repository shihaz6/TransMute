import React from 'react';
import { ErpProvider, useErp } from '@/context/ErpContext';
import { SignInGate } from '@/components/auth/SignInGate';
import { AppShell } from '@/components/layout/AppShell';
import { AIActionLogDrawer } from '@/components/overlays/AIActionLogDrawer';
import { CatalystPanel } from '@/components/overlays/CatalystPanel';
import { ToastContainer } from '@/components/ui/Primitives';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { DocumentsScreen } from '@/screens/DocumentsScreen';
import { OrdersScreen } from '@/screens/OrdersScreen';
import { CustomersScreen } from '@/screens/CustomersScreen';
import { CollectionsScreen } from '@/screens/CollectionsScreen';
import { InventoryScreen } from '@/screens/InventoryScreen';
import { PurchasingScreen } from '@/screens/PurchasingScreen';
import { AccountingScreen } from '@/screens/AccountingScreen';
import { AlertsScreen } from '@/screens/AlertsScreen';
import { ReportsScreen } from '@/screens/ReportsScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';

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
      <AppShell>{renderScreen()}</AppShell>
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
