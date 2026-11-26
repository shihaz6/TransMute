import { erpApi } from '@/api/erp';
import { apiSend, ApiError } from '@/api/client';
import {
  toAuditEntry,
  toCustomer,
  toInboxDocument,
  toInventoryItem,
  toLedgerEntry,
  toPurchaseOrder,
  toReportResult,
  toSalesOrder,
} from '@/api/mappers';
import { apiDateFromText, formatDisplayDate } from '@/utils/dates';

let passed = 0;
function check(condition: boolean, message: string): void {
  if (!condition) throw new Error('FAILED: ' + message);
  passed++;
  console.log('ok -', message);
}

async function main() {
  const tag = Date.now().toString(36);

  // Customer and inventory
  const customerDto = await erpApi.createCustomer({ name: `Smoke Shop ${tag}`, creditLimit: 0, daysOverdue: 0 });
  const customer = toCustomer(customerDto);
  check(customer.name === `Smoke Shop ${tag}` && customer.timeline.length === 0, 'customer created and mapped');

  const sku = `SMK-${tag}`;
  const itemDto = await erpApi.createInventoryItem({
    sku,
    name: `Smoke Item ${tag}`,
    unit: 'Cases',
    warehouseStock: 10,
    reorderLevel: 5,
    salePrice: 200,
    unitCost: 120,
  });
  const item = toInventoryItem(itemDto);
  check(item.suggestedReorderQty === 50, 'reorder suggestion uses the 50-unit floor');

  // Quote: created empty, lines added, saved, converted, invoiced
  const quote = await erpApi.createOrder({
    type: 'quote',
    customerId: customer.id,
    source: 'whatsapp',
    originalMessage: {
      sender: 'Buyer',
      phoneOrEmail: '0770000000',
      timestamp: new Date().toISOString(),
      text: 'Need three cases',
      voiceTranscript: false,
      voiceDuration: null,
    },
  });
  check(quote.status === 'quote' && quote.items.length === 0, 'quote created with no lines');
  check(toSalesOrder(quote).createdAt.includes(' '), 'order timestamp mapped to display text');

  const saved = await erpApi.replaceQuoteItems(quote.id, [{ sku, qty: 3 }]);
  check(saved.total === 600, 'quote line priced from inventory sale price (3 x 200)');
  check(saved.items[0].warehouseStock === 10, 'quote line picks up warehouse stock from inventory');

  const converted = await erpApi.convertQuote(quote.id);
  check(converted.type === 'order' && converted.status === 'confirmed', 'quote converted to an order');

  const invoiced = await erpApi.confirmOrder(quote.id);
  check(invoiced.status === 'invoiced', 'order invoiced');

  const customersAfter = (await erpApi.customers()).map(toCustomer);
  const ours = customersAfter.find((c) => c.id === customer.id);
  check(ours?.outstandingBalance === 600, 'invoice added to customer balance');

  // Documents: upload, fill in, approve; a blank approval is refused
  const pdf = new File(['pdf-bytes'], `smoke-${tag}.pdf`, { type: 'application/pdf' });
  const doc = toInboxDocument(await erpApi.uploadDocument(pdf, 'upload'));
  check(doc.status === 'needs-review' && doc.supplier.confidence === 0, 'upload waits for review with no invented values');

  try {
    await erpApi.approveDocument(doc.id);
    check(false, 'approval refused before fields are filled');
  } catch (e) {
    check(e instanceof ApiError && e.status === 400, 'approval refused before fields are filled (400)');
  }

  await erpApi.updateDocumentFields(doc.id, {
    supplier: 'Smoke Supplier',
    invoiceNumber: `S-${tag}`,
    total: 500,
    invoiceDate: apiDateFromText('14 Apr 2026'),
  });
  const approved = toInboxDocument(await erpApi.approveDocument(doc.id));
  check(approved.status === 'approved' && approved.invoiceDate.value === '14 Apr 2026', 'document approved with date round-tripped');

  // Purchasing: supplier, PO, send, receive
  const supplier = await apiSend<{ id: string }>('POST', '/api/suppliers', { name: `Smoke Supplier ${tag}` });
  const po = toPurchaseOrder(
    await apiSend<Parameters<typeof toPurchaseOrder>[0]>('POST', '/api/purchase-orders', {
      supplierId: supplier.id,
      lines: [{ sku, productName: item.name, unit: 'Cases', orderedQty: 5, receivedQty: 0, invoicedQty: 0, unitCost: 120 }],
    })
  );
  check(po.status === 'draft' && po.total === 600, 'purchase order created as draft');
  const sent = toPurchaseOrder(await erpApi.sendPurchaseOrder(po.id));
  check(sent.status === 'sent', 'purchase order sent');
  const before = toInventoryItem((await erpApi.inventory()).find((i) => i.id === item.id)!).warehouseStock;
  const received = toPurchaseOrder(await erpApi.receivePurchaseOrder(po.id, { receivedBy: 'Owner', lines: [{ sku, qty: 2 }] }));
  check(received.status === 'partial-received', 'partial receipt recorded');
  const after = toInventoryItem((await erpApi.inventory()).find((i) => i.id === item.id)!).warehouseStock;
  check(after === before + 2, 'received quantity added to warehouse stock');

  // Accounting: cash payment shows in ledger with a running balance
  const payment = await erpApi.recordPayment({ customerName: customer.name, method: 'Cash', amount: 125.5, reference: tag });
  check(payment.method === 'Cash', 'cash payment recorded');
  const ledger = (await erpApi.ledger()).map(toLedgerEntry);
  check(ledger.length > 0 && ledger[0].date.includes(' '), 'ledger entries mapped with display dates');

  // Reports, audit log, settings, Catalyst
  const report = toReportResult(await erpApi.report('stock'), 'low stock items');
  check(report.columns.length > 0 && report.chartType === 'bar', 'stock report mapped');
  const audit = (await erpApi.auditLog()).slice(0, 3).map(toAuditEntry);
  check(audit.length > 0 && audit[0].module.length > 0, 'audit log mapped');
  const rule = await erpApi.addApprovalRule({ name: `Smoke rule ${tag}`, condition: 'Discount above 5%' });
  check(rule.active === true, 'approval rule added');
  const message = await erpApi.sendCatalystMessage('  hello  ');
  check(message.sender === 'user' && message.text === 'hello', 'Catalyst message stored and trimmed');
  check(formatDisplayDate('2026-04-14') === '14 Apr 2026', 'calendar dates display as 14 Apr 2026');

  // Validation errors come through as ApiError with the backend's message
  try {
    await erpApi.createCustomer({ name: '' });
    check(false, 'blank customer name refused');
  } catch (e) {
    check(e instanceof ApiError && e.status === 400 && !!e.fields?.name, 'blank customer name refused with field error');
  }

  console.log(`\n${passed} checks passed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
