package com.airesumebuilder.config;

import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestClientCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;

@Configuration
public class RestClientTimeoutConfiguration {
    @Bean
    RestClientCustomizer externalRestClientTimeoutCustomizer(
        @Value("${app.http.connect-timeout:PT5S}") Duration connectTimeout,
        @Value("${app.http.read-timeout:PT10S}") Duration readTimeout
    ) {
        return builder -> {
            HttpClient httpClient = HttpClient.newBuilder().connectTimeout(connectTimeout).build();
            JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
            requestFactory.setReadTimeout(readTimeout);
            builder.requestFactory(requestFactory);
        };
    }
}
