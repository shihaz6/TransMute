package com.transmute.erp.haiku;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Supplies the haiku for a day. When an API key is configured, an AI model writes it once
 * per day and the result is kept in memory. Otherwise, or if the model call fails, the fixed
 * verse for that day is used. A failed model call is retried after a short cooldown. Both are
 * written for a grocery and food distribution business.
 */
@Service
public class HaikuService {

    private static final Logger log = LoggerFactory.getLogger(HaikuService.class);

    /** The haiku for one day. {@code source} is "ai" when a model wrote it, else "fixed". */
    public record DailyHaiku(String date, List<String> lines, String source) {
    }

    private static final Duration RETRY_AFTER = Duration.ofMinutes(10);

    /** Only dates this many days before or after today may call the model. */
    private static final int WINDOW_DAYS = 1;

    /** Most AI haikus kept in memory. When there are more, the oldest date is dropped. */
    private static final int MAX_CACHED = 30;

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

    private final GroqHaikuClient ai;
    private final Clock clock;

    /** One AI haiku per date, kept for the life of the process so the model is called once a day. */
    private final Map<LocalDate, DailyHaiku> today = new ConcurrentHashMap<>();

    /** When the model last failed for a date. Until the cooldown passes, the fixed verse is used. */
    private final Map<LocalDate, Instant> lastFailure = new ConcurrentHashMap<>();

    /**
     * One lock object per date. A request for a date holds only that date's lock while it calls
     * the model, so two first requests for the same day call it once, and other days never wait.
     * Locks are never removed: a lock may be held or awaited by another thread, and removing it
     * would let a second thread call the model for the same date. Only in-window dates get a
     * lock, so this map grows by one small object per day that is served.
     */
    private final Map<LocalDate, Object> dateLocks = new ConcurrentHashMap<>();

    /** Guards trimming of the cache so that concurrent inserts do not overshoot {@link #MAX_CACHED}. */
    private final Object cacheLock = new Object();

    /** Entries for dates older than this many days before today are dropped. */
    private static final int KEEP_DAYS = 2;

    @Autowired
    public HaikuService(GroqHaikuClient ai) {
        this(ai, Clock.systemUTC());
    }

    public HaikuService(GroqHaikuClient ai, Clock clock) {
        this.ai = ai;
        this.clock = clock;
    }

    public DailyHaiku forDate(LocalDate date) {
        prune();
        DailyHaiku cached = today.get(date);
        if (cached != null) {
            return cached;
        }
        // Dates outside the window never reach the model and are never cached.
        LocalDate now = LocalDate.now(clock);
        if (date.isBefore(now.minusDays(WINDOW_DAYS)) || date.isAfter(now.plusDays(WINDOW_DAYS))) {
            return fixed(date);
        }
        // Only this date is locked while the model is called. Other dates are not blocked.
        Object lock = dateLocks.computeIfAbsent(date, d -> new Object());
        synchronized (lock) {
            cached = today.get(date);
            if (cached != null) {
                return cached;
            }
            Instant failed = lastFailure.get(date);
            if (failed != null && clock.instant().isBefore(failed.plus(RETRY_AFTER))) {
                return fixed(date);
            }
            Optional<List<String>> written;
            try {
                written = ai.writeHaiku(date.toString());
            } catch (RuntimeException e) {
                log.warn("Haiku model call failed for {}, using the fixed verse", date, e);
                written = Optional.empty();
            }
            if (written.isPresent()) {
                DailyHaiku haiku = new DailyHaiku(date.toString(), written.get(), "ai");
                remember(date, haiku);
                lastFailure.remove(date);
                return haiku;
            }
            lastFailure.put(date, clock.instant());
            return fixed(date);
        }
    }

    /** Caches an AI haiku and drops the oldest dates while the cache is over {@link #MAX_CACHED}. */
    private void remember(LocalDate date, DailyHaiku haiku) {
        synchronized (cacheLock) {
            today.put(date, haiku);
            while (today.size() > MAX_CACHED) {
                today.keySet().stream().min(Comparator.naturalOrder()).ifPresent(today::remove);
            }
        }
    }

    /** Drops cache and failure entries for dates older than {@link #KEEP_DAYS} days. */
    private void prune() {
        LocalDate cutoff = LocalDate.now(clock).minusDays(KEEP_DAYS);
        today.keySet().removeIf(d -> d.isBefore(cutoff));
        lastFailure.keySet().removeIf(d -> d.isBefore(cutoff));
    }

    private DailyHaiku fixed(LocalDate date) {
        int index = date.getDayOfYear() % FIXED.size();
        return new DailyHaiku(date.toString(), FIXED.get(index), "fixed");
    }
}
