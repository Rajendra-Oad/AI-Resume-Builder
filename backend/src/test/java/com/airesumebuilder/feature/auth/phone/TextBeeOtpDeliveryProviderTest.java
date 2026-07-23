package com.airesumebuilder.feature.auth.phone;

import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class TextBeeOtpDeliveryProviderTest {
    @Test void sendsOfficialTextBeeRequestContract(){
        RestClient.Builder builder=RestClient.builder(); MockRestServiceServer server=MockRestServiceServer.bindTo(builder).build();
        TextBeeOtpDeliveryProvider provider=new TextBeeOtpDeliveryProvider(builder,"https://api.textbee.dev","secret-key","device-123","");
        server.expect(requestTo("https://api.textbee.dev/api/v1/gateway/devices/device-123/send-sms"))
            .andExpect(method(HttpMethod.POST)).andExpect(header("x-api-key","secret-key"))
            .andExpect(content().json("{\"recipients\":[\"+919876543210\"],\"message\":\"Your AI Resume Builder verification code is 123456. It expires in 5 minutes.\"}"))
            .andRespond(withSuccess());
        provider.send("+919876543210","123456"); server.verify();
    }
}
