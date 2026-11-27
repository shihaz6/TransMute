package com.transmute.erp.documents;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.transmute.erp.auth.TestRequestDefaults;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Checks that supplier invoices cannot be approved past a failed three-way match unless the
 * approver overrides it, and that the override is written to the audit log. Every test uploads
 * its own document with a unique name, so tests do not depend on each other's data.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:document-approval-test;DB_CLOSE_DELAY=-1",
        "transmute.haiku.groq-api-key=",
        "transmute.storage.dir=target/approval-uploads",
        "management.health.mail.enabled=false"
})
@AutoConfigureMockMvc
@Import(TestRequestDefaults.class)
@WithMockUser
class DocumentApprovalTest {

    private static final MediaType JSON = MediaType.APPLICATION_JSON;

    @Autowired
    private MockMvc mvc;

    @Test
    void uploadedDocumentWithoutMatchCannotBeApprovedWithoutOverride() throws Exception {
        String doc = uploadDocument(unique("no-match"));
        fillFields(doc, unique("INV"));
        mvc.perform(post("/api/documents/" + doc + "/approve"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Three-way match is ")));
    }

    @Test
    void overrideApprovesDocumentWithoutMatch() throws Exception {
        String doc = uploadDocument(unique("override"));
        fillFields(doc, unique("INV"));
        mvc.perform(post("/api/documents/" + doc + "/approve?overrideMatch=true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("approved"));
    }

    @Test
    void overrideLeavesAnAuditEntry() throws Exception {
        String doc = uploadDocument(unique("audit"));
        fillFields(doc, unique("INV"));
        mvc.perform(post("/api/documents/" + doc + "/approve?overrideMatch=true"))
                .andExpect(status().isOk());
        MvcResult audit = mvc.perform(get("/api/audit-log?module=Documents"))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(audit.getResponse().getContentAsString()).contains("despite match status");
    }

    @Test
    void incompleteDocumentStillRefused() throws Exception {
        String doc = uploadDocument(unique("incomplete"));
        mvc.perform(post("/api/documents/" + doc + "/approve?overrideMatch=true"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Enter the supplier, invoice number and total before approving"));
    }

    @Test
    void rejectedDocumentCannotBeApproved() throws Exception {
        String doc = uploadDocument(unique("rejected"));
        fillFields(doc, unique("INV"));
        mvc.perform(post("/api/documents/" + doc + "/reject"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("rejected"));
        mvc.perform(post("/api/documents/" + doc + "/approve?overrideMatch=true"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Only documents waiting for review can be approved"));
    }

    // ---------- helpers ----------

    private String uploadDocument(String name) throws Exception {
        return idOf(mvc.perform(multipart("/api/documents")
                        .file(new MockMultipartFile("file", name + ".pdf", "application/pdf", "%PDF-1.4 test".getBytes()))
                        .param("channel", "upload"))
                .andExpect(status().isCreated())
                .andReturn());
    }

    /** Fills supplier, invoice number and a non-zero total so only the match rule can block approval. */
    private void fillFields(String doc, String invoiceNumber) throws Exception {
        mvc.perform(patch("/api/documents/" + doc).contentType(JSON)
                        .content("{\"supplier\":\"Acme\",\"invoiceNumber\":\"" + invoiceNumber + "\",\"total\":900}"))
                .andExpect(status().isOk());
    }

    /** The id of a single record. */
    private static String idOf(MvcResult result) throws Exception {
        String body = result.getResponse().getContentAsString();
        Object id = com.jayway.jsonpath.JsonPath.read(body, "$.id");
        assertThat(id).as("response contains an id").isNotNull();
        return id.toString();
    }

    private static String unique(String prefix) {
        return prefix + "-" + System.nanoTime();
    }
}
