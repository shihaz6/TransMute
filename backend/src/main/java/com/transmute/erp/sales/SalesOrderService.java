package com.transmute.erp.sales;

import com.transmute.erp.audit.AuditService;
import com.transmute.erp.common.BadRequestException;
import com.transmute.erp.common.Ids;
import com.transmute.erp.common.NotFoundException;
import com.transmute.erp.customer.Customer;
import com.transmute.erp.customer.CustomerService;
import com.transmute.erp.inventory.InventoryItem;
import com.transmute.erp.inventory.InventoryItemRepository;
import com.transmute.erp.sales.SalesOrder.CreditWarning;
import com.transmute.erp.sales.SalesOrder.OrderLine;
import com.transmute.erp.sales.SalesOrder.OriginalMessage;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SalesOrderService {

    /**
     * A line as the client sends it. Stock levels are not part of the input: they are
     * looked up from inventory. The price is optional and defaults to the sale price.
     */
    public record LineInput(
            String id,
            String sku,
            String productName,
            int qty,
            String unit,
            BigDecimal unitPrice) {
    }

    /** Input for a new order or quote. */
    public record NewOrder(
            String type,
            String customerId,
            String source,
            List<LineInput> items,
            OriginalMessage originalMessage) {
    }

    private final SalesOrderRepository orders;
    private final CustomerService customers;
    private final InventoryItemRepository inventory;
    private final AuditService audit;

    public SalesOrderService(SalesOrderRepository orders, CustomerService customers,
                             InventoryItemRepository inventory, AuditService audit) {
        this.orders = orders;
        this.customers = customers;
        this.inventory = inventory;
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
     * Creates an order or quote. Totals and stock levels are calculated here, never taken
     * from the client. An order that would push the customer past their credit limit is
     * held for review.
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
        List<OrderLine> items = hasItems ? enrich(input.items(), quote) : List.of();

        SalesOrder order = new SalesOrder();
        order.setId(Ids.next(quote ? "QT" : "SO"));
        order.setType(quote ? "quote" : "order");
        order.setCustomerId(customer.getId());
        order.setCustomerName(customer.getName());
        order.setSource(input.source() == null ? "walk-in" : input.source());
        order.setCreatedAt(Instant.now());
        order.setOriginalMessage(input.originalMessage());
        setItems(order, items);

        if (quote) {
            order.setStatus("quote");
        } else {
            applyCreditCheck(order, customer);
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

    /** Replaces the lines of a quote, for example after a customer message has been read. */
    public SalesOrder replaceQuoteItems(String id, List<LineInput> items) {
        SalesOrder quote = get(id);
        if (!"quote".equals(quote.getType())) {
            throw new BadRequestException("Only quotes can be edited line by line");
        }
        setItems(quote, items == null ? List.of() : enrich(items, true));
        audit.record("Orders", "Updated items on quote " + id, "Owner edited the quote.",
                null, "Owner", "approved");
        return quote;
    }

    /**
     * Turns a quote into an order. The credit check runs again, because the customer's
     * balance may have changed since the quote was made.
     */
    public SalesOrder convertQuote(String id) {
        SalesOrder quote = get(id);
        if (!"quote".equals(quote.getType())) {
            throw new BadRequestException("Only quotes can be converted to orders");
        }
        if (quote.getItems().isEmpty()) {
            throw new BadRequestException("Add line items to the quote before converting it");
        }
        Customer customer = customers.get(quote.getCustomerId());
        quote.setType("order");
        applyCreditCheck(quote, customer);
        audit.record("Orders", "Converted quote " + id + " to an order",
                quote.getCreditWarning() == null ? "Quote accepted by owner."
                        : "Held for review: projected balance exceeds credit limit.",
                null, "Owner", quote.getCreditWarning() == null ? "approved" : "flagged");
        return quote;
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

    /**
     * Fills in stock levels and, when no price is given, the inventory sale price for each
     * line. Order lines must match a known SKU; quotes may also carry free-text lines.
     */
    private List<OrderLine> enrich(List<LineInput> lines, boolean quote) {
        List<OrderLine> out = new ArrayList<>();
        for (LineInput line : lines) {
            if (line.qty() <= 0) {
                throw new BadRequestException("Quantity for " + label(line) + " must be greater than zero");
            }
            if (line.unitPrice() != null && line.unitPrice().signum() < 0) {
                throw new BadRequestException("Price for " + label(line) + " cannot be negative");
            }
            String id = line.id() == null || line.id().isBlank() ? Ids.next("LN") : line.id();
            if (line.sku() == null || line.sku().isBlank()) {
                if (!quote) {
                    throw new BadRequestException("Every order line needs a SKU");
                }
                out.add(new OrderLine(id, null, line.productName(), line.qty(), line.unit(),
                        line.unitPrice() == null ? BigDecimal.ZERO : line.unitPrice(), 0, 0, 0));
                continue;
            }
            InventoryItem stock = inventory.findBySku(line.sku())
                    .orElseThrow(() -> new BadRequestException("Unknown SKU: " + line.sku()));
            BigDecimal price = line.unitPrice() != null && line.unitPrice().signum() > 0
                    ? line.unitPrice() : stock.getSalePrice();
            out.add(new OrderLine(id, stock.getSku(), stock.getName(), line.qty(), stock.getUnit(), price,
                    stock.getWarehouseStock(), stock.getShopStock(), stock.getVanStock()));
        }
        return out;
    }

    private static String label(LineInput line) {
        return line.sku() != null ? line.sku() : String.valueOf(line.productName());
    }

    private static void setItems(SalesOrder order, List<OrderLine> items) {
        order.setItems(items);
        order.setTotal(items.stream()
                .map(line -> line.unitPrice().multiply(BigDecimal.valueOf(line.qty())))
                .reduce(BigDecimal.ZERO, BigDecimal::add));
    }

    /** Holds the order for review when it would take the customer past a non-zero credit limit. */
    private static void applyCreditCheck(SalesOrder order, Customer customer) {
        order.setCreditWarning(null);
        BigDecimal projected = customer.getOutstandingBalance().add(order.getTotal());
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
}
