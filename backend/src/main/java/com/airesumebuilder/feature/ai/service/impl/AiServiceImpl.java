package com.airesumebuilder.feature.ai.service.impl;

import com.airesumebuilder.feature.ai.service.AiService;
import com.airesumebuilder.integration.ai.AiGateway;
import com.airesumebuilder.feature.ai.dto.request.AiGenerationRequest;
import com.airesumebuilder.feature.ai.dto.response.AiGenerationResponse;
import com.airesumebuilder.feature.ai.dto.response.AiUsageResponse;
import com.airesumebuilder.feature.auth.service.UserAccountQueryService;
import com.airesumebuilder.integration.ai.AiBudgetManager;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;

@Service
public class AiServiceImpl implements AiService {

    private final AiGateway aiGateway;
    private final AiBudgetManager budgetManager;
    private final UserAccountQueryService userAccounts;

    public AiServiceImpl(
            AiGateway aiGateway,
            AiBudgetManager budgetManager,
            UserAccountQueryService userAccounts) {
        this.aiGateway = aiGateway;
        this.budgetManager = budgetManager;
        this.userAccounts = userAccounts;
    }

    @Override
    public AiGenerationResponse generate(String email, AiGenerationRequest request) {
        return aiGateway.generate(userAccounts.requireIdByEmail(email), request);
    }

    @Override
    public AiUsageResponse usage(String email) {
        BigDecimal spent = budgetManager.spent(userAccounts.requireIdByEmail(email));
        BigDecimal limit = budgetManager.limit();
        return new AiUsageResponse(spent, limit, limit.subtract(spent).max(BigDecimal.ZERO));
    }
}
