// Fills a running TransMute backend with clearly labelled DEMO records in every module,
// so the whole system can be tried end to end. Run it once against an empty database:
//
//   1. Start the backend:   cd backend && ./mvnw spring-boot:run
//   2. From frontend/:      npx tsx scripts/seed-demo.ts
//
// Every record name starts with "DEMO". The script stops if demo customers already exist,
// so running it twice does not duplicate data.

import { erpApi } from '@/api/erp';
import { apiSend } from '@/api/client';
import { apiDateFromText, isoDaysFromToday } from '@/utils/dates';

type Named = { id: string; name: string };

const SAMPLE_INVOICE = `MARINA EDIBLE OILS (DEMO)
No. 12, Industrial Road, Peliyagoda
------------------------------------------
Invoice no : MEO-2026-8841 (DEMO)
Date       : 14 Apr 2026
Due date   : 28 Apr 2026

Description                   Qty   Rate      Amount
Marina Coconut Oil 1L x 12      5   2,840    14,200
------------------------------------------
Subtotal                                     14,200
Tax                                           2,556
Total                                        16,756
------------------------------------------
This is a demo document created by seed-demo.ts.
`;

async function main() {
  const existing = await erpApi.customers();
  if (existing.some((c) => c.name.startsWith('DEMO '))) {
    console.log('Demo data is already loaded. Nothing changed.');
    return;
  }

  console.log('Creating suppliers and products...');
  const marina = await apiSend<Named>('POST', '/api/suppliers', {
    name: 'DEMO Marina Edible Oils',
    category: 'Cooking Oil & Coconut',
    contactPerson: 'Demo Contact',
    phone: '+94 11 000 0000',
    paymentTerms: '30 days',
    ytdSpend: 0,
    onTimeRate: 96,
    trackedProduct: 'Marina Coconut Oil 1L',
    priceHistory: [
      { month: 'Nov', price: 2700, marketAvg: 2750 },
      { month: 'Dec', price: 2740, marketAvg: 2760 },
      { month: 'Jan', price: 2780, marketAvg: 2770 },
      { month: 'Feb', price: 2800, marketAvg: 2790 },
      { month: 'Mar', price: 2840, marketAvg: 2800 },
      { month: 'Apr', price: 2840, marketAvg: 2810 },
    ],
  });
  const matale = await apiSend<Named>('POST', '/api/suppliers', {
    name: 'DEMO Matale Spice & Curry Mills',
    category: 'Spices & Essentials',
    contactPerson: 'Demo Contact',
    paymentTerms: '14 days',
    onTimeRate: 91,
    trackedProduct: 'Roasted Chilli Powder 1kg',
    priceHistory: [],
  });

  const products = [
    { sku: 'DEMO-OIL-1L', name: 'DEMO Marina Coconut Oil 1L Case', unit: 'Cases', category: 'Cooking Oil & Coconut', warehouseStock: 68, shopStock: 12, vanStock: 6, reorderLevel: 40, dailyVelocity: 8, unitCost: 2840, salePrice: 3260, preferredSupplierId: marina.id, preferredSupplierName: marina.name },
    { sku: 'DEMO-RICE-25', name: 'DEMO Keeri Samba Rice 25kg Bag', unit: 'Bags', category: 'Flour, Rice & Sugar', warehouseStock: 42, shopStock: 8, vanStock: 4, reorderLevel: 60, dailyVelocity: 6, unitCost: 6550, salePrice: 7700, preferredSupplierId: matale.id, preferredSupplierName: matale.name },
    { sku: 'DEMO-CHILLI-1', name: 'DEMO Roasted Red Chilli Powder 1kg', unit: 'Cartons', category: 'Spices & Essentials', warehouseStock: 18, shopStock: 6, vanStock: 0, reorderLevel: 60, dailyVelocity: 5, unitCost: 1085, salePrice: 1120, preferredSupplierId: matale.id, preferredSupplierName: matale.name },
  ];
  for (const p of products) {
    await erpApi.createInventoryItem(p);
  }

  console.log('Creating customers...');
  const customers = await Promise.all([
    erpApi.createCustomer({ name: 'DEMO Gampaha Trade Mart', contactPerson: 'Sanjeewa', phone: '+94 77 100 0001', city: 'Gampaha', category: 'Grocery / Retail', creditLimit: 350000, risk: 'watch', avgPayDays: 22 }),
    erpApi.createCustomer({ name: 'DEMO Wijesinghe Super Centre', contactPerson: 'Nimal Wijesinghe', phone: '+94 77 100 0002', city: 'Maharagama', category: 'Supermarket', creditLimit: 900000, risk: 'high', avgPayDays: 39 }),
    erpApi.createCustomer({ name: 'DEMO Ceylon Spice Kitchen', contactPerson: 'Kamala', phone: '+94 77 100 0003', city: 'Colombo', category: 'Hotel / Bakery', creditLimit: 350000, risk: 'low', avgPayDays: 12 }),
  ]);
  const [gampaha, wijesinghe, ceylon] = customers;

  console.log('Creating orders and quotes...');
  // Confirmed orders build the customer balances.
  const o1 = await erpApi.createOrder({ type: 'order', customerId: wijesinghe.id, source: 'walk-in', items: [{ sku: 'DEMO-OIL-1L', qty: 40 }] });
  await erpApi.confirmOrder(o1.id);
  const o2 = await erpApi.createOrder({ type: 'order', customerId: gampaha.id, source: 'phone', items: [{ sku: 'DEMO-RICE-25', qty: 10 }] });
  await erpApi.confirmOrder(o2.id);
  // A WhatsApp order large enough to exceed the credit limit, so it is held for review.
  await erpApi.createOrder({ type: 'order', customerId: ceylon.id, source: 'whatsapp', items: [{ sku: 'DEMO-OIL-1L', qty: 120 }], originalMessage: { sender: 'Kamala', phoneOrEmail: '+94 77 100 0003', timestamp: new Date().toISOString(), text: 'Please book 10 oil cases and 3 bags of samba rice. Check stock first.', voiceTranscript: false, voiceDuration: null } });
  // A quote for Gampaha, left open so the quote editor can be tried.
  const quote = await erpApi.createOrder({ type: 'quote', customerId: gampaha.id, source: 'email', originalMessage: { sender: 'Sanjeewa', phoneOrEmail: 'buyer@example.com', timestamp: new Date().toISOString(), text: 'Good morning, please quote 35 cases of Marina Coconut Oil 1L delivered next week.', voiceTranscript: false, voiceDuration: null } });
  await erpApi.replaceQuoteItems(quote.id, [{ sku: 'DEMO-OIL-1L', qty: 35 }]);

  console.log('Setting customer balances and overdue days...');
  // The backend's update replaces the whole record, so start from the current values.
  const setBalance = async (id: string, changes: { outstandingBalance: number; daysOverdue: number; risk: string }) => {
    const current = (await erpApi.customers()).find((c) => c.id === id);
    if (!current) throw new Error(`Customer ${id} not found`);
    await erpApi.updateCustomer(id, { ...current, ...changes });
  };
  await setBalance(gampaha.id, { outstandingBalance: 198000, daysOverdue: 19, risk: 'watch' });
  await setBalance(wijesinghe.id, { outstandingBalance: 845000, daysOverdue: 38, risk: 'high' });

  console.log('Purchasing...');
  const inventory = await erpApi.inventory();
  const rice = inventory.find((i) => i.sku === 'DEMO-RICE-25');
  if (rice) {
    const po = await apiSend<{ id: string }>('POST', `/api/purchase-orders/from-inventory/${rice.id}`);
    await erpApi.sendPurchaseOrder(po.id);
    await erpApi.receivePurchaseOrder(po.id, { receivedBy: 'Stores', warehouse: 'Warehouse', lines: [{ sku: 'DEMO-RICE-25', qty: 20 }] });
  }

  console.log('Documents...');
  const invoiceFile = new File([SAMPLE_INVOICE], 'DEMO-marina-invoice-MEO-2026-8841.txt', { type: 'text/plain' });
  const doc = await erpApi.uploadDocument(invoiceFile, 'upload');
  await erpApi.updateDocumentFields(doc.id, {
    supplier: 'DEMO Marina Edible Oils',
    invoiceNumber: 'MEO-2026-8841',
    invoiceDate: apiDateFromText('14 Apr 2026'),
    dueDate: apiDateFromText('28 Apr 2026'),
    subtotal: 14200,
    tax: 2556,
    total: 16756,
  });

  console.log('Accounting...');
  await erpApi.recordPayment({ customerName: gampaha.name, method: 'Cash', amount: 50000, reference: 'DEMO-CASH-1', invoiceRef: 'DEMO' });
  const cheque = await erpApi.recordPayment({ customerName: wijesinghe.name, method: 'Cheque', amount: 120000, reference: 'DEMO-CHQ-1', chequeNumber: '004471', chequeBank: 'Commercial Bank', chequeDueDate: isoDaysFromToday(10), invoiceRef: 'DEMO' });
  await erpApi.setChequeStatus(cheque.id, 'deposited');
  await erpApi.importBankLines([
    { statementDate: isoDaysFromToday(-1), bankDescription: 'CEFTS CREDIT DEMO GAMPAHA', type: 'credit', amount: 50000 },
    { statementDate: isoDaysFromToday(-1), bankDescription: 'DEMO SUPPLIER TRANSFER MARINA', type: 'debit', amount: 75000 },
  ]);
  const bankLines = await erpApi.bankLines();
  const firstCredit = bankLines.find((b) => b.type === 'credit');
  if (firstCredit) await erpApi.acceptBankLine(firstCredit.id);

  console.log('Alerts, collections, settings, Catalyst...');
  await erpApi.raiseAlert({ title: 'DEMO Supplier bank account changed', category: 'Bank Details Changed', severity: 'critical', summary: 'Marina bill shows a new account number.', whyFlagged: 'Account differs from the verified one on file.', amountImpact: 75000, evidence: [{ label: 'New account', value: '····9183' }, { label: 'Verified account', value: '····4409' }] });
  await erpApi.raiseAlert({ title: 'DEMO Possible duplicate bill', category: 'Duplicate Invoice', severity: 'warning', summary: 'Invoice number already seen this month.', whyFlagged: 'Same supplier and amount as an earlier bill.', amountImpact: 16756, evidence: [{ label: 'Invoice', value: 'MEO-2026-8841' }] });
  await erpApi.syncCollections();
  await erpApi.addApprovalRule({ name: 'DEMO Discounts above 5%', condition: 'Any sales quote with a discount above 5%', approver: 'Owner' });
  await erpApi.addAiSetting({ task: 'DEMO Post matched supplier bills', description: 'Post bills that match a purchase order exactly.', mode: 'always-review', threshold: '98%' });
  await erpApi.sendCatalystMessage('DEMO welcome: this chat log is part of the demo data.');

  console.log('\nDemo data loaded. Open the app and look at Dashboard, Orders (open the DEMO quote), Documents, Collections, Accounting and Reports.');
}

main().catch((error) => {
  console.error('Seeding stopped:', error instanceof Error ? error.message : error);
  process.exit(1);
});
