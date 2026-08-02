import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";

export const PlanComparison = ({ plans, currentPlan, onDowngrade }) => (
  <section aria-labelledby="billing-plans-title">
    <div className="section-header section-header--compact">
      <div><p className="eyebrow">PLANS</p><h2 id="billing-plans-title">Compare plans</h2></div>
    </div>
    <div className="billing-plan-grid">
      {plans.map((plan) => {
        const isCurrent = plan.code === currentPlan;
        const canDowngrade = plan.code === "FREE" && currentPlan && currentPlan !== "FREE" && plan.selfServiceAvailable;
        return (
          <Card className={`billing-plan-card ${isCurrent ? "billing-plan-card--current" : ""}`} key={plan.code}>
            <div className="billing-card-heading">
              <h3>{plan.displayName}</h3>
              {isCurrent && <span className="billing-status billing-status--success">CURRENT</span>}
            </div>
            <p className="billing-price">Pricing unavailable</p>
            <p className="muted">Billing period and plan limits are not provided by the billing service.</p>
            <Button
              variant={isCurrent ? "secondary" : "primary"}
              disabled={isCurrent || !canDowngrade}
              onClick={canDowngrade ? onDowngrade : undefined}
              title={!isCurrent && !canDowngrade ? "Self-service plan changes are not available." : undefined}
            >
              {isCurrent ? "Current plan" : canDowngrade ? "Downgrade to Free" : "Contact support"}
            </Button>
          </Card>
        );
      })}
    </div>
  </section>
);
