package com.transmute.erp.documents;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;

class PdfPagesTest {

    private static final String LINE = "Supplier Invoice INV-1042 Total 5000";

    private static byte[] pdfWithText(String text) throws IOException {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(doc, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                content.newLineAtOffset(72, 700);
                content.showText(text);
                content.endText();
            }
            doc.save(out);
            return out.toByteArray();
        }
    }

    @Test
    void extractTextReturnsTheTextLayer() throws IOException {
        byte[] pdf = pdfWithText(LINE);

        assertThat(PdfPages.extractText(pdf)).contains("INV-1042");
    }

    @Test
    void renderPagesRendersOnlyExistingPagesAsPng() throws IOException {
        byte[] pdf = pdfWithText(LINE);

        var pages = PdfPages.renderPages(pdf, 2);

        assertThat(pages).hasSize(1);
        assertThat(pages.get(0)).startsWith((byte) 0x89, (byte) 'P', (byte) 'N', (byte) 'G');
    }

    @Test
    void renderPagesOnGarbageReturnsEmpty() {
        byte[] garbage = "this is not a pdf".getBytes(StandardCharsets.US_ASCII);

        assertThat(PdfPages.renderPages(garbage, 2)).isEmpty();
    }

    @Test
    void extractTextOnGarbageReturnsEmpty() {
        byte[] garbage = "this is not a pdf".getBytes(StandardCharsets.US_ASCII);

        assertThat(PdfPages.extractText(garbage)).isEmpty();
    }
}
