import { Link, useLocation } from "react-router-dom";

import { ErrorBoundary } from "./ErrorBoundary";

export const RouteErrorBoundary = ({ children, featureName = "This page" }) => {
  const location = useLocation();

  return (
    <ErrorBoundary
      resetKey={location.key}
      fallback={({ reset }) => (
        <section className="not-found" role="alert">
          <p className="eyebrow">{featureName.toUpperCase()} ERROR</p>
          <h1>{featureName} could not be displayed.</h1>
          <p className="muted">
            Your other workspace features are still available. Try this page again or return to the
            dashboard.
          </p>
          <div className="button-row">
            <button className="button button--primary" type="button" onClick={reset}>
              Try again
            </button>
            <Link className="button button--secondary" to="/dashboard">
              Go to dashboard
            </Link>
          </div>
        </section>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};
