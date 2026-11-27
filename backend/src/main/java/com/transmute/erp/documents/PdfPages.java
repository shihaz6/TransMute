package com.transmute.erp.documents;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import javax.imageio.ImageIO;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;

/**
 * Reads a PDF for invoice extraction: its text layer, or its first pages rendered as PNG.
 * Every failure returns an empty result, so extraction never throws.
 */
final class PdfPages {

    static final int MAX_TEXT_CHARS = 20_000;
    private static final float RENDER_DPI = 150f;

    private PdfPages() {
    }

    /** Text of all pages, trimmed and capped at {@link #MAX_TEXT_CHARS}. Empty on any failure. */
    static String extractText(byte[] pdf) {
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            String text = new PDFTextStripper().getText(doc);
            if (text == null) {
                return "";
            }
            text = text.trim();
            return text.length() > MAX_TEXT_CHARS ? text.substring(0, MAX_TEXT_CHARS) : text;
        } catch (IOException | RuntimeException e) {
            return "";
        }
    }

    /** The first {@code maxPages} pages (clamped to 1..3) as PNG bytes at 150 DPI. Empty on any failure. */
    static List<byte[]> renderPages(byte[] pdf, int maxPages) {
        List<byte[]> pages = new ArrayList<>();
        int limit = Math.max(1, Math.min(3, maxPages));
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            PDFRenderer renderer = new PDFRenderer(doc);
            int count = Math.min(limit, doc.getNumberOfPages());
            for (int i = 0; i < count; i++) {
                var image = renderer.renderImageWithDPI(i, RENDER_DPI, ImageType.RGB);
                try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                    if (!ImageIO.write(image, "png", out)) {
                        return List.of();
                    }
                    pages.add(out.toByteArray());
                }
            }
            return pages;
        } catch (IOException | RuntimeException e) {
            return List.of();
        }
    }
}
