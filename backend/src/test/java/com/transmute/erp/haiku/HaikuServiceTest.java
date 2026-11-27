package com.transmute.erp.haiku;

import static org.assertj.core.api.Assertions.assertThat;

import com.transmute.erp.ai.GroqClient;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class HaikuServiceTest {

    private static final LocalDate DAY = LocalDate.of(2026, 3, 10);

    @Test
    void usesFixedVerseWhenAiIsNotConfigured() {
        GroqHaikuClient unconfigured = new GroqHaikuClient(new GroqClient("", "m", "http://localhost:1"));
        HaikuService service = new HaikuService(unconfigured);

        HaikuService.DailyHaiku haiku = service.forDate(DAY);

        assertThat(haiku.source()).isEqualTo("fixed");
        assertThat(haiku.date()).isEqualTo("2026-03-10");
        assertThat(haiku.lines()).hasSize(3);
    }

    @Test
    void cachesSuccessfulAiHaikuAndCallsModelOnce() {
        CountingClient client = new CountingClient(List.of(Optional.of(List.of("one", "two", "three"))));
        HaikuService service = new HaikuService(client, new MutableClock(Instant.parse("2026-03-10T08:00:00Z")));

        assertThat(service.forDate(DAY).source()).isEqualTo("ai");
        assertThat(service.forDate(DAY).lines()).containsExactly("one", "two", "three");
        assertThat(client.calls).isEqualTo(1);
    }

    @Test
    void retriesAiOnlyAfterCooldownFollowingAFailure() {
        Instant start = Instant.parse("2026-03-10T08:00:00Z");
        MutableClock clock = new MutableClock(start);
        CountingClient client = new CountingClient(List.of(
                Optional.empty(),
                Optional.of(List.of("one", "two", "three"))));
        HaikuService service = new HaikuService(client, clock);

        assertThat(service.forDate(DAY).source()).isEqualTo("fixed");
        assertThat(client.calls).isEqualTo(1);

        clock.now = start.plus(Duration.ofMinutes(5));
        assertThat(service.forDate(DAY).source()).isEqualTo("fixed");
        assertThat(client.calls).isEqualTo(1);

        clock.now = start.plus(Duration.ofMinutes(10));
        assertThat(service.forDate(DAY).source()).isEqualTo("ai");
        assertThat(client.calls).isEqualTo(2);
        assertThat(service.forDate(DAY).source()).isEqualTo("ai");
        assertThat(client.calls).isEqualTo(2);
    }

    /** Returns the scripted replies in order and counts how many times the model was asked. */
    private static final class CountingClient extends GroqHaikuClient {

        private final List<Optional<List<String>>> replies;
        int calls;

        CountingClient(List<Optional<List<String>>> replies) {
            super(new GroqClient("", "m", "http://localhost:1"));
            this.replies = replies;
        }

        @Override
        Optional<List<String>> writeHaiku(String date) {
            calls++;
            return replies.get(Math.min(calls - 1, replies.size() - 1));
        }
    }

    /** A clock whose time the test moves forward by hand. */
    private static final class MutableClock extends Clock {

        Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
