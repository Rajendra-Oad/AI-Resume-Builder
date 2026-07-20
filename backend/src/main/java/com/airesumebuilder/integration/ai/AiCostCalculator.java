package com.airesumebuilder.integration.ai;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
@Component public class AiCostCalculator { private final BigDecimal geminiInput;private final BigDecimal geminiOutput;private final BigDecimal openAiInput;private final BigDecimal openAiOutput; public AiCostCalculator(@Value("${app.ai.pricing.gemini.input-per-million:0.10}")BigDecimal gi,@Value("${app.ai.pricing.gemini.output-per-million:0.40}")BigDecimal go,@Value("${app.ai.pricing.openai.input-per-million:0.15}")BigDecimal oi,@Value("${app.ai.pricing.openai.output-per-million:0.60}")BigDecimal oo){geminiInput=gi;geminiOutput=go;openAiInput=oi;openAiOutput=oo;} public BigDecimal calculate(AiProviderResponse r){BigDecimal i=r.provider().equals("openai")?openAiInput:geminiInput;BigDecimal o=r.provider().equals("openai")?openAiOutput:geminiOutput;return i.multiply(BigDecimal.valueOf(r.inputTokens())).add(o.multiply(BigDecimal.valueOf(r.outputTokens()))).divide(BigDecimal.valueOf(1_000_000),6,RoundingMode.HALF_UP);} }
