package com.airesumebuilder.integration.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.airesumebuilder.common.exception.ExternalServiceException;
import com.airesumebuilder.common.exception.ValidationException;
import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AiCoreBehaviorTest {
    @Test
    void validatesAndSanitizesProviderOutput() {
        AiOutputValidator validator = new AiOutputValidator();
        assertThat(validator.validate("  useful\u0000 output  ")).isEqualTo("useful output");
        assertThatThrownBy(() -> validator.validate(" ")).isInstanceOf(ExternalServiceException.class);
        assertThatThrownBy(() -> validator.validate("x".repeat(20_001))).isInstanceOf(ExternalServiceException.class);
    }

    @Test
    void calculatesProviderSpecificCost() {
        AiCostCalculator calculator = new AiCostCalculator(
            new BigDecimal("1.00"), new BigDecimal("2.00"),
            new BigDecimal("3.00"), new BigDecimal("4.00")
        );
        assertThat(calculator.calculate(new AiProviderResponse("ok", "gemini", "model", 1_000_000, 500_000)))
            .isEqualByComparingTo("2.000000");
        assertThat(calculator.calculate(new AiProviderResponse("ok", "openai", "model", 1_000_000, 500_000)))
            .isEqualByComparingTo("5.000000");
    }

    @Test
    void resolvesHealthyProviderAndFallsBackAfterCircuitOpens() {
        AiProvider gemini = provider("gemini");
        AiProvider openai = provider("openai");
        AiProviderHealth health = new AiProviderHealth();
        AiProviderFactory factory = new AiProviderFactory(Map.of("gemini", gemini, "openai", openai), health, "GEMINI");

        assertThat(factory.resolve()).isSameAs(gemini);
        health.failure("gemini");
        health.failure("gemini");
        health.failure("gemini");
        assertThat(health.status("gemini")).isEqualTo("OPEN");
        assertThat(factory.resolve()).isSameAs(openai);
        health.success("gemini");
        assertThat(factory.resolve("gemini")).isSameAs(gemini);
        assertThat(factory.all()).containsExactlyInAnyOrder(gemini, openai);
        assertThatThrownBy(() -> factory.resolve("unknown")).isInstanceOf(ValidationException.class);
    }

    private AiProvider provider(String key) {
        AiProvider provider = mock(AiProvider.class);
        when(provider.key()).thenReturn(key);
        return provider;
    }
}
