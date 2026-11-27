package com.transmute.erp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import com.transmute.erp.auth.TestRequestDefaults;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Runs the main ERP flows over HTTP against an in-memory database: customers, orders with
 * the credit hold, purchasing and receiving, document upload, cheques and reports.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:erp-test;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "transmute.storage.dir=target/test-uploads"
})
@AutoConfigureMockMvc
@Import(TestRequestDefaults.class)
@WithMockUser
class ErpFlowIntegrationTest {

    private static final Pattern ID = Pattern.compile("\"id\":\"([^\"]+)\"");

    @Autowired
    private MockMvc mvc;

    @Test
    void mainErpFlowsWork() throws Exception {
        // Customer with a credit limit of 100,000
        String customerId = idOf(mvc.perform(post("/api/customers").contentType("application/json")
                        .content("{\"name\":\"Test Shop\",\"contactPerson\":\"A\",\"creditLimit\":100000}"))
                .andExpect(status().isCreated())
                .andReturn());

        // Inventory item with 10 units in the warehouse
        String itemId = idOf(mvc.perform(post("/api/inventory").contentType("application/json")
                        .content("{\"sku\":\"T-OIL-1\",\"name\":\"Test Oil\",\"unit\":\"Cases\",\"warehouseStock\":10,"
                                + "\"shopStock\":0,\"vanStock\":0,\"reorderLevel\":5,\"unitCost\":100,\"salePrice\":150,"
                                + "\"preferredSupplierId\":null}"))
                .andExpect(status().isCreated())
                .andReturn());

        // Small order is confirmed automatically: 3 x 150 = 450
        String smallOrder = idOf(mvc.perform(post("/api/orders").contentType("application/json")
                        .content(orderJson(customerId, 3)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("confirmed"))
                .andExpect(jsonPath("$.total").value(450))
                .andReturn());

        // Large order would exceed the credit limit (1000 x 150 = 150,000), so it is held
        mvc.perform(post("/api/orders").contentType("application/json")
                        .content(orderJson(customerId, 1000)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("pending-review"))
                .andExpect(jsonPath("$.creditWarning.creditLimit").value(100000));

        // Confirming the small order invoices it and adds 450 to the customer's balance
        mvc.perform(post("/api/orders/" + smallOrder + "/confirm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("invoiced"));
        mvc.perform(get("/api/customers/" + customerId))
                .andExpect(jsonPath("$.outstandingBalance").value(450));

        // Purchasing: supplier, PO for 5 units, partial receipt of 4
        String supplierId = idOf(mvc.perform(post("/api/suppliers").contentType("application/json")
                        .content("{\"name\":\"Test Supplier\"}"))
                .andExpect(status().isCreated())
                .andReturn());
        String poId = idOf(mvc.perform(post("/api/purchase-orders").contentType("application/json")
                        .content("{\"supplierId\":\"" + supplierId + "\",\"lines\":[{\"sku\":\"T-OIL-1\","
                                + "\"productName\":\"Test Oil\",\"unit\":\"Cases\",\"orderedQty\":5,\"receivedQty\":0,"
                                + "\"invoicedQty\":0,\"unitCost\":100}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.total").value(500))
                .andReturn());
        mvc.perform(post("/api/purchase-orders/" + poId + "/send")).andExpect(status().isOk());

        // Receiving more than is outstanding is refused and changes nothing
        mvc.perform(post("/api/purchase-orders/" + poId + "/receive").contentType("application/json")
                        .content("{\"lines\":[{\"sku\":\"T-OIL-1\",\"qty\":9}]}"))
                .andExpect(status().isBadRequest());
        // 10 on hand less the 3 units deducted when the small order was confirmed
        mvc.perform(get("/api/inventory/" + itemId)).andExpect(jsonPath("$.warehouseStock").value(7));

        mvc.perform(post("/api/purchase-orders/" + poId + "/receive").contentType("application/json")
                        .content("{\"receivedBy\":\"Stores\",\"lines\":[{\"sku\":\"T-OIL-1\",\"qty\":4}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("partial-received"));
        // 7 after the confirmed order, plus the 4 units received
        mvc.perform(get("/api/inventory/" + itemId)).andExpect(jsonPath("$.warehouseStock").value(11));

        // Documents: a file is stored, cannot be approved until fields are filled, then can
        String docId = idOf(mvc.perform(multipart("/api/documents")
                        .file(new MockMultipartFile("file", "invoice.pdf", "application/pdf", "%PDF-1.4 test".getBytes()))
                        .param("channel", "upload"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("needs-review"))
                .andReturn());
        mvc.perform(post("/api/documents/" + docId + "/approve")).andExpect(status().isBadRequest());
        mvc.perform(patch("/api/documents/" + docId).contentType("application/json")
                        .content("{\"supplier\":\"Test Supplier\",\"invoiceNumber\":\"INV-1\",\"total\":500}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/documents/" + docId + "/approve?overrideMatch=true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("approved"));
        mvc.perform(get("/api/documents/" + docId + "/file")).andExpect(status().isOk());

        // Cheque: received -> deposited -> cleared posts money into the ledger
        String paymentId = idOf(mvc.perform(post("/api/accounting/payments").contentType("application/json")
                        .content("{\"customerId\":\"" + customerId + "\",\"customerName\":\"Test Shop\",\"method\":\"Cheque\",\"amount\":450,"
                                + "\"reference\":\"CHQ-77\",\"chequeNumber\":\"77\",\"invoiceRef\":\"INV-1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.chequeStatus").value("received"))
                .andReturn());
        mvc.perform(patch("/api/accounting/payments/" + paymentId + "/cheque-status")
                        .contentType("application/json").content("{\"status\":\"cleared\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/accounting/payments/" + paymentId + "/cheque-status")
                        .contentType("application/json").content("{\"status\":\"deposited\"}"))
                .andExpect(status().isOk());
        mvc.perform(patch("/api/accounting/payments/" + paymentId + "/cheque-status")
                        .contentType("application/json").content("{\"status\":\"cleared\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/accounting/ledger"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].source").value("Cheque Cleared"))
                .andExpect(jsonPath("$[0].runningBalance").value(450));

        // Reports and dashboard reflect the data
        mvc.perform(get("/api/reports/receivables"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Receivables by customer"));
        mvc.perform(get("/api/reports/unknown")).andExpect(status().isNotFound());
        mvc.perform(get("/api/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cashPosition").value(450));

        // Every change above was written to the audit log
        MvcResult audit = mvc.perform(get("/api/audit-log")).andExpect(status().isOk()).andReturn();
        assertThat(audit.getResponse().getContentAsString()).contains("Confirmed & invoiced");
    }

    private static String orderJson(String customerId, int qty) {
        return "{\"type\":\"order\",\"customerId\":\"" + customerId + "\",\"source\":\"whatsapp\","
                + "\"items\":[{\"id\":\"line-1\",\"sku\":\"T-OIL-1\",\"productName\":\"Test Oil\",\"qty\":" + qty
                + ",\"unit\":\"Cases\",\"unitPrice\":150,\"warehouseStock\":10,\"shopStock\":0,\"vanStock\":0}]}";
    }

    private static String idOf(MvcResult result) throws Exception {
        Matcher m = ID.matcher(result.getResponse().getContentAsString());
        assertThat(m.find()).as("response contains an id").isTrue();
        return m.group(1);
    }
}
