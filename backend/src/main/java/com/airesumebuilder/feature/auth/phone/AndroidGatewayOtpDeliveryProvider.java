package com.airesumebuilder.feature.auth.phone;

import com.airesumebuilder.common.exception.ExternalServiceException;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

@Component
@ConditionalOnProperty(name="app.otp.provider", havingValue="android-gateway")
public class AndroidGatewayOtpDeliveryProvider implements OtpDeliveryProvider {
    private final RestClient client;
    private final String endpoint;
    private final String apiKey;

    public AndroidGatewayOtpDeliveryProvider(
        RestClient.Builder builder,
        @Value("${app.otp.android-gateway.url}") String endpoint,
        @Value("${app.otp.android-gateway.api-key:}") String apiKey
    ) {
        this.client = builder.build();
        this.endpoint = endpoint;
        this.apiKey = apiKey;
    }

    @Override
    public DeliveryResult send(String phone, String code) {
        try {
            RestClient.RequestBodySpec request = client.post().uri(endpoint);
            if (StringUtils.hasText(apiKey)) request.header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey);
            request.body(Map.of(
                "phone", localNumber(phone),
                "message", "Your AI Resume Builder verification code is " + code + ". It expires in 5 minutes."
            )).retrieve().toBodilessEntity();
            return new DeliveryResult(null);
        } catch (RuntimeException exception) {
            throw new ExternalServiceException("The mobile SMS gateway is unavailable. Check that the phone and gateway app are online.");
        }
    }

    private String localNumber(String phone) {
        return phone.startsWith("+91") ? phone.substring(3) : phone.replace("+", "");
    }
}
