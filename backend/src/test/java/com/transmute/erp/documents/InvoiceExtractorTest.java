package com.transmute.erp.documents;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class InvoiceExtractorTest {

    @Test
    void stripsCodeFenceAroundTheJson() {
        String reply = "Here you go:\n```json\n{\"supplier\":\"Acme\",\"total\":1500}\n```";
        assertThat(InvoiceExtractor.jsonPart(reply)).isEqualTo("{\"supplier\":\"Acme\",\"total\":1500}");
    }

    @Test
    void leavesPlainTextAloneWhenThereIsNoObject() {
        assertThat(InvoiceExtractor.jsonPart("no fields found")).isEqualTo("no fields found");
    }

    @Test
    void onlyImageTypesAreSentToTheVisionModel() {
        assertThat(InvoiceExtractor.IMAGE_TYPES).contains("image/jpeg", "image/png");
        assertThat(InvoiceExtractor.IMAGE_TYPES).doesNotContain("application/pdf");
    }
}
