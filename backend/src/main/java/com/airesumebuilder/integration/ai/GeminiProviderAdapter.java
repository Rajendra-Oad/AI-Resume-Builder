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

@Component("gemini")
public class GeminiProviderAdapter implements AiProvider {

    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;

    public GeminiProviderAdapter(
        ObjectMapper objectMapper,
        @Value("${GEMINI_API_KEY:}") String apiKey,
        @Value("${app.ai.gemini.model:gemini-3.5-flash}") String model
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.model = model;
    }

    @Override
    public String key() { return "gemini"; }
    @Override
    public AiProviderResponse generate(AiProviderRequest request) {
        return generate(request, apiKey);
    }
    @Override
    public AiProviderResponse generate(AiProviderRequest request, String credential) {
        if (credential == null || credential.isBlank()) {
            throw new ExternalServiceException("GEMINI_API_KEY is not configured.");
        }

        try {
            String prompt = request.systemInstruction() + "\n\nUser content:\n" + request.userContent();
            String requestBody = objectMapper.writeValueAsString(new GeminiRequest(prompt));
            HttpRequest providerRequest = HttpRequest.newBuilder()
                .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent"))
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", credential)
                .timeout(Duration.ofSeconds(60))
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();
            HttpResponse<String> response = httpClient.send(providerRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ExternalServiceException("Gemini request failed (HTTP " + response.statusCode() + ").");
            }

            JsonNode text = objectMapper.readTree(response.body()).at("/candidates/0/content/parts/0/text");
            if (text.isMissingNode() || text.asText().isBlank()) {
                throw new ExternalServiceException("Gemini returned no generated text.");
            }
            return new AiProviderResponse(text.asText(), key(), model, estimate(prompt), estimate(text.asText()));
        } catch (ExternalServiceException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ExternalServiceException("Could not reach Gemini. Check the API key and network connection.");
        }
    }

    private record GeminiRequest(Content[] contents) {
        private GeminiRequest(String prompt) {
            this(new Content[] { new Content(new Part[] { new Part(prompt) }) });
        }
    }

    private record Content(Part[] parts) { }
    private record Part(String text) { }
    private int estimate(String value) { return Math.max(1, value.length() / 4); }
}
