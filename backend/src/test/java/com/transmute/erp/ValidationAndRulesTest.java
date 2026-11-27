package com.transmute.erp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Checks the validation rules and business logic of each module over HTTP. Every test
 * creates its own records with unique names, so tests do not depend on each other's data.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:validation-test;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "transmute.storage.dir=target/validation-uploads",
        "transmute.haiku.groq-api-key=",
        "spring.mail.host=localhost",
        "transmute.mail.from=erp@example.test",
        "management.health.mail.enabled=false"
})
@AutoConfigureMockMvc
class ValidationAndRulesTest {

    /** Reminder emails are captured here instead of being sent. */
    @MockitoBean
    private JavaMailSender mailSender;

    private static final MediaType JSON = MediaType.APPLICATION_JSON;
    private static final String SHARED_SKU = "SHARED-SKU";

    @Autowired
    private MockMvc mvc;

    /** Order helpers refer to this SKU, so it must exist before each test. Repeats are ignored. */
    @BeforeEach
    void ensureSharedSku() throws Exception {
        mvc.perform(post("/api/inventory").contentType(JSON).content(itemJson(SHARED_SKU, 50, 0)));
    }

    // ---------- Customers ----------

    @Test
    void customerNameIsRequired() throws Exception {
        mvc.perform(post("/api/customers").contentType(JSON).content("{\"name\":\"  \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.name").exists());
    }

    @Test
    void customerCreditLimitCannotBeNegative() throws Exception {
        mvc.perform(post("/api/customers").contentType(JSON)
                        .content("{\"name\":\"Neg Limit\",\"creditLimit\":-1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.creditLimit").exists());
    }

