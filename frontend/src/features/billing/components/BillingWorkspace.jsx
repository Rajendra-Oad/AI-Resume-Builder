import { useState } from "react";

import { AppIcon } from "../../../components/AppIcon";
import { AsyncState } from "../../../components/AsyncState";
import { Card } from "../../../components/Card";
import { ConfirmationDialog } from "../../../components/ConfirmationDialog";
import { ModulePage } from "../../../components/ModulePage";
import { CardSkeleton, TableSkeleton } from "../../../components/Skeleton";
import { useBilling } from "../hooks/useBilling";
import { CurrentPlanCard } from "./CurrentPlanCard";
import { PaymentDetailsModal } from "./PaymentDetailsModal";
import { PaymentHistory } from "./PaymentHistory";
import { PlanComparison } from "./PlanComparison";

const date = (value) =>
  value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : "Not provided";

const OverviewCard = ({ icon, label, value, detail }) => (
  <Card className="billing-overview-card">
    <span className="billing-overview-card__icon"><AppIcon name={icon} size={18} /></span>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{detail}</small>
  </Card>
);

export const BillingWorkspace = () => {
  const billing = useBilling();
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const loading = billing.plans.isLoading || billing.current.isLoading ||
    billing.entitlement.isLoading || billing.history.isLoading;
  const error = billing.plans.error || billing.current.error ||
    billing.entitlement.error || billing.history.error;
  const retry = () => Promise.all([
    billing.plans.refetch(), billing.current.refetch(), billing.entitlement.refetch(), billing.history.refetch(),
  ]);
  const confirmCancel = async () => {
    try {
      await billing.cancel.mutateAsync();
      setCancelOpen(false);
    } catch {
      // The shared mutation error handler presents the failure.
    }
  };
  const current = billing.current.data;
  const paymentTotal = billing.payments.data?.pagination?.totalElements ?? 0;

  return (
    <ModulePage eyebrow="ACCOUNT" title="Subscription & billing" description="Review your plan, subscription history, and secure payment records.">
      <AsyncState
        isLoading={loading}
        error={error?.message}
        onRetry={retry}
        fallback={<div className="billing-loading"><CardSkeleton count={4} /><TableSkeleton rows={4} columns={5} /></div>}
      >
        <section className="billing-overview-grid" aria-label="Billing overview">
          <OverviewCard icon="billing" label="Current plan" value={current?.plan ?? "—"} detail={current?.status ?? "No subscription"} />
          <OverviewCard icon="chart" label="Total payments" value={paymentTotal} detail="Recorded transactions" />
          <OverviewCard icon="documentReady" label="Plan end" value={date(current?.endsAt)} detail="Renewal date is not provided" />
          <OverviewCard icon="help" label="Next payment" value="Not provided" detail="No billing forecast is available" />
        </section>
        <div className="billing-primary-grid">
          <CurrentPlanCard subscription={current} entitlement={billing.entitlement.data} onCancel={() => setCancelOpen(true)} />
          <Card className="billing-history-card" data-reveal>
            <p className="eyebrow">SUBSCRIPTION HISTORY</p>
            <h2>Account timeline</h2>
            {(billing.history.data?.items ?? []).length ? (
              <ol className="billing-timeline">
                {billing.history.data.items.map((item) => (
                  <li key={item.id}>
                    <span className="billing-timeline__marker" />
                    <div><strong>{item.plan}</strong><span>{item.status}</span><small>{date(item.startsAt)}</small></div>
                  </li>
                ))}
              </ol>
            ) : <p className="muted">No subscription history is available.</p>}
          </Card>
        </div>
        <PlanComparison plans={billing.plans.data ?? []} currentPlan={current?.plan} onDowngrade={() => setCancelOpen(true)} />
      </AsyncState>

      <AsyncState
        isLoading={billing.payments.isLoading}
        error={billing.payments.error?.message}
        onRetry={billing.payments.refetch}
        fallback={<TableSkeleton rows={5} columns={6} />}
      >
        <PaymentHistory
          page={billing.paymentPage}
          payments={billing.payments.data ?? { items: [], pagination: null }}
          onPageChange={billing.setPaymentPage}
          onSelect={setSelectedPayment}
        />
      </AsyncState>

      <PaymentDetailsModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />
      <ConfirmationDialog
        isOpen={cancelOpen}
        onCancel={() => setCancelOpen(false)}
        onConfirm={confirmCancel}
        title="Cancel your subscription?"
        description="Your paid subscription will end immediately and the Free plan will become active. This action does not delete your resumes."
        confirmLabel="Cancel subscription"
        tone="danger"
        isPending={billing.cancel.isPending}
      />
    </ModulePage>
  );
};
