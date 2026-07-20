export const Skeleton = ({ className = "", label = "Loading content" }) => (
  <div className={`skeleton ${className}`.trim()} role="status" aria-label={label} />
);
