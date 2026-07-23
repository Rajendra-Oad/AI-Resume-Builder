package com.airesumebuilder.feature.auth.phone;

import com.airesumebuilder.common.exception.ExternalServiceException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@ConditionalOnProperty(name="app.otp.provider", havingValue="msg91")
public class Msg91OtpDeliveryProvider implements OtpDeliveryProvider {
    private final RestClient client; private final String templateId;
    public Msg91OtpDeliveryProvider(RestClient.Builder builder,
        @Value("${app.otp.msg91.base-url:https://control.msg91.com}") String baseUrl,
        @Value("${app.otp.msg91.auth-key}") String authKey,
        @Value("${app.otp.msg91.template-id}") String templateId) {
        this.client=builder.baseUrl(baseUrl).defaultHeader("authkey",authKey).build(); this.templateId=templateId;
    }
    public DeliveryResult send(String phone,String code) {
        try {
            client.post().uri(uri -> uri.path("/api/v5/otp").queryParam("template_id",templateId)
                .queryParam("mobile",phone.substring(1)).queryParam("otp",code).build()).retrieve().toBodilessEntity();
            return new DeliveryResult(null);
        } catch (RuntimeException exception) { throw new ExternalServiceException("We could not send the verification code. Try again shortly."); }
    }
}
