package com.transmute.erp.documents;

import com.transmute.erp.ai.GroqClient;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Reads the header fields of a supplier invoice photo or scan with a Groq vision model.
 * Only images are supported. PDFs are not rendered yet. Any failure returns empty, so an
 * upload never fails because of extraction.
 */
@Component
public class InvoiceExtractor {

    /** Values read from the invoice. Blank or null means the model did not find it. */
    public record Extracted(
            String supplier,
            String invoiceNumber,
            String invoiceDate,
            String dueDate,
            String subtotal,
            String tax,
            String total,
            String supplierAddress,
            String supplierNtn) {
    }

    static final Set<String> IMAGE_TYPES = Set.of("image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif");

    private static final String PROMPT =
            "This is a supplier invoice from a food distribution business. Read the header fields and reply with "
            + "only a JSON object with these keys: supplier, invoiceNumber, invoiceDate (YYYY-MM-DD), dueDate "
            + "(YYYY-MM-DD), subtotal, tax, total (plain numbers, no currency symbols), supplierAddress, "
            + "supplierNtn. Use null for any field you cannot read clearly. Do not guess.";

    private final GroqClient groq;
    private final ObjectMapper json;
    private final String model;

    public InvoiceExtractor(GroqClient groq, ObjectMapper json,
                            @Value("${transmute.ocr.model:meta-llama/llama-4-scout-17b-16e-instruct}") String model) {
        this.groq = groq;
        this.json = json;
        this.model = model;
    }

    public Optional<Extracted> extract(Path file, String contentType) {
        if (!groq.configured() || contentType == null
                || !IMAGE_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            return Optional.empty();
        }
        try {
            String dataUrl = "data:" + contentType + ";base64,"
                    + Base64.getEncoder().encodeToString(Files.readAllBytes(file));
            List<Map<String, Object>> messages = List.of(Map.of(
                    "role", "user",
                    "content", List.of(
                            Map.of("type", "text", "text", PROMPT),
                            Map.of("type", "image_url", "image_url", Map.of("url", dataUrl)))));
            return groq.complete(model, messages, 800, null)
                    .map(InvoiceExtractor::jsonPart)
                    .flatMap(this::parse);
        } catch (IOException | RuntimeException e) {
            return Optional.empty();
        }
    }

    /** The JSON object inside the reply, without any code fence around it. */
    static String jsonPart(String reply) {
        int start = reply.indexOf('{');
        int end = reply.lastIndexOf('}');
        return start >= 0 && end > start ? reply.substring(start, end + 1) : reply;
    }

    private Optional<Extracted> parse(String text) {
        try {
            return Optional.ofNullable(json.readValue(text, Extracted.class));
        } catch (RuntimeException e) {
            return Optional.empty();
        }
    }
}
