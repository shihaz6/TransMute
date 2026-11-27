package com.transmute.erp.documents;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class InvoiceLinesTest {

    private static InvoiceExtractor.Line line(String description, String qty, String rate, String amount) {
        return new InvoiceExtractor.Line(description, null, qty, null, rate, amount);
    }

    private static InboxDocument.LineItem item(String amount) {
        return new InboxDocument.LineItem("LN-TEST", "Item", null, 1, null, null,
                amount == null ? null : new BigDecimal(amount), 70, InvoiceLines.NOTE);
    }

    @Test
    void skipsRowsWithNoDescriptionAndNoAmount() {
        List<InvoiceExtractor.Line> lines = List.of(
                line("", "", "", ""),
                line("Rice", "2", "5", "10"),
                line(null, null, "7", null),
                new InvoiceExtractor.Line(null, null, null, null, null, null));

        List<InboxDocument.LineItem> items = InvoiceLines.from(lines);

        assertThat(items).hasSize(1);
        assertThat(items.get(0).description()).isEqualTo("Rice");
        assertThat(items.get(0).qty()).isEqualTo(2);
        assertThat(items.get(0).confidence()).isEqualTo(70);
        assertThat(items.get(0).note()).isEqualTo("Read from the file. Check before approving.");
        assertThat(items.get(0).id()).startsWith("LN-");
    }

    @Test
    void readsThousandsCommasOnlyInTheGroupedFormat() {
        List<InboxDocument.LineItem> items = InvoiceLines.from(List.of(
                line("Oil", "1", "1,200.50", "1,200.50"),
                line("Salt", "1", "1.2.3", "5")));

        assertThat(items.get(0).rate()).isEqualByComparingTo("1200.50");
        assertThat(items.get(0).amount()).isEqualByComparingTo("1200.50");
        assertThat(items.get(1).rate()).isNull();
        assertThat(items.get(1).amount()).isEqualByComparingTo("5");
    }

    @Test
    void roundsQuantityToWholeNumberAndDefaultsToOne() {
        List<InboxDocument.LineItem> items = InvoiceLines.from(List.of(
                line("Flour", "2.6", null, "1"),
                line("Sugar", "", null, "1"),
                line("Eggs", "0", null, "1")));

        assertThat(items.get(0).qty()).isEqualTo(3);
        assertThat(items.get(1).qty()).isEqualTo(1);
        assertThat(items.get(2).qty()).isEqualTo(1);
    }

    @Test
    void keepsAtMost200Lines() {
        List<InvoiceExtractor.Line> lines = new ArrayList<>();
        for (int i = 1; i <= 250; i++) {
            lines.add(line("Item " + i, "1", "2", "2"));
        }

        assertThat(InvoiceLines.from(lines)).hasSize(200);
    }

    @Test
    void totalsAgreeWithinOnePercentOfSubtotal() {
        BigDecimal subtotal = new BigDecimal("1000");

        assertThat(InvoiceLines.totalsAgree(List.of(item("600"), item("395")), subtotal)).isTrue();
        assertThat(InvoiceLines.totalsAgree(List.of(item("600"), item("380")), subtotal)).isFalse();
    }

    @Test
    void totalsAgreeWhenThereIsNoSubtotalToCheck() {
        assertThat(InvoiceLines.totalsAgree(List.of(item("600")), null)).isTrue();
        assertThat(InvoiceLines.totalsAgree(List.of(item("600")), BigDecimal.ZERO)).isTrue();
    }
}
