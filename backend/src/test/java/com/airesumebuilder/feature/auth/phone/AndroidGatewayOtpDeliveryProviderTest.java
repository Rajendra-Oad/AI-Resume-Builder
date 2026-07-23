package com.airesumebuilder.feature.auth.phone;

import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class AndroidGatewayOtpDeliveryProviderTest {
    @Test
    void postsLocalPhoneAndOtpMessageToConfiguredGateway() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AndroidGatewayOtpDeliveryProvider provider = new AndroidGatewayOtpDeliveryProvider(
            builder, "http://192.168.1.46:8080/send-sms", ""
        );
        server.expect(requestTo("http://192.168.1.46:8080/send-sms"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(content().json("""
                {"phone":"9876543210","message":"Your AI Resume Builder verification code is 123456. It expires in 5 minutes."}
                """))
            .andRespond(withSuccess());

        provider.send("+919876543210", "123456");
        server.verify();
    }
}
