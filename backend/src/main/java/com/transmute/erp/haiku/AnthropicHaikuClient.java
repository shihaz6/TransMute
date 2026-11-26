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
 * Asks a Claude model for one haiku through the Anthropic Messages API. Used only when an
 * API key is configured. Any failure returns empty, so the caller can fall back.
 */
@Component
class AnthropicHaikuClient {

    private static final String API_VERSION = "2023-06-01";

    private final RestClient client;
    private final String apiKey;
    private final String model;

    AnthropicHaikuClient(@Value("${transmute.haiku.anthropic-api-key:}") String apiKey,
                         @Value("${transmute.haiku.model:claude-haiku-5-5}") String model,
                         @Value("${transmute.haiku.base-url:https://api.anthropic.com}") String baseUrl) {
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
        Map<String, Object> body = Map.of(
                "model", model,
                "max_tokens", 80,
                "messages", List.of(Map.of("role", "user", "content", prompt)));
        try {
            Map<?, ?> response = client.post()
                    .uri("/v1/messages")
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", API_VERSION)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            String text = textOf(response);
            if (text == null) {
                return Optional.empty();
            }
            List<String> lines = text.lines().map(String::strip).filter(s -> !s.isEmpty()).toList();
            return lines.size() == 3 ? Optional.of(lines) : Optional.empty();
        } catch (RestClientException | ClassCastException e) {
            return Optional.empty();
        }
    }

    /** The first text block of a Messages API response. */
    private static String textOf(Map<?, ?> response) {
        if (response == null || !(response.get("content") instanceof List<?> blocks)) {
            return null;
        }
        for (Object block : blocks) {
            if (block instanceof Map<?, ?> map && "text".equals(map.get("type")) && map.get("text") instanceof String s) {
                return s;
            }
        }
        return null;
    }
}
