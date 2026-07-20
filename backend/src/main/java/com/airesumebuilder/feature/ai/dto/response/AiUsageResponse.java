package com.airesumebuilder.feature.ai.dto.response;
import java.math.BigDecimal;
public record AiUsageResponse(BigDecimal monthlyCostUsd, BigDecimal monthlyBudgetUsd, BigDecimal remainingUsd) { }
