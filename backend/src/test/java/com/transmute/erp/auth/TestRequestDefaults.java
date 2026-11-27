package com.transmute.erp.auth;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcBuilderCustomizer;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

/**
 * Test-only: every MockMvc request carries a valid CSRF token, so the existing flow tests can
 * focus on business rules. Tests that need a signed-in user add {@code @WithMockUser}.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestRequestDefaults {

    @Bean
    MockMvcBuilderCustomizer csrfOnEveryRequest() {
        return builder -> builder.defaultRequest(MockMvcRequestBuilders.get("/").with(csrf()));
    }
}
