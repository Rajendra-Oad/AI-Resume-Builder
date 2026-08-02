import { useQuery } from "@tanstack/react-query";

import { AsyncState } from "../../../components/AsyncState";
import { Card } from "../../../components/Card";
import { ModulePage } from "../../../components/ModulePage";
import { MetricSkeleton } from "../../../components/Skeleton";
import { AiProviderSettings } from "../../settings";
import { getAiUsage } from "../api/aiAssistantApi";
import { AiJobQueue } from "./AiJobQueue";
export const AiAssistantPanel = () => {
  const query = useQuery({ queryKey: ["ai-usage"], queryFn: getAiUsage });
  return (
    <ModulePage
      eyebrow="AI CENTER"
      title="AI Center"
      description="Manage your AI connection, provider keys, fallback behavior, and monthly usage."
    >
      <div className="ai-center-grid">
        <AiProviderSettings />
        <section aria-labelledby="ai-usage-title">
          <div className="section-header section-header--compact">
            <div>
              <p className="eyebrow">USAGE & LIMITS</p>
              <h2 id="ai-usage-title">Platform allowance</h2>
              <p className="muted">
                BYOK calls do not consume this platform budget. Platform fallback calls do.
              </p>
            </div>
          </div>
          <AsyncState
            isLoading={query.isLoading}
            error={query.error?.message}
            onRetry={query.refetch}
            fallback={<MetricSkeleton />}
          >
            <Card>
              <div className="metric-grid">
                <div>
                  <span>Spent</span>
                  <strong>${query.data?.monthlyCostUsd ?? "0.00"}</strong>
                </div>
                <div>
                  <span>Remaining</span>
                  <strong>${query.data?.remainingUsd ?? "0.00"}</strong>
                </div>
                <div>
                  <span>Limit</span>
                  <strong>${query.data?.monthlyBudgetUsd ?? "0.00"}</strong>
                </div>
              </div>
            </Card>
          </AsyncState>
        </section>
      </div>
      <AiJobQueue />
    </ModulePage>
  );
};
