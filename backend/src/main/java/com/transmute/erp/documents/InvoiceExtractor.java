package com.transmute.erp.documents;

import com.transmute.erp.ai.GroqClient;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
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
 * Reads the header fields of a supplier invoice photo, scan or PDF with Groq models.
 * A PDF with a text layer is read as text; a scanned PDF has its first pages rendered and read
 * as images. Any failure returns empty, so an upload never fails because of extraction.
 */
@Component
public class InvoiceExtractor {

    /** One invoice line as read from the file. Blank or null means the model did not find it. */
    public record Line(
            String description,
            String sku,
            String qty,
            String unit,
            String rate,
            String amount) {
    }

    /**
     * Values read from the invoice. Blank or null means the model did not find it.
     * lineItems may be null when the model omits the key; treat null as an empty list.
     */
    public record Extracted(
            String supplier,
            String invoiceNumber,
            String invoiceDate,
            String dueDate,
            String subtotal,
            String tax,
            String total,
            String supplierAddress,
            String supplierNtn,
            List<Line> lineItems) {
    }

    static final Set<String> IMAGE_TYPES = Set.of("image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif");
    static final String PDF_TYPE = "application/pdf";

    /** Fewer non-whitespace characters than this means the PDF has no usable text layer. */
    static final int MIN_TEXT_CHARS = 80;
    /** Pages rendered for a scanned PDF. */
    static final int MAX_PDF_PAGES = 3;

    private static final String PROMPT =
            "This is a supplier invoice from a food distribution business. Read the header fields and reply with "
            + "only a JSON object with these keys: supplier, invoiceNumber, invoiceDate (YYYY-MM-DD), dueDate "
            + "(YYYY-MM-DD), subtotal, tax, total (plain numbers, no currency symbols), supplierAddress, "
            + "supplierNtn, lineItems. lineItems is an array with one object per invoice line, each with keys "
            + "description, sku, qty, unit, rate (unit price) and amount (line total), using plain numbers with no "
            + "currency symbols. Use an empty array if no lines can be read. Use null for any field you cannot read "
            + "clearly. Do not guess.";

    private final GroqClient groq;
    private final ObjectMapper json;
    private final String model;
    private final String textModel;

    public InvoiceExtractor(GroqClient groq, ObjectMapper json,
                            @Value("${transmute.ocr.model:meta-llama/llama-4-scout-17b-16e-instruct}") String model,
                            @Value("${transmute.ocr.text-model:openai/gpt-oss-20b}") String textModel) {
        this.groq = groq;
        this.json = json;
        this.model = model;
        this.textModel = textModel;
    }

    public Optional<Extracted> extract(Path file, String contentType) {
        if (!groq.configured() || contentType == null) {
            return Optional.empty();
        }
        String type = contentType.toLowerCase(Locale.ROOT);
        if (PDF_TYPE.equals(type)) {
            return extractPdf(file);
        }
        if (!IMAGE_TYPES.contains(type)) {
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
            return groq.complete(model, messages, 1600, null)
                    .map(InvoiceExtractor::jsonPart)
                    .flatMap(this::parse);
        } catch (IOException | RuntimeException e) {
            return Optional.empty();
        }
    }

    /** Text layer first (one text request); if there is no text, the first pages as images (one vision request). */
    private Optional<Extracted> extractPdf(Path file) {
        try {
            byte[] pdf = Files.readAllBytes(file);
            String text = PdfPages.extractText(pdf);
            if (nonWhitespaceCount(text) >= MIN_TEXT_CHARS) {
                List<Map<String, Object>> messages = List.of(Map.of(
                        "role", "user",
                        "content", PROMPT + "\n\nInvoice text:\n" + text));
                return groq.complete(textModel, messages, 1600, null)
                        .map(InvoiceExtractor::jsonPart)
                        .flatMap(this::parse);
            }
            List<byte[]> pages = PdfPages.renderPages(pdf, MAX_PDF_PAGES);
            if (pages.isEmpty()) {
                return Optional.empty();
            }
            List<Object> content = new ArrayList<>();
            content.add(Map.of("type", "text", "text", PROMPT));
            for (byte[] png : pages) {
                String dataUrl = "data:image/png;base64," + Base64.getEncoder().encodeToString(png);
                content.add(Map.of("type", "image_url", "image_url", Map.of("url", dataUrl)));
            }
            List<Map<String, Object>> messages = List.of(Map.of("role", "user", "content", content));
            return groq.complete(model, messages, 1600, null)
                    .map(InvoiceExtractor::jsonPart)
                    .flatMap(this::parse);
        } catch (IOException | RuntimeException e) {
            return Optional.empty();
        }
    }

    private static long nonWhitespaceCount(String text) {
        return text.chars().filter(c -> !Character.isWhitespace(c)).count();
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
