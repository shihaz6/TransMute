package com.transmute.erp.customer;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.transmute.erp.auth.TestRequestDefaults;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Checks the partial update endpoint: only the listed contact fields change, and balances stay put.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:customer-patch-test;DB_CLOSE_DELAY=-1",
        "transmute.haiku.groq-api-key=",
        "transmute.storage.dir=target/patch-uploads"
})
@AutoConfigureMockMvc
@Import(TestRequestDefaults.class)
@WithMockUser
class CustomerPatchTest {

    private static final MediaType JSON = MediaType.APPLICATION_JSON;

    @Autowired
    private MockMvc mvc;

    @Test
    void patchChangesContactFieldsAndLeavesBalanceAlone() throws Exception {
        String id = createCustomerWithBalance("Patch Balance Shop", 500);
        mvc.perform(patch("/api/customers/" + id).contentType(JSON)
                        .content("{\"phone\":\"0771234567\",\"email\":\"owner@shop.example\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value("0771234567"))
                .andExpect(jsonPath("$.email").value("owner@shop.example"))
                .andExpect(jsonPath("$.outstandingBalance").value(500));
        mvc.perform(get("/api/customers/" + id))
                .andExpect(jsonPath("$.outstandingBalance").value(500));
    }

    @Test
    void patchWithBalanceKeyIsRejected() throws Exception {
        String id = createCustomerWithBalance("Patch Reject Shop", 500);
        mvc.perform(patch("/api/customers/" + id).contentType(JSON)
                        .content("{\"outstandingBalance\":0}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Field outstandingBalance cannot be changed here"));
    }

    @Test
    void patchWithBadEmailIsRejected() throws Exception {
        String id = createCustomerWithBalance("Patch Bad Email Shop", 500);
        mvc.perform(patch("/api/customers/" + id).contentType(JSON)
                        .content("{\"email\":\"not an email\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Enter a valid email address"));
    }

    @Test
    void patchWithNullEmailClearsIt() throws Exception {
        String id = createCustomerWithBalance("Patch Clear Email Shop", 500);
        mvc.perform(patch("/api/customers/" + id).contentType(JSON)
                        .content("{\"email\":\"clear@shop.example\"}"))
                .andExpect(status().isOk());
        mvc.perform(patch("/api/customers/" + id).contentType(JSON)
                        .content("{\"email\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(nullValue()))
                .andExpect(jsonPath("$.outstandingBalance").value(500));
    }

    private String createCustomerWithBalance(String name, int balance) throws Exception {
        MvcResult result = mvc.perform(post("/api/customers").contentType(JSON)
                        .content("{\"name\":\"" + name + "\",\"creditLimit\":0,\"outstandingBalance\":" + balance + "}"))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.id");
    }
}
