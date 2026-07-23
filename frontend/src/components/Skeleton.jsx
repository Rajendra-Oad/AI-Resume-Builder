export const Skeleton = ({ className = "", label = "Loading content" }) => (
  <div className={`skeleton min-h-20 animate-pulse rounded-control bg-border ${className}`.trim()} role="status" aria-label={label} />
);

export const SkeletonLine = ({ width = "100%", className = "" }) => (
  <span className={`skeleton skeleton--line ${className}`.trim()} style={{ width }} aria-hidden="true" />
);

export const CardSkeleton = ({ count = 3, className = "" }) => (
  <div className={className} role="status" aria-label="Loading cards">
    {Array.from({ length: count }, (_, index) => (
      <div className="card skeleton-card" key={index} aria-hidden="true">
        <SkeletonLine width="30%" />
        <SkeletonLine width="68%" className="skeleton--heading" />
        <SkeletonLine />
        <SkeletonLine width="82%" />
        <SkeletonLine width="36%" className="skeleton--button" />
      </div>
    ))}
  </div>
);

export const ListSkeleton = ({ count = 3, className = "" }) => (
  <div className={`skeleton-list ${className}`.trim()} role="status" aria-label="Loading list">
    {Array.from({ length: count }, (_, index) => (
      <div className="skeleton-list__item" key={index} aria-hidden="true">
        <span className="skeleton skeleton--avatar" />
        <span className="skeleton-list__copy"><SkeletonLine width="48%" className="skeleton--heading" /><SkeletonLine /><SkeletonLine width="64%" /></span>
        <SkeletonLine width="88px" className="skeleton--button" />
      </div>
    ))}
  </div>
);

export const AiJobSkeleton = ({ title = "AI is preparing your result", steps = ["Reading your input", "Building a focused draft", "Finishing the response"] }) => (
  <div className="ai-job-skeleton" role="status" aria-live="polite" aria-label={title}>
    <div className="ai-job-skeleton__heading"><span className="ai-job-skeleton__mark" aria-hidden="true">✦</span><div><strong>{title}</strong><span>This may take a moment. You can keep this page open.</span></div></div>
    <div className="ai-job-skeleton__document" aria-hidden="true"><SkeletonLine width="72%" className="skeleton--heading" /><SkeletonLine /><SkeletonLine width="94%" /><SkeletonLine width="86%" /><SkeletonLine /><SkeletonLine width="63%" /></div>
    <ol className="ai-job-steps">{steps.map((step, index) => <li key={step} className={index === 0 ? "is-active" : ""}><span />{step}</li>)}</ol>
  </div>
);
