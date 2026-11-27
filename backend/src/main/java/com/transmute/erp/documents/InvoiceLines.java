package com.transmute.erp.documents;

import com.transmute.erp.common.Ids;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/** Turns the lines read from an invoice into line items for the document. */
final class InvoiceLines {

    /** Most lines kept from one invoice. */
    static final int MAX_LINES = 200;
    static final int CONFIDENCE = 70;
    static final String NOTE = "Read from the file. Check before approving.";

    private static final Pattern PLAIN_NUMBER = Pattern.compile("^-?\\d*\\.?\\d+$");
    private static final Pattern THOUSANDS_NUMBER = Pattern.compile("^-?\\d{1,3}(,\\d{3})+(\\.\\d+)?$");

    private InvoiceLines() {
    }

    static List<InboxDocument.LineItem> from(List<InvoiceExtractor.Line> lines) {
        List<InboxDocument.LineItem> items = new ArrayList<>();
        if (lines == null) {
            return items;
        }
        for (InvoiceExtractor.Line line : lines) {
            if (items.size() >= MAX_LINES) {
                break;
            }
            if (line == null || (blank(line.description()) && blank(line.amount()))) {
                continue;
            }
            items.add(new InboxDocument.LineItem(
                    Ids.next("LN"),
                    text(line.description()),
                    text(line.sku()),
                    quantity(line.qty()),
                    text(line.unit()),
                    number(line.rate()),
                    number(line.amount()),
                    CONFIDENCE,
                    NOTE));
        }
        return items;
    }

    /** True when the amounts add up to the subtotal within 1%, or when there is no subtotal to check against. */
    static boolean totalsAgree(List<InboxDocument.LineItem> items, BigDecimal subtotal) {
        if (subtotal == null || subtotal.signum() == 0) {
            return true;
        }
        BigDecimal sum = BigDecimal.ZERO;
        if (items != null) {
            for (InboxDocument.LineItem item : items) {
                if (item != null && item.amount() != null) {
                    sum = sum.add(item.amount());
                }
            }
        }
        BigDecimal tolerance = subtotal.abs().multiply(new BigDecimal("0.01"));
        return sum.subtract(subtotal).abs().compareTo(tolerance) <= 0;
    }

    /** Quantity rounded to a whole number, never below 1. Blank or unreadable means 1. */
    private static int quantity(String s) {
        BigDecimal qty = number(s);
        if (qty == null) {
            return 1;
        }
        BigDecimal rounded = qty.setScale(0, RoundingMode.HALF_UP);
        if (rounded.compareTo(BigDecimal.valueOf(Integer.MAX_VALUE)) > 0) {
            return Integer.MAX_VALUE;
        }
        return Math.max(1, rounded.intValue());
    }

    /**
     * Parses a number as read from the file. Plain thousands commas are removed only when the text
     * matches the grouped pattern; any other comma makes the number unreadable (null).
     */
    static BigDecimal number(String s) {
        if (blank(s)) {
            return null;
        }
        String t = s.trim();
        if (t.contains(",")) {
            if (!THOUSANDS_NUMBER.matcher(t).matches()) {
                return null;
            }
            t = t.replace(",", "");
        }
        if (!PLAIN_NUMBER.matcher(t).matches()) {
            return null;
        }
        return new BigDecimal(t);
    }

    private static String text(String s) {
        return blank(s) ? null : s.trim();
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
