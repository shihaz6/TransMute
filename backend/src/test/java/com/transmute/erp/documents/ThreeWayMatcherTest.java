package com.transmute.erp.documents;

import static org.assertj.core.api.Assertions.assertThat;

import com.transmute.erp.purchasing.PurchaseOrder;
import com.transmute.erp.purchasing.PurchaseOrder.PoLine;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class ThreeWayMatcherTest {

    private static PurchaseOrder po(String id, String status, Instant createdAt, PoLine... lines) {
        PurchaseOrder po = new PurchaseOrder();
        po.setId(id);
        po.setSupplierName("Acme Foods");
        po.setStatus(status);
        po.setCreatedAt(createdAt);
        po.setGrnId("GRN-" + id);
        po.setLines(List.of(lines));
        BigDecimal total = BigDecimal.ZERO;
        for (PoLine line : lines) {
            total = total.add(line.unitCost().multiply(BigDecimal.valueOf(line.orderedQty())));
        }
        po.setTotal(total);
        return po;
    }

    /** PO line with the given ordered, received and unit cost. Invoiced quantity starts at zero. */
    private static PoLine poLine(String sku, int ordered, int received, String unitCost) {
        return new PoLine(sku, sku + " item", "pcs", ordered, received, 0, new BigDecimal(unitCost));
    }

    private static InboxDocument.LineItem invoiceLine(String sku, int qty, String rate, String amount) {
        return new InboxDocument.LineItem("LN-" + sku, sku + " item", sku, qty, "pcs",
                rate == null ? null : new BigDecimal(rate),
                new BigDecimal(amount), 90, null);
    }

    private static final Instant OLD = Instant.parse("2026-01-01T00:00:00Z");
    private static final Instant NEW = Instant.parse("2026-03-01T00:00:00Z");

    @Test
    void matchedWhenQuantitiesAndRatesAgree() {
        PurchaseOrder po = po("PO-1", "received", OLD,
                poLine("RICE", 10, 10, "100.00"), poLine("OIL", 5, 5, "250.00"));
        List<InboxDocument.LineItem> lines = List.of(
                invoiceLine("RICE", 10, "100.00", "1000.00"),
                invoiceLine("OIL", 5, "250.00", "1250.00"));

        InboxDocument.ThreeWayMatch result = ThreeWayMatcher.match("INV-1", lines, List.of(po));

        assertThat(result.status()).isEqualTo("matched");
        assertThat(result.poNumber()).isEqualTo("PO-1");
        assertThat(result.grnNumber()).isEqualTo("GRN-PO-1");
        assertThat(result.poTotal()).isEqualByComparingTo("2250.00");
        assertThat(result.grnQtyMatched()).isTrue();
        assertThat(result.varianceAmount()).isEqualByComparingTo("0.00");
        assertThat(result.summary()).isEqualTo("2 of 2 lines agree.");
    }

    @Test
    void varianceWhenRateDiffersFromPoCost() {
        PurchaseOrder po = po("PO-1", "partial-received", OLD, poLine("RICE", 10, 10, "100.00"));
        List<InboxDocument.LineItem> lines = List.of(invoiceLine("RICE", 10, "110.00", "1100.00"));

        InboxDocument.ThreeWayMatch result = ThreeWayMatcher.match("INV-1", lines, List.of(po));

        assertThat(result.status()).isEqualTo("variance");
        assertThat(result.grnQtyMatched()).isTrue();
        assertThat(result.varianceAmount()).isEqualByComparingTo("100.00");
        assertThat(result.summary()).contains("0 of 1 lines agree").contains("RICE");
    }

    @Test
    void rateWithinHalfPercentToleranceIsMatched() {
        PurchaseOrder po = po("PO-1", "received", OLD, poLine("RICE", 10, 10, "100.00"));
        List<InboxDocument.LineItem> lines = List.of(invoiceLine("RICE", 10, "100.40", "1004.00"));

        InboxDocument.ThreeWayMatch result = ThreeWayMatcher.match("INV-1", lines, List.of(po));

        assertThat(result.status()).isEqualTo("matched");
    }

    @Test
    void varianceWhenBilledQuantityExceedsReceived() {
        PurchaseOrder po = po("PO-1", "partial-received", OLD, poLine("RICE", 12, 10, "100.00"));
        List<InboxDocument.LineItem> lines = List.of(invoiceLine("RICE", 12, "100.00", "1200.00"));

        InboxDocument.ThreeWayMatch result = ThreeWayMatcher.match("INV-1", lines, List.of(po));

        assertThat(result.status()).isEqualTo("variance");
        assertThat(result.grnQtyMatched()).isFalse();
        assertThat(result.summary()).contains("SKU RICE billed 12, received 10.");
        // Only the 10 received units are accepted; the other 2 units are the variance.
        assertThat(result.varianceAmount()).isEqualByComparingTo("200.00");
    }

    @Test
    void varianceWhenSkuIsNotOnPurchaseOrder() {
        PurchaseOrder po = po("PO-1", "received", OLD, poLine("RICE", 10, 10, "100.00"));
        List<InboxDocument.LineItem> lines = List.of(
                invoiceLine("RICE", 10, "100.00", "1000.00"),
                invoiceLine("SUGAR", 4, "50.00", "200.00"));

        InboxDocument.ThreeWayMatch result = ThreeWayMatcher.match("INV-1", lines, List.of(po));

        assertThat(result.status()).isEqualTo("variance");
        assertThat(result.summary()).contains("1 of 2 lines agree")
                .contains("SKU SUGAR is not on the purchase order.");
        // The unmatched line is counted at its full amount.
        assertThat(result.varianceAmount()).isEqualByComparingTo("200.00");
    }

    @Test
    void noPoWhenSupplierLinesDoNotMatchAnyOrder() {
        PurchaseOrder po = po("PO-1", "received", OLD, poLine("RICE", 10, 10, "100.00"));
        List<InboxDocument.LineItem> lines = List.of(invoiceLine("SUGAR", 4, "50.00", "200.00"));

        InboxDocument.ThreeWayMatch result = ThreeWayMatcher.match("INV-1", lines, List.of(po));

        assertThat(result.status()).isEqualTo("no-po");
        assertThat(result.summary()).isEqualTo("No purchase order matches this invoice");
        assertThat(result.poTotal()).isNull();
        assertThat(result.poNumber()).isNull();
    }

    @Test
    void ignoresDraftAndCancelledOrders() {
        PurchaseOrder draft = po("PO-DRAFT", "draft", OLD, poLine("RICE", 10, 0, "100.00"));
        List<InboxDocument.LineItem> lines = List.of(invoiceLine("RICE", 10, "100.00", "1000.00"));

        InboxDocument.ThreeWayMatch result = ThreeWayMatcher.match("INV-1", lines, List.of(draft));

        assertThat(result.status()).isEqualTo("no-po");
    }

    @Test
    void missingGrnWhenNothingReceived() {
        PurchaseOrder po = po("PO-1", "sent", OLD, poLine("RICE", 10, 0, "100.00"));
        List<InboxDocument.LineItem> lines = List.of(invoiceLine("RICE", 10, "100.00", "1000.00"));

        InboxDocument.ThreeWayMatch result = ThreeWayMatcher.match("INV-1", lines, List.of(po));

        assertThat(result.status()).isEqualTo("missing-grn");
        assertThat(result.summary()).contains("not been received").contains("PO-1");
        assertThat(result.poNumber()).isEqualTo("PO-1");
        assertThat(result.grnQtyMatched()).isFalse();
    }

    @Test
    void missingGrnWhenInvoiceHasNoLines() {
        PurchaseOrder po = po("PO-1", "received", OLD, poLine("RICE", 10, 10, "100.00"));

        InboxDocument.ThreeWayMatch result = ThreeWayMatcher.match("INV-1", List.of(), List.of(po));

        assertThat(result.status()).isEqualTo("missing-grn");
        assertThat(result.summary()).isEqualTo("No line items to compare");
    }

    @Test
    void prefersOrderCoveringMoreSkusThenOldest() {
        PurchaseOrder narrow = po("PO-NARROW", "received", OLD, poLine("RICE", 10, 10, "100.00"));
        PurchaseOrder wide = po("PO-WIDE", "received", NEW,
                poLine("RICE", 10, 10, "100.00"), poLine("OIL", 5, 5, "250.00"));
        List<InboxDocument.LineItem> lines = List.of(
                invoiceLine("RICE", 10, "100.00", "1000.00"),
                invoiceLine("OIL", 5, "250.00", "1250.00"));

        InboxDocument.ThreeWayMatch result = ThreeWayMatcher.match("INV-1", lines, List.of(narrow, wide));

        assertThat(result.poNumber()).isEqualTo("PO-WIDE");
        assertThat(result.status()).isEqualTo("matched");
    }
}
