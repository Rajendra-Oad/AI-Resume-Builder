package com.airesumebuilder.feature.auth.phone;

import com.airesumebuilder.common.exception.ExternalServiceException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

@Component
@ConditionalOnProperty(name="app.otp.provider", havingValue="textbee")
public class TextBeeOtpDeliveryProvider implements OtpDeliveryProvider {
    private final RestClient client;
    private final String deviceId;
    private final String simSubscriptionId;

    public TextBeeOtpDeliveryProvider(
        RestClient.Builder builder,
        @Value("${app.otp.textbee.base-url:https://api.textbee.dev}") String baseUrl,
        @Value("${app.otp.textbee.api-key}") String apiKey,
        @Value("${app.otp.textbee.device-id}") String deviceId,
        @Value("${app.otp.textbee.sim-subscription-id:}") String simSubscriptionId
    ) {
        this.client = builder.baseUrl(baseUrl).defaultHeader("x-api-key", apiKey).build();
        this.deviceId = deviceId;
        this.simSubscriptionId = simSubscriptionId;
    }

    @Override
    public DeliveryResult send(String phone, String code) {
        Map<String,Object> payload = new LinkedHashMap<>();
        payload.put("recipients", List.of(phone));
        payload.put("message", "Your AI Resume Builder verification code is " + code + ". It expires in 5 minutes.");
        if (StringUtils.hasText(simSubscriptionId)) payload.put("simSubscriptionId", Integer.valueOf(simSubscriptionId));
        try {
            client.post().uri("/api/v1/gateway/devices/{deviceId}/send-sms", deviceId)
                .body(payload).retrieve().toBodilessEntity();
            return new DeliveryResult(null);
        } catch (RuntimeException exception) {
            throw new ExternalServiceException("TextBee could not queue the OTP. Confirm that the API key is valid and the Android device is active.");
        }
    }
}
