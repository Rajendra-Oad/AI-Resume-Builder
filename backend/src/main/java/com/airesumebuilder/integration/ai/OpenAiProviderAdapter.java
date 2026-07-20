package com.airesumebuilder.integration.ai;

import com.airesumebuilder.common.exception.ExternalServiceException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Component("openai")
public class OpenAiProviderAdapter implements AiProvider {

    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;

    public OpenAiProviderAdapter(
        ObjectMapper objectMapper,
        @Value("${OPENAI_API_KEY:}") String apiKey,
        @Value("${app.ai.openai.model:gpt-5-mini}") String model
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.model = model;
    }

    @Override
    public String key() { return "openai"; }
    @Override
    public AiProviderResponse generate(AiProviderRequest request) {
        return generate(request, apiKey);
    }
    @Override
    public AiProviderResponse generate(AiProviderRequest request, String credential) {
        if (credential == null || credential.isBlank()) {
            throw new ExternalServiceException("OPENAI_API_KEY is not configured.");
        }

        try {
            String prompt = request.systemInstruction() + "\n\nUser content:\n" + request.userContent();
            String requestBody = objectMapper.writeValueAsString(new OpenAiRequest(model, prompt));
            HttpRequest providerRequest = HttpRequest.newBuilder()
                .uri(URI.create("https://api.openai.com/v1/responses"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + credential)
                .timeout(Duration.ofSeconds(60))
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();
            HttpResponse<String> response = httpClient.send(providerRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ExternalServiceException("OpenAI request failed (HTTP " + response.statusCode() + ").");
            }

            JsonNode responseBody = objectMapper.readTree(response.body());
            JsonNode text = responseBody.path("output_text");
            if (text.isMissingNode() || text.asText().isBlank()) {
                text = responseBody.at("/output/0/content/0/text");
            }
            if (text.isMissingNode() || text.asText().isBlank()) {
                throw new ExternalServiceException("OpenAI returned no generated text.");
            }
            return new AiProviderResponse(text.asText(), key(), model, estimate(prompt), estimate(text.asText()));
        } catch (ExternalServiceException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ExternalServiceException("Could not reach OpenAI. Check the API key and network connection.");
        }
    }

    private record OpenAiRequest(String model, String input) { }
    private int estimate(String value) { return Math.max(1, value.length() / 4); }
}
