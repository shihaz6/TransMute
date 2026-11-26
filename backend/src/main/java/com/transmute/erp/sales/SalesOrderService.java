package com.transmute.erp.sales;

import com.transmute.erp.audit.AuditService;
import com.transmute.erp.common.BadRequestException;
import com.transmute.erp.common.Ids;
import com.transmute.erp.common.NotFoundException;
import com.transmute.erp.customer.Customer;
import com.transmute.erp.customer.CustomerService;
import com.transmute.erp.sales.SalesOrder.CreditWarning;
import com.transmute.erp.sales.SalesOrder.OrderLine;
import com.transmute.erp.sales.SalesOrder.OriginalMessage;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SalesOrderService {

    /** Input for a new order or quote. */
    public record NewOrder(
            String type,
            String customerId,
            String source,
            List<OrderLine> items,
            OriginalMessage originalMessage) {
    }

    private final SalesOrderRepository orders;
    private final CustomerService customers;
    private final AuditService audit;

    public SalesOrderService(SalesOrderRepository orders, CustomerService customers, AuditService audit) {
        this.orders = orders;
        this.customers = customers;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<SalesOrder> list() {
        return orders.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public SalesOrder get(String id) {
        return orders.findById(id).orElseThrow(() -> new NotFoundException("Sales order", id));
    }

    /**
     * Creates an order or quote. Totals are computed here, never taken from the client.
     * An order that would push the customer past their credit limit is held for review.
     */
    public SalesOrder create(NewOrder input) {
        boolean quote = "quote".equals(input.type());
        if (!quote && !"order".equals(input.type())) {
            throw new BadRequestException("type must be 'order' or 'quote'");
        }
        boolean hasItems = input.items() != null && !input.items().isEmpty();
        if (!quote && !hasItems) {
            throw new BadRequestException("An order needs at least one line item");
        }
        Customer customer = customers.get(input.customerId());

        List<OrderLine> items = input.items() == null ? List.of() : input.items();
        BigDecimal total = items.stream()
                .map(line -> line.unitPrice().multiply(BigDecimal.valueOf(line.qty())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        SalesOrder order = new SalesOrder();
        order.setId(Ids.next(quote ? "QT" : "SO"));
        order.setType(quote ? "quote" : "order");
        order.setCustomerId(customer.getId());
        order.setCustomerName(customer.getName());
        order.setSource(input.source() == null ? "walk-in" : input.source());
        order.setCreatedAt(Instant.now());
        order.setTotal(total);
        order.setItems(items);
        order.setOriginalMessage(input.originalMessage());

        if (quote) {
            order.setStatus("quote");
        } else {
            BigDecimal projected = customer.getOutstandingBalance().add(total);
            if (customer.getCreditLimit().signum() > 0 && projected.compareTo(customer.getCreditLimit()) > 0) {
                order.setCreditWarning(new CreditWarning(
                        customer.getOutstandingBalance(),
                        customer.getCreditLimit(),
                        projected,
                        "Projected balance is over the credit limit. Ask for part payment or get owner approval."));
                order.setStatus("pending-review");
            } else {
                order.setStatus("confirmed");
            }
        }

        SalesOrder saved = orders.save(order);
        audit.record("Orders",
                (quote ? "Created quote " : "Created order ") + saved.getId() + " for " + customer.getName(),
                saved.getCreditWarning() == null
                        ? "Totals calculated from line items."
                        : "Held for review: projected balance exceeds credit limit.",
                null, "Owner", saved.getCreditWarning() == null ? "auto-executed" : "flagged");
        return saved;
    }

    /**
     * Confirms an order and invoices it. The invoice total is added to the customer's balance.
     * Confirming a credit-held order is an owner override and is logged as such.
     */
    public SalesOrder confirm(String id) {
        SalesOrder order = get(id);
        if ("quote".equals(order.getType())) {
            throw new BadRequestException("Convert the quote to an order before invoicing it");
        }
        if ("invoiced".equals(order.getStatus()) || "dispatched".equals(order.getStatus())) {
            throw new BadRequestException("Order " + id + " is already invoiced");
        }
        boolean override = order.getCreditWarning() != null;

        Customer customer = customers.get(order.getCustomerId());
        customer.setOutstandingBalance(customer.getOutstandingBalance().add(order.getTotal()));
        customer.setLastOrderDate(Instant.now());

        order.setStatus("invoiced");
        audit.record("Orders",
                "Confirmed & invoiced " + id + " for " + order.getCustomerName() + " (" + order.getTotal() + ")",
                override ? "Owner confirmed an order that exceeded the credit limit." : "Owner confirmed the order.",
                order.getAiConfidence(), "Owner", "approved");
        return order;
    }
}
