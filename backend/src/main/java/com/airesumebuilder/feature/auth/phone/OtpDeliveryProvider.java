package com.airesumebuilder.feature.auth.phone;

public interface OtpDeliveryProvider {
    DeliveryResult send(String phone, String code);
    record DeliveryResult(String developmentCode) {}
}
