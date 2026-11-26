package com.transmute.erp.haiku;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Asks an AI model on Groq (OpenAI-compatible chat API) for one haiku. Used only when an API
 * key is configured. Any failure returns empty, so the caller can fall back to fixed verses.
 */
@Component
class GroqHaikuClient {

    private final RestClient client;
    private final String apiKey;
    private final String model;

    GroqHaikuClient(@Value("${transmute.haiku.groq-api-key:}") String apiKey,
                    @Value("${transmute.haiku.model:openai/gpt-oss-20b}") String model,
                    @Value("${transmute.haiku.base-url:https://api.groq.com/openai/v1}") String baseUrl) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
        this.client = RestClient.builder().baseUrl(baseUrl).build();
    }

    boolean configured() {
        return !apiKey.isEmpty();
    }

    /** Returns three lines of haiku, or empty if the call fails or the reply is not three lines. */
    Optional<List<String>> writeHaiku(String date) {
        if (!configured()) {
            return Optional.empty();
        }
        String prompt = "Today is " + date + ". You write haiku for a grocery and food distribution business: "
                + "wholesale warehouses, delivery vans, shop shelves, cold rooms, supplier deliveries, reorders, "
                + "credit customers and cash at the till. Write one haiku (three lines, roughly 5-7-5 syllables) "
                + "about the day's work in that business, using concrete everyday detail. "
                + "Reply with only the three lines.";
        // Low reasoning effort keeps the model's thinking short, so the three lines are not cut off.
        Map<String, Object> body = Map.of(
                "model", model,
                "reasoning_effort", "low",
                "max_completion_tokens", 600,
                "messages", List.of(Map.of("role", "user", "content", prompt)));
        try {
            Map<?, ?> response = client.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            String text = contentOf(response);
            if (text == null) {
                return Optional.empty();
            }
            List<String> lines = text.lines().map(String::strip).filter(s -> !s.isEmpty()).toList();
            return lines.size() == 3 ? Optional.of(lines) : Optional.empty();
        } catch (RestClientException | ClassCastException e) {
            return Optional.empty();
        }
    }

    /** The assistant's message text from a chat completion response. */
    private static String contentOf(Map<?, ?> response) {
        if (response == null || !(response.get("choices") instanceof List<?> choices) || choices.isEmpty()) {
            return null;
        }
        if (choices.get(0) instanceof Map<?, ?> choice && choice.get("message") instanceof Map<?, ?> message
                && message.get("content") instanceof String s) {
            return s;
        }
        return null;
    }
}
