import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";

const date = (value) =>
  value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : "Not provided";

const statusTone = (status) => {
  if (status === "ACTIVE") return "success";
  if (status === "PAST_DUE" || status === "EXPIRED") return "warning";
  if (status === "CANCELLED") return "muted";
  return "info";
};

export const CurrentPlanCard = ({ subscription, entitlement, onCancel }) => {
  const canCancel = subscription?.plan !== "FREE" && subscription?.status === "ACTIVE";
  return (
    <Card className="billing-current-card" data-reveal>
      <div className="billing-card-heading">
        <div>
          <p className="eyebrow">CURRENT PLAN</p>
          <h2>{subscription?.plan ?? "No subscription"}</h2>
        </div>
        {subscription && (
          <span className={`billing-status billing-status--${statusTone(subscription.status)}`}>
            {subscription.status}
          </span>
        )}
      </div>
      {subscription ? (
        <dl className="billing-detail-grid">
          <div><dt>Started</dt><dd>{date(subscription.startsAt)}</dd></div>
          <div><dt>Plan ends</dt><dd>{date(subscription.endsAt)}</dd></div>
          <div><dt>Access</dt><dd>{entitlement?.premium ? "Premium features" : "Free features"}</dd></div>
          <div><dt>Renewal</dt><dd>Not provided by billing service</dd></div>
        </dl>
      ) : <p className="muted">No subscription information is available.</p>}
      {canCancel && <Button variant="destructive" onClick={onCancel}>Cancel subscription</Button>}
    </Card>
  );
};
