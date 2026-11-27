package com.transmute.erp.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Counts failed sign-ins per key and blocks a key after too many failures in a sliding window.
 * Keys starting with {@code user:} use the per-account limit; all other keys ({@code ip:}) use the per-address limit.
 */
@Component
public class LoginThrottle {

    /** Failures from one address before it is blocked. */
    static final int MAX_FAILURES = 5;
    /** Failures against one account before it is blocked. Higher, so an attacker cannot lock the owner out cheaply. */
    static final int MAX_USER_FAILURES = 20;
    static final Duration WINDOW = Duration.ofMinutes(15);
    /** Expired keys are swept out of the map once it grows past this size. */
    static final int SWEEP_THRESHOLD = 1000;
    /** Hard cap on tracked keys; when full, the oldest key that is not currently blocked is evicted. */
    static final int MAX_KEYS = 10_000;

    private static final String USER_PREFIX = "user:";

    private final Clock clock;
    // Insertion-ordered so the oldest key can be evicted. Only accessed while holding this object's monitor.
    private final Map<String, Deque<Instant>> failures = new LinkedHashMap<>();

    public LoginThrottle() {
        this(Clock.systemUTC());
    }

    LoginThrottle(Clock clock) {
        this.clock = clock;
    }

    public synchronized boolean isBlocked(String key) {
        Deque<Instant> recent = failures.get(key);
        if (recent == null) {
            return false;
        }
        prune(recent);
        if (recent.isEmpty()) {
            failures.remove(key);
            return false;
        }
        return recent.size() >= limitFor(key);
    }

    /**
     * Records one failed attempt for the key. When the map is full, the oldest key that is not
     * currently blocked is evicted; if every tracked key is blocked, the new key is not tracked and
     * no blocked key is evicted.
     */
    public synchronized void recordFailure(String key) {
        if (failures.size() > SWEEP_THRESHOLD) {
            sweepExpired();
        }
        Deque<Instant> recent = failures.get(key);
        if (recent == null) {
            if (failures.size() >= MAX_KEYS && !evictOldestUnblocked()) {
                return;
            }
            recent = new ArrayDeque<>();
            failures.put(key, recent);
        }
        prune(recent);
        recent.addLast(clock.instant());
    }

    public synchronized void reset(String key) {
        failures.remove(key);
    }

    private static int limitFor(String key) {
        return key.startsWith(USER_PREFIX) ? MAX_USER_FAILURES : MAX_FAILURES;
    }

    /**
     * Evicts the oldest tracked key that is not currently blocked, pruning expired failures as it goes.
     * Returns false, and evicts nothing, when every tracked key is blocked.
     */
    private boolean evictOldestUnblocked() {
        Iterator<Map.Entry<String, Deque<Instant>>> it = failures.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, Deque<Instant>> entry = it.next();
            Deque<Instant> recent = entry.getValue();
            prune(recent);
            if (recent.size() < limitFor(entry.getKey())) {
                it.remove();
                return true;
            }
        }
        return false;
    }

    private void sweepExpired() {
        Iterator<Deque<Instant>> it = failures.values().iterator();
        while (it.hasNext()) {
            Deque<Instant> recent = it.next();
            prune(recent);
            if (recent.isEmpty()) {
                it.remove();
            }
        }
    }

    private void prune(Deque<Instant> recent) {
        Instant cutoff = clock.instant().minus(WINDOW);
        while (!recent.isEmpty() && !recent.peekFirst().isAfter(cutoff)) {
            recent.pollFirst();
        }
    }
}
