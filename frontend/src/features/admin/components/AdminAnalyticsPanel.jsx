import { useMemo } from "react";

import { AppIcon } from "../../../components/AppIcon";
import { AsyncState } from "../../../components/AsyncState";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Input } from "../../../components/Input";
import { Select } from "../../../components/Select";
import { MetricSkeleton, TableSkeleton } from "../../../components/Skeleton";
import { Table } from "../../../components/Table";
import { useAdminAnalytics } from "../hooks/useAdminAnalytics";

const labels = {
  RESUME_CREATED: "Resume created",
  AI_REQUEST: "AI request",
  PDF_EXPORT: "PDF export",
  ATS_REPORT: "ATS report",
};

const KpiCard = ({ icon, label, value, description, scope }) => (
  <Card className="admin-analytics-kpi">
    <div className="admin-analytics-kpi__top">
      <span><AppIcon name={icon} size={18} /></span>
      <small>{scope}</small>
    </div>
    <strong>{value ?? 0}</strong>
    <h3>{label}</h3>
    <p>{description}</p>
  </Card>
);

export const AdminAnalyticsPanel = () => {
  const analytics = useAdminAnalytics();
  const totals = analytics.overview.data?.totals;
  const rows = useMemo(() => [...(analytics.metrics.data ?? [])].sort((left, right) =>
    right.date.localeCompare(left.date) || left.name.localeCompare(right.name)), [analytics.metrics.data]);
  const columns = [
    { key: "date", label: "Date", render: (item) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${item.date}T00:00:00`)) },
    { key: "name", label: "Activity", render: (item) => labels[item.name] ?? item.name },
    { key: "value", label: "Count" },
  ];
  return (
    <section className="admin-analytics" aria-labelledby="admin-analytics-title">
      <div className="section-header section-header--compact">
        <div><p className="eyebrow">SYSTEM ANALYTICS</p><h2 id="admin-analytics-title">Platform overview</h2><p className="muted">Current account totals and activity recorded during the selected period.</p></div>
        <Button variant="secondary" onClick={analytics.refresh} disabled={analytics.isRefreshing}>{analytics.isRefreshing ? "Refreshing…" : "Refresh"}</Button>
      </div>

      <div className="admin-analytics-filters" aria-label="Analytics date range">
        <Select aria-label="Analytics time range" value={analytics.preset} onChange={(event) => analytics.selectPreset(event.target.value)}>
          <option value="TODAY">Today</option><option value="DAYS_7">Last 7 days</option><option value="DAYS_30">Last 30 days</option><option value="DAYS_90">Last 90 days</option><option value="YEAR">Last year</option><option value="CUSTOM">Custom range</option>
        </Select>
        {analytics.preset === "CUSTOM" && <>
          <Input type="date" aria-label="Analytics start date" value={analytics.customFrom} onChange={(event) => analytics.setCustomFrom(event.target.value)} />
          <Input type="date" aria-label="Analytics end date" value={analytics.customTo} onChange={(event) => analytics.setCustomTo(event.target.value)} />
          <Button onClick={analytics.applyCustomRange}>Apply range</Button>
        </>}
        <span className="admin-analytics-range" aria-live="polite">{analytics.range.from} – {analytics.range.to}</span>
      </div>
      {analytics.validationError && <p className="form-error" role="alert">{analytics.validationError}</p>}

      <AsyncState isLoading={analytics.overview.isLoading} error={analytics.overview.error?.message} onRetry={analytics.refresh} fallback={<MetricSkeleton />}>
        <div className="admin-analytics-kpis">
          <KpiCard icon="profile" label="Total users" value={totals?.totalUsers} description="All non-deleted accounts." scope="Current" />
          <KpiCard icon="check" label="Active users" value={totals?.activeUsers} description="Accounts with ACTIVE status." scope="Current" />
          <KpiCard icon="plus" label="New users" value={totals?.newUsers} description="Registered during this period." scope="Selected range" />
          <KpiCard icon="document" label="Resumes created" value={totals?.resumesCreated} description="New resumes during this period." scope="Selected range" />
          <KpiCard icon="ai" label="AI requests" value={totals?.aiRequests} description="AI requests submitted in this period." scope="Selected range" />
          <KpiCard icon="ats" label="ATS reports" value={totals?.atsReports} description="ATS reports generated in this period." scope="Selected range" />
          <KpiCard icon="documentReady" label="PDF exports" value={totals?.pdfExports} description="PDF files exported in this period." scope="Selected range" />
        </div>
      </AsyncState>

      <AsyncState isLoading={analytics.metrics.isLoading} error={analytics.metrics.error?.message} onRetry={analytics.refresh} fallback={<TableSkeleton rows={6} columns={3} />}>
        <Card className="admin-analytics-activity">
          <div className="billing-card-heading"><div><p className="eyebrow">DAILY ACTIVITY</p><h2>Runtime usage metrics</h2></div></div>
          <Table columns={columns} rows={rows} emptyMessage="No runtime usage was recorded for this period." />
          <p className="muted admin-analytics-note">Runtime metrics are available only from the date metric collection was enabled. Historical activity is not backfilled.</p>
        </Card>
      </AsyncState>
    </section>
  );
};