    @Test
    void unknownCustomerIsNotFound() throws Exception {
        mvc.perform(get("/api/customers/NO-SUCH-CUSTOMER"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void updateCustomerChangesFields() throws Exception {
        String id = createCustomer("Before Update", "0");
        mvc.perform(put("/api/customers/" + id).contentType(JSON)
                        .content("{\"name\":\"After Update\",\"city\":\"Kandy\",\"creditLimit\":5000}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("After Update"))
                .andExpect(jsonPath("$.city").value("Kandy"));
    }

    // ---------- Inventory ----------

    @Test
    void inventorySkuMustBeUnique() throws Exception {
        String sku = unique("DUP");
        createItem(sku, 1, 1);
        mvc.perform(post("/api/inventory").contentType(JSON)
                        .content(itemJson(sku, 1, 1)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("SKU already exists: " + sku));
    }

    @Test
    void inventorySkuIsRequired() throws Exception {
        mvc.perform(post("/api/inventory").contentType(JSON)
                        .content("{\"name\":\"No SKU\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.sku").exists());
    }

    @Test
    void stockAdjustmentMovesStockToTheChosenLocation() throws Exception {
        String id = createItem(unique("ADJ"), 5, 5);
        mvc.perform(post("/api/inventory/" + id + "/stock").contentType(JSON)
                        .content("{\"location\":\"shop\",\"delta\":3,\"reason\":\"Counted\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shopStock").value(3))
                .andExpect(jsonPath("$.warehouseStock").value(5));
    }

    @Test
    void stockCannotGoBelowZero() throws Exception {
        String id = createItem(unique("NEG"), 2, 0);
        mvc.perform(post("/api/inventory/" + id + "/stock").contentType(JSON)
                        .content("{\"location\":\"warehouse\",\"delta\":-3}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Stock cannot go below zero at warehouse"));
    }

    @Test
    void stockAdjustmentNeedsAKnownLocation() throws Exception {
        String id = createItem(unique("LOC"), 2, 0);
        mvc.perform(post("/api/inventory/" + id + "/stock").contentType(JSON)
                        .content("{\"location\":\"garage\",\"delta\":1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Unknown location: garage"));
    }

    // ---------- Sales orders ----------

    @Test
    void orderNeedsAtLeastOneLine() throws Exception {
        String customer = createCustomer("No Lines Shop", "0");
        mvc.perform(post("/api/orders").contentType(JSON)
                        .content("{\"type\":\"order\",\"customerId\":\"" + customer + "\",\"items\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("An order needs at least one line item"));
    }

    @Test
    void orderTypeMustBeOrderOrQuote() throws Exception {
        String customer = createCustomer("Bad Type Shop", "0");
        mvc.perform(post("/api/orders").contentType(JSON)
                        .content(orderJson(customer, "invoice", 1, 100)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("type must be 'order' or 'quote'"));
    }

    @Test
    void orderForUnknownCustomerIsNotFound() throws Exception {
        mvc.perform(post("/api/orders").contentType(JSON)
                        .content(orderJson("NO-SUCH-CUSTOMER", "order", 1, 100)))
                .andExpect(status().isNotFound());
    }

    @Test
    void orderTotalIsCalculatedOnTheServer() throws Exception {
        String customer = createCustomer("Total Shop", "0");
        // The client-sent "total" is not part of the request, so it is ignored.
        String body = orderJson(customer, "order", 2, 150).replaceFirst("\\{", "{\"total\":1,");
        mvc.perform(post("/api/orders").contentType(JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.total").value(300));
    }

    @Test
    void zeroCreditLimitMeansNoCreditCheck() throws Exception {
        String customer = createCustomer("No Limit Shop", "0");
        mvc.perform(post("/api/orders").contentType(JSON)
                        .content(orderJson(customer, "order", 1000, 150)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("confirmed"));
    }

    @Test
    void orderLinesTakeStockAndDefaultPriceFromInventory() throws Exception {
        String customer = createCustomer("Stock Lookup Shop", "0");
        String sku = unique("LK");
        createItem(sku, 7, 0); // salePrice 150, warehouse 7
        mvc.perform(post("/api/orders").contentType(JSON)
                        .content("{\"type\":\"order\",\"customerId\":\"" + customer + "\",\"items\":[{\"sku\":\""
                                + sku + "\",\"qty\":2}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.total").value(300))
                .andExpect(jsonPath("$.items[0].unitPrice").value(150))
                .andExpect(jsonPath("$.items[0].warehouseStock").value(7))
                .andExpect(jsonPath("$.items[0].productName").value("Item " + sku));
    }

    @Test
    void orderLineWithUnknownSkuIsRejected() throws Exception {
        String customer = createCustomer("Unknown SKU Shop", "0");
        mvc.perform(post("/api/orders").contentType(JSON)
                        .content("{\"type\":\"order\",\"customerId\":\"" + customer + "\",\"items\":[{\"sku\":\"NOPE-1\",\"qty\":1}]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Unknown SKU: NOPE-1"));
    }

    @Test
    void orderLineQuantityMustBePositive() throws Exception {
        String customer = createCustomer("Zero Qty Shop", "0");
        String sku = unique("ZQ");
        createItem(sku, 1, 0);
        mvc.perform(post("/api/orders").contentType(JSON)
                        .content("{\"type\":\"order\",\"customerId\":\"" + customer + "\",\"items\":[{\"sku\":\""
                                + sku + "\",\"qty\":0}]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void quoteCanHoldFreeTextLines() throws Exception {
        String customer = createCustomer("Free Text Quote Shop", "0");
        mvc.perform(post("/api/orders").contentType(JSON)
                        .content("{\"type\":\"quote\",\"customerId\":\"" + customer + "\",\"items\":[{\"productName\":\"Mystery item\",\"qty\":3,\"unitPrice\":10}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("quote"))
                .andExpect(jsonPath("$.total").value(30));
    }

    @Test
    void quoteLinesCanBeReplaced() throws Exception {
        String customer = createCustomer("Edit Quote Shop", "0");
        String sku = unique("EQ");
        createItem(sku, 4, 0);
        String quote = idOf(mvc.perform(post("/api/orders").contentType(JSON)
                        .content("{\"type\":\"quote\",\"customerId\":\"" + customer + "\"}"))
                .andExpect(status().isCreated())
                .andReturn());
        mvc.perform(put("/api/orders/" + quote + "/items").contentType(JSON)
                        .content("[{\"sku\":\"" + sku + "\",\"qty\":5}]"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(750))
                .andExpect(jsonPath("$.items.length()").value(1));
    }

    @Test
    void onlyQuotesHaveTheirLinesReplaced() throws Exception {
        String customer = createCustomer("Order Lines Shop", "0");
        String sku = unique("OL");
        createItem(sku, 4, 0);
        String order = idOf(mvc.perform(post("/api/orders").contentType(JSON)
                        .content("{\"type\":\"order\",\"customerId\":\"" + customer + "\",\"items\":[{\"sku\":\""
                                + sku + "\",\"qty\":1}]}"))
                .andReturn());
        mvc.perform(put("/api/orders/" + order + "/items").contentType(JSON).content("[]"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Only quotes can be edited line by line"));
    }

    @Test
    void quoteConvertsToOrderOnceAndOnlyWithItems() throws Exception {
        String customer = createCustomer("Convert Shop", "0");
        String empty = idOf(mvc.perform(post("/api/orders").contentType(JSON)
                        .content("{\"type\":\"quote\",\"customerId\":\"" + customer + "\"}"))
                .andReturn());
        mvc.perform(post("/api/orders/" + empty + "/convert"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Add line items to the quote before converting it"));

        String sku = unique("CV");
        createItem(sku, 2, 0);
        mvc.perform(put("/api/orders/" + empty + "/items").contentType(JSON)
                        .content("[{\"sku\":\"" + sku + "\",\"qty\":1}]"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/orders/" + empty + "/convert"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("order"))
                .andExpect(jsonPath("$.status").value("confirmed"));
        mvc.perform(post("/api/orders/" + empty + "/convert"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Only quotes can be converted to orders"));
    }

    @Test
    void aiSettingNeedsATaskAndAValidMode() throws Exception {
        mvc.perform(post("/api/settings/ai").contentType(JSON)
                        .content("{\"task\":\"\",\"mode\":\"auto-post\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.task").exists());
        mvc.perform(post("/api/settings/ai").contentType(JSON)
                        .content("{\"task\":\"Post invoices\",\"mode\":\"sometimes\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/settings/ai").contentType(JSON)
                        .content("{\"task\":\"Post invoices\",\"description\":\"Auto-post matched bills\",\"mode\":\"auto-post\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mode").value("auto-post"));
    }

    @Test
    void quoteCannotBeInvoiced() throws Exception {
        String customer = createCustomer("Quote Shop", "0");
        String quote = idOf(mvc.perform(post("/api/orders").contentType(JSON)
                        .content(orderJson(customer, "quote", 1, 100)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("quote"))
                .andReturn());
        mvc.perform(post("/api/orders/" + quote + "/confirm"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Convert the quote to an order before invoicing it"));
    }

    @Test
    void orderCannotBeInvoicedTwice() throws Exception {
        String customer = createCustomer("Twice Shop", "0");
        String order = idOf(mvc.perform(post("/api/orders").contentType(JSON)
                        .content(orderJson(customer, "order", 1, 100)))
                .andReturn());
        mvc.perform(post("/api/orders/" + order + "/confirm")).andExpect(status().isOk());
        mvc.perform(post("/api/orders/" + order + "/confirm"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Order " + order + " is already invoiced"));
    }

    @Test
    void creditHeldOrderCanBeConfirmedByTheOwner() throws Exception {
        String customer = createCustomer("Held Shop", "100");
        String order = idOf(mvc.perform(post("/api/orders").contentType(JSON)
                        .content(orderJson(customer, "order", 10, 150)))
                .andExpect(jsonPath("$.status").value("pending-review"))
                .andReturn());
        mvc.perform(post("/api/orders/" + order + "/confirm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("invoiced"));
    }

    @Test
    void confirmingAnOrderAddsItsTotalToTheCustomerBalance() throws Exception {
        String customer = createCustomer("Balance Shop", "0");
        String order = idOf(mvc.perform(post("/api/orders").contentType(JSON)
                        .content(orderJson(customer, "order", 4, 250)))
                .andReturn());
        mvc.perform(post("/api/orders/" + order + "/confirm")).andExpect(status().isOk());
        mvc.perform(get("/api/customers/" + customer))
                .andExpect(jsonPath("$.outstandingBalance").value(1000));
    }

    // ---------- Purchasing ----------

    @Test
    void purchaseOrderNeedsLines() throws Exception {
        String supplier = createSupplier("Empty PO Supplier");
        mvc.perform(post("/api/purchase-orders").contentType(JSON)
                        .content("{\"supplierId\":\"" + supplier + "\",\"lines\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("A purchase order needs at least one line"));
    }

    @Test
    void purchaseOrderNeedsAKnownSupplier() throws Exception {
        mvc.perform(post("/api/purchase-orders").contentType(JSON)
                        .content(poJson("NO-SUCH-SUPPLIER", unique("SKU"), 5)))
                .andExpect(status().isNotFound());
    }

    @Test
    void sendOnlyWorksOnDraftOrders() throws Exception {
        String po = createPo(unique("SEND"));
        mvc.perform(post("/api/purchase-orders/" + po + "/send")).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("sent"));
        mvc.perform(post("/api/purchase-orders/" + po + "/send"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Only draft purchase orders can be sent"));
    }

    @Test
    void cannotReceiveAgainstADraftOrder() throws Exception {
        String po = createPo(unique("DRAFT"));
        mvc.perform(post("/api/purchase-orders/" + po + "/receive").contentType(JSON)
                        .content("{\"lines\":[{\"sku\":\"X\",\"qty\":1}]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Purchase order " + po + " is not open for receiving"));
    }

    @Test
    void receivingRejectsSkuNotOnTheOrder() throws Exception {
        String sku = unique("ONPO");
        createItem(sku, 0, 0);
        String po = createPoFor(sku, 5);
        mvc.perform(post("/api/purchase-orders/" + po + "/send")).andExpect(status().isOk());
        mvc.perform(post("/api/purchase-orders/" + po + "/receive").contentType(JSON)
                        .content("{\"lines\":[{\"sku\":\"NOT-ON-PO\",\"qty\":1}]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("SKU NOT-ON-PO is not on " + po));
    }

    @Test
    void receivingRejectsZeroQuantity() throws Exception {
        String sku = unique("ZERO");
        createItem(sku, 0, 0);
        String po = createPoFor(sku, 5);
        mvc.perform(post("/api/purchase-orders/" + po + "/send")).andExpect(status().isOk());
        mvc.perform(post("/api/purchase-orders/" + po + "/receive").contentType(JSON)
                        .content("{\"lines\":[{\"sku\":\"" + sku + "\",\"qty\":0}]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void fullReceiptCompletesTheOrderAndAddsStock() throws Exception {
        String sku = unique("FULL");
        String item = createItem(sku, 1, 0);
        String po = createPoFor(sku, 5);
        mvc.perform(post("/api/purchase-orders/" + po + "/send")).andExpect(status().isOk());
        mvc.perform(post("/api/purchase-orders/" + po + "/receive").contentType(JSON)
                        .content("{\"receivedBy\":\"Stores\",\"lines\":[{\"sku\":\"" + sku + "\",\"qty\":5}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("received"))
                .andExpect(jsonPath("$.grnId").exists());
        mvc.perform(get("/api/inventory/" + item)).andExpect(jsonPath("$.warehouseStock").value(6));
    }

    @Test
    void draftFromInventoryNeedsAPreferredSupplier() throws Exception {
        String item = createItem(unique("NOSUP"), 0, 0);
        mvc.perform(post("/api/purchase-orders/from-inventory/" + item))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void draftFromInventoryOrdersAtLeastFiftyUnits() throws Exception {
        String supplier = createSupplier("Reorder Supplier");
        String sku = unique("RO");
        String item = idOf(mvc.perform(post("/api/inventory").contentType(JSON)
                        .content("{\"sku\":\"" + sku + "\",\"name\":\"Reorder Item\",\"unit\":\"Bags\","
                                + "\"reorderLevel\":5,\"unitCost\":200,\"preferredSupplierId\":\"" + supplier
                                + "\",\"preferredSupplierName\":\"Reorder Supplier\"}"))
                .andExpect(status().isCreated())
                .andReturn());
        mvc.perform(post("/api/purchase-orders/from-inventory/" + item))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("draft"))
                .andExpect(jsonPath("$.createdByAi").value(true))
                .andExpect(jsonPath("$.lines[0].orderedQty").value(50))
                .andExpect(jsonPath("$.total").value(10000));
    }

    // ---------- Documents ----------

    @Test
    void uploadRejectsAnEmptyFile() throws Exception {
        mvc.perform(multipart("/api/documents")
                        .file(new MockMultipartFile("file", "empty.pdf", "application/pdf", new byte[0])))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Choose a file to upload"));
    }

    @Test
    void uploadRejectsAnUnknownChannel() throws Exception {
        mvc.perform(multipart("/api/documents")
                        .file(new MockMultipartFile("file", "x.pdf", "application/pdf", "data".getBytes()))
                        .param("channel", "carrier-pigeon"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("channel must be upload, email or whatsapp"));
    }

    @Test
    void documentCannotBeApprovedUntilFieldsAreFilled() throws Exception {
        String doc = uploadDocument("needs-fields.pdf");
        mvc.perform(post("/api/documents/" + doc + "/approve"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Enter the supplier, invoice number and total before approving"));
        mvc.perform(patch("/api/documents/" + doc).contentType(JSON)
                        .content("{\"supplier\":\"Acme\",\"invoiceNumber\":\"A-1\",\"total\":0}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/documents/" + doc + "/approve")).andExpect(status().isBadRequest());
    }

    @Test
    void completeDocumentCanBeApproved() throws Exception {
        String doc = uploadDocument("complete.pdf");
        mvc.perform(patch("/api/documents/" + doc).contentType(JSON)
                        .content("{\"supplier\":\"Acme\",\"invoiceNumber\":\"B-2\",\"total\":900}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/documents/" + doc + "/approve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("approved"))
                .andExpect(jsonPath("$.overallConfidence").value(100));
    }

    @Test
    void rejectMarksDocumentRejected() throws Exception {
        String doc = uploadDocument("reject.pdf");
        mvc.perform(post("/api/documents/" + doc + "/reject"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("rejected"));
    }

    @Test
    void storedFileIsServedWithItsContentType() throws Exception {
        String doc = uploadDocument("served.pdf");
        mvc.perform(get("/api/documents/" + doc + "/file"))
                .andExpect(status().isOk())
                .andExpect(result -> assertThat(result.getResponse().getContentType()).startsWith("application/pdf"));
    }

    @Test
    void storagePathIsNotExposedInTheApi() throws Exception {
        String doc = uploadDocument("private-path.pdf");
        mvc.perform(get("/api/documents/" + doc))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.storedPath").doesNotExist());
    }

    // ---------- Collections ----------

    @Test
    void collectionSyncAddsAnOverdueCustomerOnlyOnce() throws Exception {
        String customer = createOverdueCustomer("Chase Me Stores", 40, 1000);
        mvc.perform(post("/api/collections/sync")).andExpect(status().isOk());
        mvc.perform(post("/api/collections/sync")).andExpect(status().isOk());

        String body = mvc.perform(get("/api/collections")).andReturn().getResponse().getContentAsString();
        assertThat(countOccurrences(body, "\"customerId\":\"" + customer + "\"")).isEqualTo(1);
    }

    @Test
    void collectionToneMustBeValid() throws Exception {
        String item = collectionItemFor(createOverdueCustomer("Tone Stores", 10, 500));
        mvc.perform(patch("/api/collections/" + item + "/tone").contentType(JSON)
                        .content("{\"tone\":\"angry\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("tone must be friendly, firm or final"));
    }

    @Test
    void changingToneRegeneratesTheDraft() throws Exception {
        String item = collectionItemFor(createOverdueCustomer("Draft Stores", 70, 800));
        mvc.perform(patch("/api/collections/" + item + "/tone").contentType(JSON)
                        .content("{\"tone\":\"final\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tone").value("final"))
                .andExpect(jsonPath("$.draftMessage").value(org.hamcrest.Matchers.containsString("Final reminder")));
    }

    @Test
    void draftMessageCannotBeEmpty() throws Exception {
        String item = collectionItemFor(createOverdueCustomer("Blank Draft Stores", 10, 300));
        mvc.perform(patch("/api/collections/" + item + "/draft").contentType(JSON)
                        .content("{\"message\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("The reminder message cannot be empty"));
    }

    @Test
    void reminderCanOnlyBeSentOnce() throws Exception {
        String item = collectionItemFor(createOverdueCustomer("Send Once Stores", 10, 300));
        mvc.perform(post("/api/collections/" + item + "/send"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("sent"));
        mvc.perform(post("/api/collections/" + item + "/send"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("This reminder has already been sent"));
    }

    @Test
    void promiseNeedsADate() throws Exception {
        String item = collectionItemFor(createOverdueCustomer("No Date Stores", 10, 300));
        mvc.perform(post("/api/collections/" + item + "/promise").contentType(JSON)
                        .content("{\"amount\":100}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("A promise needs a date"));
    }

    @Test
    void promiseDefaultsToHalfTheOverdueAmount() throws Exception {
        String item = collectionItemFor(createOverdueCustomer("Half Promise Stores", 10, 600));
        mvc.perform(post("/api/collections/" + item + "/promise").contentType(JSON)
                        .content("{\"date\":\"2026-12-20\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("promised"))
                .andExpect(jsonPath("$.promisedAmount").value(300));
    }

    // ---------- Accounting ----------

    @Test
    void paymentMethodMustBeKnown() throws Exception {
        mvc.perform(post("/api/accounting/payments").contentType(JSON)
                        .content("{\"customerName\":\"X\",\"method\":\"Crypto\",\"amount\":10}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("method must be Cash, Bank Transfer or Cheque"));
    }

    @Test
    void paymentAmountMustBePositive() throws Exception {
        mvc.perform(post("/api/accounting/payments").contentType(JSON)
                        .content("{\"customerName\":\"X\",\"method\":\"Cash\",\"amount\":0}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Payment amount must be greater than zero"));
    }

    @Test
    void chequePaymentNeedsAChequeNumber() throws Exception {
        mvc.perform(post("/api/accounting/payments").contentType(JSON)
                        .content("{\"customerName\":\"X\",\"method\":\"Cheque\",\"amount\":10}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("A cheque payment needs a cheque number"));
    }

    @Test
    void cashPaymentPostsToTheLedgerWithARunningBalance() throws Exception {
        BigDecimal before = latestLedgerBalance();
        mvc.perform(post("/api/accounting/payments").contentType(JSON)
                        .content("{\"customerName\":\"Cash Buyer\",\"method\":\"Cash\",\"amount\":125.50,"
                                + "\"reference\":\"R-1\"}"))
                .andExpect(status().isCreated());
        assertThat(latestLedgerBalance()).isEqualByComparingTo(before.add(new BigDecimal("125.50")));
    }

    @Test
    void nonChequePaymentsHaveNoChequeStatusToChange() throws Exception {
        String payment = idOf(mvc.perform(post("/api/accounting/payments").contentType(JSON)
                        .content("{\"customerName\":\"Cash Two\",\"method\":\"Cash\",\"amount\":10}"))
                .andReturn());
        mvc.perform(patch("/api/accounting/payments/" + payment + "/cheque-status").contentType(JSON)
                        .content("{\"status\":\"deposited\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Only cheque payments have a cheque status"));
    }

    @Test
    void chequeCannotBeClearedWithoutBeingDeposited() throws Exception {
        String payment = chequePayment("CHQ-SKIP");
        mvc.perform(patch("/api/accounting/payments/" + payment + "/cheque-status").contentType(JSON)
                        .content("{\"status\":\"cleared\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Cannot move cheque from received to cleared"));
    }

    @Test
    void bouncedChequePostsNothingToTheLedger() throws Exception {
        String payment = chequePayment("CHQ-BOUNCE");
        mvc.perform(patch("/api/accounting/payments/" + payment + "/cheque-status").contentType(JSON)
                        .content("{\"status\":\"deposited\"}")).andExpect(status().isOk());
        BigDecimal before = latestLedgerBalance();
        mvc.perform(patch("/api/accounting/payments/" + payment + "/cheque-status").contentType(JSON)
                        .content("{\"status\":\"bounced\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chequeStatus").value("bounced"));
        assertThat(latestLedgerBalance()).isEqualByComparingTo(before);
    }

    @Test
    void bankLinesNeedAtLeastOneLine() throws Exception {
        mvc.perform(post("/api/accounting/bank-lines").contentType(JSON).content("[]"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Send at least one statement line"));
    }

    @Test
    void bankLineTypeMustBeCreditOrDebit() throws Exception {
        mvc.perform(post("/api/accounting/bank-lines").contentType(JSON)
                        .content("[{\"statementDate\":\"2026-11-01\",\"bankDescription\":\"X\","
                                + "\"type\":\"transfer\",\"amount\":10}]"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Statement line type must be credit or debit"));
    }

    @Test
    void acceptingABankCreditPostsItToTheLedgerOnlyOnce() throws Exception {
        String line = idOf(mvc.perform(post("/api/accounting/bank-lines").contentType(JSON)
                        .content("[{\"statementDate\":\"2026-11-02\",\"bankDescription\":\"CEFTS CREDIT\","
                                + "\"type\":\"credit\",\"amount\":700}]"))
                .andExpect(status().isCreated())
                .andReturn());
        BigDecimal before = latestLedgerBalance();
        mvc.perform(post("/api/accounting/bank-lines/" + line + "/accept"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("matched"));
        assertThat(latestLedgerBalance()).isEqualByComparingTo(before.add(new BigDecimal("700")));
        mvc.perform(post("/api/accounting/bank-lines/" + line + "/accept"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("This statement line is already reconciled"));
    }

    // ---------- Alerts ----------

    @Test
    void raisedAlertStartsOpen() throws Exception {
        mvc.perform(post("/api/alerts").contentType(JSON)
                        .content("{\"title\":\"Duplicate bill\",\"category\":\"Duplicate Invoice\","
                                + "\"severity\":\"warning\",\"evidence\":[{\"label\":\"Invoice\",\"value\":\"A-9\"}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("open"))
                .andExpect(jsonPath("$.evidence[0].label").value("Invoice"));
    }

    @Test
    void alertStatusMustBeKnown() throws Exception {
        String alert = raiseAlert("Status check");
        mvc.perform(patch("/api/alerts/" + alert + "/status").contentType(JSON)
                        .content("{\"status\":\"deleted\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("status must be open, resolved or dismissed"));
    }

    @Test
    void unknownAlertIsNotFound() throws Exception {
        mvc.perform(patch("/api/alerts/NO-SUCH-ALERT/status").contentType(JSON)
                        .content("{\"status\":\"resolved\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void resolvingAnAlertIsRecordedAndFilterable() throws Exception {
        String alert = raiseAlert("Resolve me");
        mvc.perform(patch("/api/alerts/" + alert + "/status").contentType(JSON)
                        .content("{\"status\":\"resolved\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("resolved"));
        String resolved = mvc.perform(get("/api/alerts?status=resolved")).andReturn().getResponse().getContentAsString();
        assertThat(resolved).contains(alert);
        String open = mvc.perform(get("/api/alerts?status=open")).andReturn().getResponse().getContentAsString();
        assertThat(open).doesNotContain("\"id\":\"" + alert + "\"");
    }

    // ---------- Settings ----------

    @Test
    void approvalRuleNeedsANameAndCondition() throws Exception {
        mvc.perform(post("/api/settings/approval-rules").contentType(JSON)
                        .content("{\"name\":\"\",\"condition\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.name").exists())
                .andExpect(jsonPath("$.fields.condition").exists());
    }

    @Test
    void approvalRuleCanBeSwitchedOffAndOn() throws Exception {
        String rule = idOf(mvc.perform(post("/api/settings/approval-rules").contentType(JSON)
                        .content("{\"name\":\"Discount rule\",\"condition\":\"Discount above 5%\",\"approver\":\"Owner\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.active").value(true))
                .andReturn());
        mvc.perform(patch("/api/settings/approval-rules/" + rule).contentType(JSON)
                        .content("{\"active\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));
        mvc.perform(patch("/api/settings/approval-rules/" + rule).contentType(JSON)
                        .content("{\"active\":true}"))
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void aiModeMustBeAutoPostOrAlwaysReview() throws Exception {
        mvc.perform(patch("/api/settings/ai/ANY-ID").contentType(JSON)
                        .content("{\"mode\":\"sometimes\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("mode must be auto-post or always-review"));
    }

    // ---------- Catalyst ----------

    @Test
    void catalystRejectsAnEmptyMessage() throws Exception {
        mvc.perform(post("/api/catalyst/messages").contentType(JSON).content("{\"text\":\"  \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Message text cannot be empty"));
    }

    @Test
    void catalystStoresTheOwnerMessageTrimmed() throws Exception {
        mvc.perform(post("/api/catalyst/messages").contentType(JSON).content("{\"text\":\"  hello  \"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sender").value("user"))
                .andExpect(jsonPath("$.text").value("hello"));
    }

    // ---------- Reports and dashboard ----------

    @Test
    void dailyHaikuIsThreeLinesAndStableWithinADay() throws Exception {
        String first = mvc.perform(get("/api/haiku?date=2026-03-10")).andExpect(status().isOk())
                .andExpect(jsonPath("$.lines.length()").value(3))
                .andReturn().getResponse().getContentAsString();
        String again = mvc.perform(get("/api/haiku?date=2026-03-10")).andReturn().getResponse().getContentAsString();
        String nextDay = mvc.perform(get("/api/haiku?date=2026-03-11")).andReturn().getResponse().getContentAsString();
        List<String> verse = JsonPath.read(first, "$.lines");
        // No API key is configured in tests, so the fixed verses are used and no network call is made.
        assertThat(JsonPath.<String>read(first, "$.source")).isEqualTo("fixed");
        assertThat(JsonPath.<List<String>>read(again, "$.lines")).isEqualTo(verse);
        assertThat(JsonPath.<List<String>>read(nextDay, "$.lines")).isNotEqualTo(verse);
    }

    @Test
    void reportKindMustBeKnown() throws Exception {
        mvc.perform(get("/api/reports/gossip")).andExpect(status().isNotFound());
    }

    @Test
    void everyReportKindReturnsATable() throws Exception {
        for (String kind : List.of("receivables", "stock", "purchase-orders")) {
            mvc.perform(get("/api/reports/" + kind))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.columns").isArray())
                    .andExpect(jsonPath("$.rows").isArray());
        }
    }

    @Test
    void dashboardCashPositionFollowsTheLedger() throws Exception {
        BigDecimal ledger = latestLedgerBalance();
        String body = mvc.perform(get("/api/dashboard")).andReturn().getResponse().getContentAsString();
        Map<String, Object> dash = JsonPath.read(body, "$");
        assertThat(new BigDecimal(String.valueOf(dash.get("cashPosition")))).isEqualByComparingTo(ledger);
    }

    @Test
    void auditLogCanBeFilteredByModule() throws Exception {
        String item = createItem(unique("AUD"), 1, 0);
        mvc.perform(post("/api/inventory/" + item + "/stock").contentType(JSON)
                        .content("{\"location\":\"shop\",\"delta\":1,\"reason\":\"Audit probe\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/audit-log?module=Inventory"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].module").value("Inventory"));
    }

    // ---------- helpers ----------

    private String createCustomer(String name, String creditLimit) throws Exception {
        return idOf(mvc.perform(post("/api/customers").contentType(JSON)
                        .content("{\"name\":\"" + name + "\",\"creditLimit\":" + creditLimit + "}"))
                .andExpect(status().isCreated())
                .andReturn());
    }

    private String createOverdueCustomer(String name, int daysOverdue, int balance) throws Exception {
        return idOf(mvc.perform(post("/api/customers").contentType(JSON)
                        .content("{\"name\":\"" + name + "\",\"contactPerson\":\"Owner\",\"phone\":\"0770000000\","
                                + "\"email\":\"accounts@shop.example\",\"creditLimit\":0,\"outstandingBalance\":" + balance
                                + ",\"daysOverdue\":" + daysOverdue + "}"))
                .andExpect(status().isCreated())
                .andReturn());
    }

    private String collectionItemFor(String customerId) throws Exception {
        mvc.perform(post("/api/collections/sync")).andExpect(status().isOk());
        String body = mvc.perform(get("/api/collections")).andReturn().getResponse().getContentAsString();
        List<Map<String, Object>> items = JsonPath.read(body, "$");
        return items.stream()
                .filter(item -> customerId.equals(item.get("customerId")))
                .map(item -> (String) item.get("id"))
                .findFirst()
                .orElseThrow(() -> new AssertionError("collection item for " + customerId));
    }

    private String createSupplier(String name) throws Exception {
        return idOf(mvc.perform(post("/api/suppliers").contentType(JSON)
                        .content("{\"name\":\"" + name + "\"}"))
                .andExpect(status().isCreated())
                .andReturn());
    }

    private String createItem(String sku, int warehouse, int reorderLevel) throws Exception {
        return idOf(mvc.perform(post("/api/inventory").contentType(JSON)
                        .content(itemJson(sku, warehouse, reorderLevel)))
                .andExpect(status().isCreated())
                .andReturn());
    }

    private String createPo(String sku) throws Exception {
        createItem(sku, 0, 0);
        return createPoFor(sku, 5);
    }

    private String createPoFor(String sku, int qty) throws Exception {
        String supplier = createSupplier("Supplier for " + sku);
        return idOf(mvc.perform(post("/api/purchase-orders").contentType(JSON)
                        .content(poJson(supplier, sku, qty)))
                .andExpect(status().isCreated())
                .andReturn());
    }

    private String uploadDocument(String name) throws Exception {
        return idOf(mvc.perform(multipart("/api/documents")
                        .file(new MockMultipartFile("file", name, "application/pdf", "pdf-bytes".getBytes()))
                        .param("channel", "upload"))
                .andExpect(status().isCreated())
                .andReturn());
    }

    private String chequePayment(String number) throws Exception {
        return idOf(mvc.perform(post("/api/accounting/payments").contentType(JSON)
                        .content("{\"customerName\":\"Cheque Payer\",\"method\":\"Cheque\",\"amount\":50,"
                                + "\"chequeNumber\":\"" + number + "\",\"invoiceRef\":\"INV-C\"}"))
                .andExpect(status().isCreated())
                .andReturn());
    }

    private String raiseAlert(String title) throws Exception {
        return idOf(mvc.perform(post("/api/alerts").contentType(JSON)
                        .content("{\"title\":\"" + title + "\",\"category\":\"Unusual Amount\",\"severity\":\"info\"}"))
                .andExpect(status().isCreated())
                .andReturn());
    }

    /** Balance on the newest ledger line, or zero when the ledger is empty. */
    private BigDecimal latestLedgerBalance() throws Exception {
        String body = mvc.perform(get("/api/accounting/ledger")).andReturn().getResponse().getContentAsString();
        List<Map<String, Object>> entries = JsonPath.read(body, "$");
        return entries.isEmpty() ? BigDecimal.ZERO
                : new BigDecimal(String.valueOf(entries.get(0).get("runningBalance")));
    }

    private static String unique(String prefix) {
        return prefix + "-" + System.nanoTime();
    }

    private static String itemJson(String sku, int warehouse, int reorderLevel) {
        return "{\"sku\":\"" + sku + "\",\"name\":\"Item " + sku + "\",\"unit\":\"Cases\","
                + "\"warehouseStock\":" + warehouse + ",\"shopStock\":0,\"vanStock\":0,"
                + "\"reorderLevel\":" + reorderLevel + ",\"unitCost\":100,\"salePrice\":150}";
    }

    private static String orderJson(String customerId, String type, int qty, int unitPrice) {
        return "{\"type\":\"" + type + "\",\"customerId\":\"" + customerId + "\",\"source\":\"walk-in\","
                + "\"items\":[{\"id\":\"l1\",\"sku\":\"" + SHARED_SKU + "\",\"productName\":\"Thing\",\"qty\":" + qty
                + ",\"unit\":\"Cases\",\"unitPrice\":" + unitPrice
                + ",\"warehouseStock\":0,\"shopStock\":0,\"vanStock\":0}]}";
    }

    private static String poJson(String supplierId, String sku, int qty) {
        return "{\"supplierId\":\"" + supplierId + "\",\"lines\":[{\"sku\":\"" + sku + "\",\"productName\":\"Thing\","
                + "\"unit\":\"Cases\",\"orderedQty\":" + qty + ",\"receivedQty\":0,\"invoicedQty\":0,\"unitCost\":100}]}";
    }

    /** The id of a single record, or of the first record when the response is a list. */
    private static String idOf(MvcResult result) throws Exception {
        String body = result.getResponse().getContentAsString();
        String path = body.trim().startsWith("[") ? "$[0].id" : "$.id";
        Object id = JsonPath.read(body, path);
        assertThat(id).as("response contains an id").isNotNull();
        return id.toString();
    }

    private static int countOccurrences(String text, String needle) {
        int count = 0;
        for (int i = text.indexOf(needle); i >= 0; i = text.indexOf(needle, i + needle.length())) {
            count++;
        }
        return count;
    }
}
