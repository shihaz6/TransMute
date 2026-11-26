package com.transmute.erp.dashboard;

import com.transmute.erp.accounting.AccountingService;
import com.transmute.erp.alerts.AlertService;
import com.transmute.erp.customer.Customer;
import com.transmute.erp.customer.CustomerService;
import com.transmute.erp.documents.DocumentService;
import com.transmute.erp.inventory.InventoryItem;
import com.transmute.erp.inventory.InventoryService;
import com.transmute.erp.purchasing.PurchaseOrder;
import com.transmute.erp.purchasing.PurchaseOrderService;
import com.transmute.erp.sales.SalesOrder;
import com.transmute.erp.sales.SalesOrderService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private static final Set<String> OPEN_PO_STATUSES = Set.of("draft", "sent", "partial-received");

    private final AccountingService accounting;
    private final CustomerService customers;
    private final SalesOrderService orders;
    private final PurchaseOrderService purchaseOrders;
    private final DocumentService documents;
    private final AlertService alerts;
    private final InventoryService inventory;

    public DashboardService(AccountingService accounting, CustomerService customers, SalesOrderService orders,
                            PurchaseOrderService purchaseOrders, DocumentService documents,
                            AlertService alerts, InventoryService inventory) {
        this.accounting = accounting;
        this.customers = customers;
        this.orders = orders;
        this.purchaseOrders = purchaseOrders;
        this.documents = documents;
        this.alerts = alerts;
        this.inventory = inventory;
    }

    public DashboardSummary summary() {
        List<Customer> customerList = customers.list();
        List<SalesOrder> orderList = orders.list();
        List<PurchaseOrder> poList = purchaseOrders.list();
        List<InventoryItem> stock = inventory.list();

        BigDecimal cash = accounting.ledgerEntries().stream().findFirst()
                .map(e -> e.getRunningBalance()).orElse(BigDecimal.ZERO);

        BigDecimal salesTotal = orderList.stream()
                .filter(o -> "order".equals(o.getType()))
                .map(SalesOrder::getTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal receivables = customerList.stream()
                .map(Customer::getOutstandingBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal openPo = poList.stream()
                .filter(po -> OPEN_PO_STATUSES.contains(po.getStatus()))
                .map(PurchaseOrder::getTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new DashboardSummary(
                cash,
                salesTotal,
                receivables,
                customerList.stream().filter(c -> c.getDaysOverdue() >= 30).count(),
                openPo,
                documents.list().stream().filter(d -> "needs-review".equals(d.getStatus())).count(),
                alerts.list("open").size(),
                stock.stream().filter(i -> i.totalStock() <= i.getReorderLevel()).count());
    }
}
