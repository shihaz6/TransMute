package com.transmute.erp.collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.transmute.erp.customer.Customer;
import com.transmute.erp.customer.CustomerRepository;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import com.transmute.erp.auth.TestRequestDefaults;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Reminders are emailed only when the customer has an address and mail is configured. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:reminder-test;DB_CLOSE_DELAY=-1",
        "spring.mail.host=localhost",
        "transmute.mail.from=erp@example.test",
        "management.health.mail.enabled=false",
        "transmute.haiku.groq-api-key=",
        "transmute.storage.dir=target/test-uploads"
})
@AutoConfigureMockMvc
@Import(TestRequestDefaults.class)
@WithMockUser
class ReminderEmailTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private CustomerRepository customers;

    @Autowired
    private CollectionItemRepository items;

    @MockitoBean
    private JavaMailSender mailSender;

    @Test
    void refusesToSendWithoutACustomerEmail() throws Exception {
        String itemId = reminderFor(null);

        mvc.perform(post("/api/collections/" + itemId + "/send"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Add the customer's email address before sending this reminder"));

        verify(mailSender, never()).send(any(org.springframework.mail.SimpleMailMessage.class));
        assertThat(items.findById(itemId).orElseThrow().getStatus()).isEqualTo("scheduled");
    }

    @Test
    void emailsTheReminderAndMarksItSent() throws Exception {
        String itemId = reminderFor("accounts@shop.example");

        mvc.perform(post("/api/collections/" + itemId + "/send"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("sent"));

        verify(mailSender).send(any(org.springframework.mail.SimpleMailMessage.class));
    }

    private String reminderFor(String email) {
        Customer customer = new Customer();
        customer.setId(com.transmute.erp.common.Ids.next("CUST"));
        customer.setName("Reminder Test Shop");
        customer.setEmail(email);
        customers.save(customer);

        CollectionItem item = new CollectionItem();
        item.setId(com.transmute.erp.common.Ids.next("COL"));
        item.setCustomerId(customer.getId());
        item.setCustomerName(customer.getName());
        item.setStatus("scheduled");
        item.setTone("friendly");
        item.setDraftMessage("Please settle the balance.");
        items.save(item);
        return item.getId();
    }
}
