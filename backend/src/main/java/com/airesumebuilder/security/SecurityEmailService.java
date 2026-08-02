package com.airesumebuilder.security;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

/** Sends responsive, branded security emails without logging token-bearing links. */
@Service
public class SecurityEmailService {
    private static final Logger log = LoggerFactory.getLogger(SecurityEmailService.class);
    private final ObjectProvider<JavaMailSender> mailSender;
    private final String from;

    public SecurityEmailService(ObjectProvider<JavaMailSender> mailSender,
        @Value("${app.security.mail-from:no-reply@localhost}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    public void sendActionEmail(String to, String subject, String heading, String introduction, String actionLabel, String actionUrl, String expiry) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.warn("Security email was not sent because SMTP is not configured.");
            return;
        }
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(plainText(introduction, actionLabel, actionUrl, expiry), html(heading, introduction, actionLabel, actionUrl, expiry));
            sender.send(message);
        } catch (Exception exception) {
            log.error("Unable to send security email. Check SMTP configuration and provider response.", exception);
            throw new IllegalStateException("Unable to send security email.", exception);
        }
    }

    private String plainText(String introduction, String actionLabel, String actionUrl, String expiry) {
        return "AI RESUME BUILDER\n\n" + introduction + "\n\n" + actionLabel + ": " + actionUrl + "\n\nThis link expires " + expiry + ". If you did not request this, you can safely ignore this email.";
    }

    private String html(String heading, String introduction, String actionLabel, String actionUrl, String expiry) {
        String safeHeading = HtmlUtils.htmlEscape(heading);
        String safeIntroduction = HtmlUtils.htmlEscape(introduction);
        String safeLabel = HtmlUtils.htmlEscape(actionLabel);
        String safeUrl = HtmlUtils.htmlEscape(actionUrl);
        String safeExpiry = HtmlUtils.htmlEscape(expiry);
        return """
            <!doctype html><html><body style="margin:0;padding:0;background:#f4f7f5;font-family:Arial,Helvetica,sans-serif;color:#172b24;">
              <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f4f7f5;"><tr><td align="center">
                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #dce6df;border-radius:16px;overflow:hidden;">
                  <tr><td style="padding:30px 38px;background:#174d3e;color:#ffffff;"><div style="font-size:12px;letter-spacing:2px;font-weight:bold;">✦ AI RESUME BUILDER</div><div style="font-size:24px;font-weight:bold;margin-top:12px;">Your career, clearly presented.</div></td></tr>
                  <tr><td style="padding:38px;"><h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#162d24;">%s</h1><p style="margin:0 0 28px;font-size:16px;line-height:1.65;color:#52645b;">%s</p>
                    <table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:8px;background:#174d3e;"><a href="%s" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;">%s</a></td></tr></table>
                    <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#6b7b72;">This secure link expires %s. If you did not request this, you can safely ignore this email.</p>
                    <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:#849189;word-break:break-all;">Button not working? Copy this link into your browser:<br><a href="%s" style="color:#174d3e;">%s</a></p>
                  </td></tr>
                  <tr><td style="padding:20px 38px;background:#f8faf8;border-top:1px solid #e6ece8;font-size:12px;color:#748178;">© AI Resume Builder · Secure account notification</td></tr>
                </table>
              </td></tr></table>
            </body></html>
            """.formatted(safeHeading, safeIntroduction, safeUrl, safeLabel, safeExpiry, safeUrl, safeUrl);
    }
}
