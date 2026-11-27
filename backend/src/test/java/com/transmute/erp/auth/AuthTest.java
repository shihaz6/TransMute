package com.transmute.erp.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

/** Sign-in is required for the API, and the owner account can sign in with the right password. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:auth-test;DB_CLOSE_DELAY=-1",
        "transmute.haiku.groq-api-key=",
        "transmute.storage.dir=target/auth-uploads",
        "transmute.auth.owner-username=owner-test",
        "transmute.auth.owner-password=correct-horse-battery"
})
@AutoConfigureMockMvc
@Import(TestRequestDefaults.class)
class AuthTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void apiRejectsAnonymousRequests() throws Exception {
        mvc.perform(get("/api/customers")).andExpect(status().isUnauthorized());
    }

    @Test
    void healthIsOpen() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    @Test
    void wrongPasswordIsRefused() throws Exception {
        mvc.perform(post("/api/auth/login").contentType("application/json")
                        .content("{\"username\":\"owner-test\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Wrong username or password"));
    }

    @Test
    void repeatedWrongPasswordsAreThrottled() throws Exception {
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/auth/login").contentType("application/json")
                            .content("{\"username\":\"throttle-target\",\"password\":\"wrong\"}")
                            .with(request -> {
                                request.setRemoteAddr("10.9.9.9");
                                return request;
                            }))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/login").contentType("application/json")
                        .content("{\"username\":\"throttle-target\",\"password\":\"wrong\"}")
                        .with(request -> {
                            request.setRemoteAddr("10.9.9.9");
                            return request;
                        }))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void correctPasswordSignsInAndTheSessionWorks() throws Exception {
        var session = mvc.perform(post("/api/auth/login").contentType("application/json")
                        .content("{\"username\":\"owner-test\",\"password\":\"correct-horse-battery\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("owner-test"))
                .andReturn()
                .getRequest()
                .getSession();
        assertThat(session).isNotNull();

        mvc.perform(get("/api/auth/me").session((org.springframework.mock.web.MockHttpSession) session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("OWNER"));
    }
}
