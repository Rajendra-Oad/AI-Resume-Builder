package com.airesumebuilder.feature.auth.phone;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name="app.otp.provider", havingValue="fake", matchIfMissing=true)
public class FakeOtpDeliveryProvider implements OtpDeliveryProvider {
    public DeliveryResult send(String phone, String code) { return new DeliveryResult(code); }
}
