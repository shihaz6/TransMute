package com.transmute.erp.reports;

import com.transmute.erp.common.NotFoundException;
import com.transmute.erp.customer.Customer;
import com.transmute.erp.customer.CustomerService;
import com.transmute.erp.inventory.InventoryItem;
import com.transmute.erp.inventory.InventoryService;
import com.transmute.erp.purchasing.PurchaseOrder;
import com.transmute.erp.purchasing.PurchaseOrderService;
import com.transmute.erp.reports.ReportView.ChartPoint;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Builds reports from the live data. Every figure is calculated from stored records. */
@Service
@Transactional(readOnly = true)
public class ReportService {

    private final CustomerService customers;
    private final InventoryService inventory;
    private final PurchaseOrderService purchaseOrders;

    public ReportService(CustomerService customers, InventoryService inventory,
                         PurchaseOrderService purchaseOrders) {
        this.customers = customers;
        this.inventory = inventory;
        this.purchaseOrders = purchaseOrders;
    }

    public ReportView build(String kind) {
        return switch (kind) {
            case "receivables" -> receivables();
            case "stock" -> stock();
            case "purchase-orders" -> purchaseOrders();
            default -> throw new NotFoundException("Report", kind);
        };
    }

    private ReportView receivables() {
        List<Customer> rows = customers.list().stream()
                .sorted(Comparator.comparing(Customer::getOutstandingBalance, Comparator.reverseOrder()))
                .toList();
        BigDecimal total = rows.stream().map(Customer::getOutstandingBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long over30 = rows.stream().filter(c -> c.getDaysOverdue() >= 30).count();

        List<ChartPoint> chart = new ArrayList<>();
        List<List<Object>> table = new ArrayList<>();
        for (Customer c : rows) {
            chart.add(new ChartPoint(c.getName(), c.getOutstandingBalance()));
            table.add(List.of(c.getName(), c.getOutstandingBalance(), c.getDaysOverdue(),
                    c.getCreditLimit(), c.getRisk()));
        }
        return new ReportView(
                "Receivables by customer",
                rows.isEmpty() ? "No customer balances are recorded yet."
                        : total.toPlainString() + " is owed across " + rows.size()
                        + " customers. " + over30 + " are 30 or more days overdue.",
                "Outstanding balance per customer, highest first. Overdue days and risk come from each customer record.",
                "bar", "Outstanding",
                chart,
                List.of("Customer", "Outstanding", "Days overdue", "Credit limit", "Risk"),
                table);
    }

    private ReportView stock() {
        List<InventoryItem> rows = inventory.list();
        long low = rows.stream().filter(i -> i.totalStock() <= i.getReorderLevel()).count();

        List<ChartPoint> chart = new ArrayList<>();
        List<List<Object>> table = new ArrayList<>();
        for (InventoryItem i : rows) {
            chart.add(new ChartPoint(i.getName(), i.totalStock()));
            table.add(List.of(i.getName(), i.getWarehouseStock(), i.getShopStock(), i.getVanStock(),
                    i.totalStock(), i.getReorderLevel()));
        }
        return new ReportView(
                "Stock on hand by item",
                rows.isEmpty() ? "No inventory items are recorded yet."
                        : low + " of " + rows.size() + " items are at or below their reorder level.",
                "Units summed across warehouse, shop and van, compared with each item's reorder level.",
                "bar", "Units on hand",
                chart,
                List.of("Item", "Warehouse", "Shop", "Van", "Total", "Reorder level"),
                table);
    }

    private ReportView purchaseOrders() {
        List<PurchaseOrder> rows = purchaseOrders.list();
        BigDecimal total = rows.stream().map(PurchaseOrder::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add);

        List<ChartPoint> chart = new ArrayList<>();
        List<List<Object>> table = new ArrayList<>();
        for (PurchaseOrder po : rows) {
            chart.add(new ChartPoint(po.getId(), po.getTotal()));
            table.add(List.of(po.getId(), po.getSupplierName(), po.getStatus(), po.getTotal()));
        }
        return new ReportView(
                "Purchase orders",
                rows.isEmpty() ? "No purchase orders are recorded yet."
                        : rows.size() + " purchase orders totalling " + total.toPlainString() + ".",
                "Each purchase order with its status and total value.",
                "bar", "PO total",
                chart,
                List.of("PO", "Supplier", "Status", "Total"),
                table);
    }
}
