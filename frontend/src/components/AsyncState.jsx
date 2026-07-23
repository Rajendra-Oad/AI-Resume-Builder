import { Button } from "./Button";
import { Skeleton } from "./Skeleton";

export const AsyncState = ({ error, isLoading, onRetry, children, fallback }) => {
  if (isLoading)
    return fallback ?? (
      <div className="skeleton-stack">
        <Skeleton />
        <Skeleton />
      </div>
    );
  if (error)
    return (
      <div className="notice notice--error" role="alert">
        <p>{error}</p>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  return children;
};
