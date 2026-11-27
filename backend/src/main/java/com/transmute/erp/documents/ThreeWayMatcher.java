package com.transmute.erp.documents;

import com.transmute.erp.purchasing.PurchaseOrder;
import com.transmute.erp.purchasing.PurchaseOrder.PoLine;
import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Compares a supplier invoice with the purchase order it was raised against and the goods
 * received on that order. Pure logic, no database access.
 */
final class ThreeWayMatcher {

    static final String MATCHED = "matched";
    static final String VARIANCE = "variance";
    static final String MISSING_GRN = "missing-grn";
    static final String NO_PO = "no-po";

    /** Purchase order states that mean goods were sent or received. Drafts and cancelled orders are ignored. */
    private static final Set<String> SENT_OR_RECEIVED = Set.of("sent", "partial-received", "received", "matched");

    /** A unit rate may differ from the PO unit cost by at most this fraction. */
    private static final BigDecimal RATE_TOLERANCE = new BigDecimal("0.005");
    private static final int MAX_NAMED_VARIANCES = 3;

    private ThreeWayMatcher() {
    }

    static InboxDocument.ThreeWayMatch match(String invoiceNumber, List<InboxDocument.LineItem> invoiceLines,
                                             List<PurchaseOrder> candidates) {
        List<InboxDocument.LineItem> lines = invoiceLines == null ? List.of() : invoiceLines;
        if (lines.isEmpty()) {
            return new InboxDocument.ThreeWayMatch(MISSING_GRN, null, null,
                    "No line items to compare", null, false, null);
        }

        PurchaseOrder po = choose(lines, candidates);
        if (po == null) {
            return new InboxDocument.ThreeWayMatch(NO_PO, null, null,
                    "No purchase order matches this invoice", null, false, null);
        }

        Map<String, PoLine> poLines = linesBySku(po);
        BigDecimal invoiceTotal = sumAmounts(lines);

        // Invoiced quantity per SKU, for the SKUs that are on the purchase order.
        Map<String, Integer> invoicedBySku = new LinkedHashMap<>();
        for (InboxDocument.LineItem line : lines) {
            if (line.sku() != null && poLines.containsKey(line.sku())) {
                invoicedBySku.merge(line.sku(), line.qty(), Integer::sum);
            }
        }

        boolean anyReceived = invoicedBySku.keySet().stream()
                .anyMatch(sku -> poLines.get(sku).receivedQty() > 0);
        if (!anyReceived) {
            return new InboxDocument.ThreeWayMatch(MISSING_GRN, po.getId(), po.getGrnId(),
                    "Goods have not been received on " + po.getId() + " yet.",
                    po.getTotal(), false, money(invoiceTotal));
        }

        // SKUs billed for more than was received. Checked per SKU so repeated lines are not double-counted.
        Map<String, Integer> shortBy = new LinkedHashMap<>();
        for (Map.Entry<String, Integer> entry : invoicedBySku.entrySet()) {
            int received = poLines.get(entry.getKey()).receivedQty();
            if (entry.getValue() > received) {
                shortBy.put(entry.getKey(), received);
            }
        }

        List<String> variances = new ArrayList<>();
        int agreeing = 0;
        for (InboxDocument.LineItem line : lines) {
            PoLine poLine = line.sku() == null ? null : poLines.get(line.sku());
            if (poLine == null) {
                variances.add("SKU " + line.sku() + " is not on the purchase order.");
            } else if (line.rate() == null) {
                variances.add("SKU " + line.sku() + " has no rate to compare.");
            } else if (rateDiffers(line.rate(), poLine.unitCost())) {
                variances.add("SKU " + line.sku() + " rate " + money(line.rate())
                        + " differs from PO cost " + money(poLine.unitCost()) + ".");
            } else if (!shortBy.containsKey(line.sku())) {
                agreeing++;
            }
        }
        for (Map.Entry<String, Integer> entry : shortBy.entrySet()) {
            variances.add("SKU " + entry.getKey() + " billed " + invoicedBySku.get(entry.getKey())
                    + ", received " + entry.getValue() + ".");
        }

        BigDecimal accepted = BigDecimal.ZERO;
        for (Map.Entry<String, Integer> entry : invoicedBySku.entrySet()) {
            PoLine poLine = poLines.get(entry.getKey());
            int qty = Math.min(entry.getValue(), poLine.receivedQty());
            accepted = accepted.add(poLine.unitCost().multiply(BigDecimal.valueOf(qty)));
        }

        return new InboxDocument.ThreeWayMatch(
                variances.isEmpty() ? MATCHED : VARIANCE,
                po.getId(),
                po.getGrnId(),
                summarize(agreeing, lines.size(), variances),
                po.getTotal(),
                shortBy.isEmpty(),
                money(invoiceTotal.subtract(accepted)));
    }

    /** The candidate covering the most invoice SKUs; ties go to the oldest order. Null when none covers a SKU. */
    private static PurchaseOrder choose(List<InboxDocument.LineItem> lines, List<PurchaseOrder> candidates) {
        if (candidates == null) {
            return null;
        }
        Set<String> invoiceSkus = new HashSet<>();
        for (InboxDocument.LineItem line : lines) {
            if (line.sku() != null) {
                invoiceSkus.add(line.sku());
            }
        }
        PurchaseOrder best = null;
        int bestCoverage = 0;
        for (PurchaseOrder po : candidates) {
            if (po == null || !SENT_OR_RECEIVED.contains(po.getStatus())) {
                continue;
            }
            Map<String, PoLine> poLines = linesBySku(po);
            int coverage = (int) invoiceSkus.stream().filter(poLines::containsKey).count();
            if (coverage == 0) {
                continue;
            }
            if (best == null || coverage > bestCoverage || (coverage == bestCoverage && isOlder(po, best))) {
                best = po;
                bestCoverage = coverage;
            }
        }
        return best;
    }

    private static boolean isOlder(PurchaseOrder a, PurchaseOrder b) {
        if (a.getCreatedAt() == null) {
            return false;
        }
        if (b.getCreatedAt() == null) {
            return true;
        }
        return a.getCreatedAt().isBefore(b.getCreatedAt());
    }

    private static Map<String, PoLine> linesBySku(PurchaseOrder po) {
        Map<String, PoLine> bySku = new HashMap<>();
        if (po.getLines() == null) {
            return bySku;
        }
        for (PoLine line : po.getLines()) {
            if (line != null && line.sku() != null) {
                bySku.putIfAbsent(line.sku(), line);
            }
        }
        return bySku;
    }

    /** True when the rate differs from the unit cost by more than the tolerance. */
    private static boolean rateDiffers(BigDecimal rate, BigDecimal unitCost) {
        BigDecimal diff = rate.subtract(unitCost).abs();
        if (unitCost.signum() == 0) {
            return diff.signum() > 0;
        }
        return diff.divide(unitCost, MathContext.DECIMAL64).compareTo(RATE_TOLERANCE) > 0;
    }

    private static String summarize(int agreeing, int total, List<String> variances) {
        StringBuilder text = new StringBuilder(agreeing + " of " + total + " lines agree.");
        int named = Math.min(variances.size(), MAX_NAMED_VARIANCES);
        for (int i = 0; i < named; i++) {
            text.append(' ').append(variances.get(i));
        }
        if (variances.size() > named) {
            text.append(' ').append(variances.size() - named).append(" more variances.");
        }
        return text.toString();
    }

    private static BigDecimal sumAmounts(List<InboxDocument.LineItem> lines) {
        return lines.stream()
                .map(InboxDocument.LineItem::amount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
