package com.airesumebuilder.feature.admin.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willAnswer;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.airesumebuilder.config.SecurityConfig;
import com.airesumebuilder.feature.admin.service.AdminService;
import com.airesumebuilder.feature.audit.service.AuditService;
import com.airesumebuilder.security.AuthRateLimitFilter;
import com.airesumebuilder.security.CurrentUser;
import com.airesumebuilder.security.JwtAuthenticationFilter;
import com.airesumebuilder.security.RestAccessDeniedHandler;
import com.airesumebuilder.security.RestAuthenticationEntryPoint;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(
    controllers = AdminController.class,
    properties = {
        "DB_URL=jdbc:mysql://localhost:3306/test",
        "DB_PASSWORD=test-database-password",
        "JWT_SECRET=01234567890123456789012345678901"
    }
)
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class, RestAccessDeniedHandler.class})
class AdminSecurityTest {
    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private AdminService service;
    @MockitoBean
    private AuditService auditService;
    @MockitoBean
    private CurrentUser currentUser;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private AuthRateLimitFilter authRateLimitFilter;

    @BeforeEach
    void passRequestsThroughApplicationFilters() throws Exception {
        willAnswer(invocation -> {
                invocation.<FilterChain>getArgument(2).doFilter(invocation.getArgument(0), invocation.getArgument(1));
                return null;
            })
            .given(jwtAuthenticationFilter)
            .doFilter(any(ServletRequest.class), any(ServletResponse.class), any(FilterChain.class));
        willAnswer(invocation -> {
                invocation.<FilterChain>getArgument(2).doFilter(invocation.getArgument(0), invocation.getArgument(1));
                return null;
            })
            .given(authRateLimitFilter)
            .doFilter(any(ServletRequest.class), any(ServletResponse.class), any(FilterChain.class));
        given(service.users(0, 20)).willReturn(new AdminService.UserPage(List.of(), 0, 20, 0));
    }

    @Test
    void rejectsAnonymousRequestsAtTheSecurityFilterChain() throws Exception {
        mvc.perform(get("/api/v1/admin/users"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error.code").value("UNAUTHENTICATED"));
    }

    @Test
    void rejectsAuthenticatedNonAdministrators() throws Exception {
        mvc.perform(get("/api/v1/admin/users").with(user("member@test").roles("USER")))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void permitsAdministrators() throws Exception {
        mvc.perform(get("/api/v1/admin/users").with(user("admin@test").roles("ADMIN")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray())
            .andExpect(jsonPath("$.pagination.totalElements").value(0));
    }
}
