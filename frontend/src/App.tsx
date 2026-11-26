import React from 'react';
import { ErpProvider, useErp } from '@/context/ErpContext';
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
      <AIActionLogDrawer />
      <CatalystPanel />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default function App() {
  return (
    <ErpProvider>
      <TransmuteRouter />
    </ErpProvider>
  );
}
