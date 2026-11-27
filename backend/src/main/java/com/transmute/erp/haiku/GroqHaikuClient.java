package com.transmute.erp.haiku;

import com.transmute.erp.ai.GroqClient;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * Asks an AI model for one haiku. Uses the shared Groq client. Any failure returns empty, so
 * the caller can fall back to fixed verses.
 */
@Component
class GroqHaikuClient {

    private final GroqClient groq;

    GroqHaikuClient(GroqClient groq) {
        this.groq = groq;
    }

    /** Returns three lines of haiku, or empty if the call fails or the reply is not three lines. */
    Optional<List<String>> writeHaiku(String date) {
        String prompt = "Today is " + date + ". You write haiku for a grocery and food distribution business: "
                + "wholesale warehouses, delivery vans, shop shelves, cold rooms, supplier deliveries, reorders, "
                + "credit customers and cash at the till. Write one haiku (three lines, roughly 5-7-5 syllables) "
                + "about the day's work in that business, using concrete everyday detail. "
                + "Reply with only the three lines.";
        // Low reasoning effort keeps the model's thinking short, so the three lines are not cut off.
        return groq.complete(List.of(Map.of("role", "user", "content", prompt)), 600, "low")
                .map(text -> text.lines().map(String::strip).filter(s -> !s.isEmpty()).toList())
                .filter(lines -> lines.size() == 3);
    }
}
