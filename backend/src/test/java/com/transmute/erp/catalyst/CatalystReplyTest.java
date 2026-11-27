package com.transmute.erp.catalyst;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import com.transmute.erp.auth.TestRequestDefaults;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/** With no GROQ_API_KEY set, Catalyst still stores an AI message explaining that replies are off. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:catalyst-test;DB_CLOSE_DELAY=-1",
        "transmute.haiku.groq-api-key=",
        "transmute.storage.dir=target/test-uploads"
})
@AutoConfigureMockMvc
@Import(TestRequestDefaults.class)
@WithMockUser
class CatalystReplyTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private CatalystMessageRepository messages;

    @Test
    void userMessageGetsAnAiReplyEvenWithoutAKey() throws Exception {
        mvc.perform(post("/api/catalyst/messages").contentType("application/json")
                        .content("{\"text\":\"hello\"}"))
                .andExpect(status().isCreated());

        var all = messages.findAllByOrderByCreatedAtAsc();
        assertThat(all).hasSize(2);
        assertThat(all.get(0).getSender()).isEqualTo("user");
        assertThat(all.get(1).getSender()).isEqualTo("ai");
        assertThat(all.get(1).getText()).isEqualTo(CatalystService.NOT_CONFIGURED);

        mvc.perform(get("/api/catalyst/messages")).andExpect(status().isOk());
    }
}
