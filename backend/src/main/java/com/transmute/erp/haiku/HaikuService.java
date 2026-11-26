package com.transmute.erp.haiku;

import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Picks the haiku for a day. The verses are fixed and rotate by day of the year, so every
 * day shows the same verse, and the set repeats after {@link #HAIKU} runs out.
 */
@Service
public class HaikuService {

    /** The haiku for one day. Each verse is a list of three lines. */
    public record DailyHaiku(String date, List<String> lines) {
    }

    private static final List<List<String>> HAIKU = List.of(
            List.of("Quiet ledger hums", "each figure finds its own place", "the machine keeps count"),
            List.of("Morning invoice stack", "a supplier's bill waits its turn", "review, then approve"),
            List.of("Shelves counted at dawn", "numbers settle into rows", "the warehouse breathes"),
            List.of("A cheque on the desk", "deposited, then cleared at last", "the balance climbs up"),
            List.of("Orders arrive small", "gathered in one steady stream", "the day finds its shape"),
            List.of("Reorder line drawn", "stock falls toward its marked level", "draft the order early"),
            List.of("Receivables grey", "a reminder kindly worded", "trust returns in time"),
            List.of("Quote lines take form", "price, then promise, then the sale", "a plain pen, a plan"),
            List.of("Rain on the tin roof", "the bank statement balances", "one line at a time"),
            List.of("Small wins add up", "a receipt checked against the PO", "nothing goes astray"),
            List.of("Dust on the ledger", "we wipe it with careful hands", "and start again fresh"),
            List.of("Lantern in the dusk", "the last invoice of the day", "signed, the desk is clear"),
            List.of("Two lists, one truth", "stock on the shelf and in the book", "they agree at last"),
            List.of("Sun on the crates", "loaded, counted, sent away", "the van turns for home"),
            List.of("A quiet alert", "a bank account changed overnight", "we pause and we ask"),
            List.of("Tea cools by the screen", "the morning's sales still rising", "steady as the tide"),
            List.of("Coins in a jar", "add up slowly, day by day", "so do good habits"),
            List.of("The margin written", "in the margin of the page", "small notes, sharp eyes"),
            List.of("Harvest of the week", "sold, received, paid and filed", "the books breathe out"),
            List.of("Ask a simple thing", "the answer comes in plain words", "numbers, no fuss"));

    public DailyHaiku forDate(LocalDate date) {
        int index = date.getDayOfYear() % HAIKU.size();
        return new DailyHaiku(date.toString(), HAIKU.get(index));
    }
}
