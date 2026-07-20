package com.airesumebuilder.security;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SecurityEmailServiceTest {
    @Test
    void createsAnHtmlActionEmail() {
        JavaMailSender sender = mock(JavaMailSender.class);
        @SuppressWarnings("unchecked") ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(sender);
        when(sender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));

        new SecurityEmailService(provider, "no-reply@example.com").sendActionEmail(
            "person@example.com", "Reset password", "Reset your password", "A reset was requested.",
            "Reset password", "https://example.com/reset-password?token=abc", "in 30 minutes"
        );

        verify(sender).send(org.mockito.ArgumentMatchers.any(MimeMessage.class));
    }
}
