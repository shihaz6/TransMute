package com.transmute.erp.ai;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Shared client for Groq's OpenAI-compatible chat API. Used by the daily haiku and the
 * Catalyst assistant. Every failure returns empty, so callers can fall back without crashing.
 */
@Component
public class GroqClient {

    private final RestClient client;
    private final String apiKey;
    private final String model;

    public GroqClient(@Value("${transmute.haiku.groq-api-key:}") String apiKey,
                      @Value("${transmute.haiku.model:openai/gpt-oss-20b}") String model,
                      @Value("${transmute.haiku.base-url:https://api.groq.com/openai/v1}") String baseUrl) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
        this.client = RestClient.builder().baseUrl(baseUrl).build();
    }

    public boolean configured() {
        return !apiKey.isEmpty();
    }

    /**
     * Sends the messages (each a map with "role" and "content") and returns the assistant's text,
     * or empty if no key is set, the call fails, or the reply has no text.
     */
    public Optional<String> complete(List<?> messages, int maxTokens, String reasoningEffort) {
        return complete(model, messages, maxTokens, reasoningEffort);
    }

    /** As {@link #complete(List, int, String)}, but with a specific model (for example a vision model). */
    public Optional<String> complete(String modelName, List<?> messages, int maxTokens, String reasoningEffort) {
        if (!configured()) {
            return Optional.empty();
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", modelName);
        if (reasoningEffort != null) {
            body.put("reasoning_effort", reasoningEffort);
        }
        body.put("max_completion_tokens", maxTokens);
        body.put("messages", messages);
        try {
            Map<?, ?> response = client.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            String text = contentOf(response);
            return text == null || text.isBlank() ? Optional.empty() : Optional.of(text.strip());
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
