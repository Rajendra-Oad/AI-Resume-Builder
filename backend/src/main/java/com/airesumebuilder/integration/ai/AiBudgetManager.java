package com.airesumebuilder.integration.ai;

import com.airesumebuilder.common.exception.ExternalServiceException;
import com.airesumebuilder.feature.ai.repository.AiUsageRepository;
import java.math.BigDecimal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AiBudgetManager {
    private final AiUsageRepository usage; private final BigDecimal monthlyLimit;
    public AiBudgetManager(AiUsageRepository usage, @Value("${app.ai.budget.per-user-monthly-usd:2.00}") BigDecimal monthlyLimit) { this.usage = usage; this.monthlyLimit = monthlyLimit; }
    public void check(Long userId) { if (spent(userId).compareTo(monthlyLimit) >= 0) throw new ExternalServiceException("Your monthly AI budget has been reached."); }
    public BigDecimal spent(Long userId) { return usage.spentThisMonth(userId); }
    public BigDecimal limit(){return monthlyLimit;}
}
