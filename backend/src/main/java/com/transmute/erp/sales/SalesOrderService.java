package com.transmute.erp.sales;

import com.transmute.erp.audit.AuditService;
import com.transmute.erp.common.BadRequestException;
import com.transmute.erp.common.Ids;
import com.transmute.erp.common.NotFoundException;
import com.transmute.erp.customer.Customer;
import com.transmute.erp.customer.CustomerService;
import com.transmute.erp.inventory.InventoryItem;
import com.transmute.erp.inventory.InventoryItemRepository;
import com.transmute.erp.inventory.InventoryService;
import com.transmute.erp.sales.SalesOrder.CreditWarning;
import com.transmute.erp.sales.SalesOrder.OrderLine;
import com.transmute.erp.sales.SalesOrder.OriginalMessage;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SalesOrderService {

    /**
     * A line as the client sends it. Stock levels are not part of the input: they are
     * looked up from inventory. The price is optional and defaults to the catalogue sale
     * price. Quotes accept any price. An order, or a quote being converted to an order, rejects
     * a price that differs from the catalogue unless priceOverride is true.
     */
    public record LineInput(
            String id,
            String sku,
            String productName,
            int qty,
            String unit,
            BigDecimal unitPrice,
            Boolean priceOverride) {
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
    private final InventoryService inventoryService;
    private final AuditService audit;

    public SalesOrderService(SalesOrderRepository orders, CustomerService customers,
                             InventoryItemRepository inventory, InventoryService inventoryService,
                             AuditService audit) {
        this.orders = orders;
        this.customers = customers;
        this.inventory = inventory;
        this.inventoryService = inventoryService;
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
     * Turns a quote into an order. This is the point money is committed, so each SKU line is
     * checked against the catalogue price here. A line priced differently from the catalogue
     * needs priceOverride, and the override is audited. The credit check runs again, because
     * the customer's balance may have changed since the quote was made.
     */
    public SalesOrder convertQuote(String id, boolean priceOverride) {
        SalesOrder quote = get(id);
        if (!"quote".equals(quote.getType())) {
            throw new BadRequestException("Only quotes can be converted to orders");
        }
        if (quote.getItems().isEmpty()) {
            throw new BadRequestException("Add line items to the quote before converting it");
        }
        for (OrderLine line : quote.getItems()) {
            if (line.sku() != null) {
                InventoryItem stock = inventory.findBySku(line.sku())
                        .orElseThrow(() -> new BadRequestException("Unknown SKU: " + line.sku()));
                checkCatalogPrice(stock, line.unitPrice(), priceOverride);
            }
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
     * Confirms an order and invoices it. The credit limit is checked again at this point,
     * because other orders may have been confirmed since the order was created. If the
     * customer would still be over the limit, the order is held as pending-review and nothing
     * is invoiced or deducted; the response is still a 200 with that status. The owner can pass
     * creditOverride to confirm it anyway; that override is audited. Confirming takes the
     * warehouse stock for each SKU line in the same transaction, so a shortage rolls the whole
     * confirmation back.
     */
    public SalesOrder confirm(String id, boolean creditOverride) {
        SalesOrder order = get(id);
        if ("quote".equals(order.getType())) {
            throw new BadRequestException("Convert the quote to an order before invoicing it");
        }
        if ("invoiced".equals(order.getStatus()) || "dispatched".equals(order.getStatus())) {
            throw new BadRequestException("Order " + id + " is already invoiced");
        }

        Customer customer = customers.get(order.getCustomerId());
        applyCreditCheck(order, customer);
        CreditWarning warning = order.getCreditWarning();
        if (warning != null && !creditOverride) {
            audit.record("Orders",
                    "Held " + id + " for review: confirming would exceed the credit limit",
                    warning.suggestion(), order.getAiConfidence(), "Owner", "flagged");
            return order;
        }
        if (warning != null) {
            audit.record("Orders",
                    "Owner override: confirmed " + id + " over the credit limit",
                    "Projected balance " + warning.projectedBalance() + " against limit " + warning.creditLimit() + ".",
                    order.getAiConfidence(), "Owner", "approved");
        }

        for (OrderLine line : order.getItems()) {
            if (line.sku() != null) {
                inventoryService.deductWarehouse(line.sku(), line.qty());
            }
        }

        customer.setOutstandingBalance(customer.getOutstandingBalance().add(order.getTotal()));
        customer.setLastOrderDate(Instant.now());

        order.setStatus("invoiced");
        audit.record("Orders",
                "Confirmed & invoiced " + id + " for " + order.getCustomerName() + " (" + order.getTotal() + ")",
                warning != null ? "Owner confirmed an order that exceeded the credit limit." : "Owner confirmed the order.",
                order.getAiConfidence(), "Owner", "approved");
        return order;
    }

    /**
     * Fills in stock levels and the price for each line. The price defaults to the catalogue
     * sale price. For an order, a different price is rejected unless the line sets priceOverride,
     * and an override is audited with the list price. For a quote (checkPrice false) any price
     * is accepted and no catalogue check is made; the check happens when the quote is converted.
     * Order lines must match a known SKU; quotes may also carry free-text lines, which have no
     * catalogue price to check against.
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
            BigDecimal price = line.unitPrice() == null ? stock.getSalePrice() : line.unitPrice();
            if (!quote) {
                checkCatalogPrice(stock, price, Boolean.TRUE.equals(line.priceOverride()));
            }
            out.add(new OrderLine(id, stock.getSku(), stock.getName(), line.qty(), stock.getUnit(), price,
                    stock.getWarehouseStock(), stock.getShopStock(), stock.getVanStock()));
        }
        return out;
    }

    /**
     * Rejects a price that differs from the catalogue sale price unless the override flag is set.
     * An accepted override is audited with the list price.
     */
    private void checkCatalogPrice(InventoryItem stock, BigDecimal price, boolean priceOverride) {
        BigDecimal listPrice = stock.getSalePrice();
        if (price == null || price.compareTo(listPrice) == 0) {
            return;
        }
        if (!priceOverride) {
            throw new BadRequestException("Price for " + stock.getSku() + " must be the catalogue price "
                    + listPrice + ". Set priceOverride to change it.");
        }
        audit.record("Orders",
                "Price override on " + stock.getSku() + ": " + price + " instead of list price " + listPrice,
                "Owner set a unit price that differs from the catalogue sale price.",
                null, "Owner", "approved");
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

    /**
     * Holds the order for review when it would take the customer past a non-zero credit limit.
     * The projected balance is the invoiced balance, plus the totals of the customer's other
     * confirmed orders that are not yet invoiced, plus this order's total.
     */
    private void applyCreditCheck(SalesOrder order, Customer customer) {
        order.setCreditWarning(null);
        BigDecimal openOrders = orders.findByCustomerIdAndStatus(customer.getId(), "confirmed").stream()
                .filter(other -> !Objects.equals(other.getId(), order.getId()))
                .map(SalesOrder::getTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal projected = customer.getOutstandingBalance().add(openOrders).add(order.getTotal());
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
