package com.transmute.erp.haiku;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/**
 * Supplies the haiku for a day. When an API key is configured, a Claude model writes it once
 * per day and the result is kept in memory. Otherwise, or if the model call fails, the fixed
 * verse for that day is used. Both are written for a grocery and food distribution business.
 */
@Service
public class HaikuService {

    /** The haiku for one day. {@code source} is "claude" when a model wrote it, else "fixed". */
    public record DailyHaiku(String date, List<String> lines, String source) {
    }

    private static final List<List<String>> FIXED = List.of(
            List.of("Pallets at the dock", "manifests checked against the truck", "the route starts at dawn"),
            List.of("Cold room hums at four", "milk and eggs logged by the date", "first in, first out"),
            List.of("Shelves restocked by night", "the shop floor ready before light", "the aisles breathe again"),
            List.of("Van loaded by stop", "each drop sealed on its invoice", "the driver signs off"),
            List.of("Expiry dates checked", "the oldest tins move to the front", "waste held in check"),
            List.of("Reorder point crossed", "rice and oil drawn down by the week", "the purchase order goes"),
            List.of("Supplier's invoice", "matched to the goods received note", "three ways agree"),
            List.of("Ten cases at the gate", "the delivery counted by hand", "the shortfall noted"),
            List.of("Retail orders in", "from the mart, the shop, the stall", "one list for the day"),
            List.of("A grocer's balance", "climbs toward its credit limit", "the reminder goes out"),
            List.of("Cash from the till", "banked before the lorry comes", "the statement matches"),
            List.of("Sugar price rises", "the margin checked sack by sack", "the new rate noted"),
            List.of("Market day rush", "the counter fills, the bags tie", "change in a steady hand"),
            List.of("Freezers humming low", "the chain holds from farm to shelf", "cold keeps the trust"),
            List.of("Chilli, turmeric", "cartons stacked in the warehouse", "the spice smell lingers"),
            List.of("Morning dispatch run", "sealed crates, route cards, signed", "the truck pulls away"),
            List.of("Stock count at close", "shrinkage shows on one line", "we find it and fix it"),
            List.of("Substitute brand", "offered when the rice runs short", "the shopper nods yes"),
            List.of("Rent, wages, fuel", "all paid before the week ends", "the margin holds firm"),
            List.of("Quiet stock room", "sacks counted by the window", "the week is balanced"));

    private final AnthropicHaikuClient claude;

    /** One haiku per date, kept for the life of the process so the model is called once a day. */
    private final Map<LocalDate, DailyHaiku> today = new ConcurrentHashMap<>();

    public HaikuService(AnthropicHaikuClient claude) {
        this.claude = claude;
    }

    public DailyHaiku forDate(LocalDate date) {
        return today.computeIfAbsent(date, this::build);
    }

    private DailyHaiku build(LocalDate date) {
        Optional<List<String>> written = claude.writeHaiku(date.toString());
        if (written.isPresent()) {
            return new DailyHaiku(date.toString(), written.get(), "claude");
        }
        int index = date.getDayOfYear() % FIXED.size();
        return new DailyHaiku(date.toString(), FIXED.get(index), "fixed");
    }
}
