import { AsyncState } from "./AsyncState";
import { Card } from "./Card";

export const ModulePage = ({ children, description, eyebrow, health, title }) => (
  <main className="dashboard-page">
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
    </header>
    {health ? (
      <AsyncState
        isLoading={health.isLoading}
        error={health.error?.message}
        onRetry={health.refetch}
      >
        <Card>
          <p className="eyebrow">SERVICE STATUS</p>
          <h2>Frontend ready</h2>
          <p className="muted">
            The module is connected. Its domain endpoints are not available in the backend yet.
          </p>
        </Card>
      </AsyncState>
    ) : (
      children
    )}
  </main>
);
