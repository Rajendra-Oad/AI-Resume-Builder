export const Skeleton = ({ className = "", label = "Loading content" }) => (
  <div
    className={`skeleton min-h-20 animate-pulse rounded-control bg-border ${className}`.trim()}
    role="status"
    aria-label={label}
  />
);

export const SkeletonLine = ({ width = "100%", className = "" }) => (
  <span
    className={`skeleton skeleton--line ${className}`.trim()}
    style={{ width }}
    aria-hidden="true"
  />
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
        <span className="skeleton-list__copy">
          <SkeletonLine width="48%" className="skeleton--heading" />
          <SkeletonLine />
          <SkeletonLine width="64%" />
        </span>
        <SkeletonLine width="88px" className="skeleton--button" />
      </div>
    ))}
  </div>
);

export const FormSkeleton = ({ fields = 4, className = "" }) => (
  <div className={`card skeleton-form ${className}`.trim()} role="status" aria-label="Loading form">
    <SkeletonLine width="34%" className="skeleton--heading" />
    <SkeletonLine width="72%" />
    <div className="skeleton-form__fields" aria-hidden="true">
      {Array.from({ length: fields }, (_, index) => (
        <div className="skeleton-field" key={index}>
          <SkeletonLine width={index % 2 ? "42%" : "31%"} />
          <span className="skeleton skeleton--control" />
        </div>
      ))}
    </div>
    <SkeletonLine width="132px" className="skeleton--button" />
  </div>
);

export const MetricSkeleton = ({ count = 3 }) => (
  <div className="card metric-grid skeleton-metrics" role="status" aria-label="Loading usage">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} aria-hidden="true">
        <SkeletonLine width="54%" />
        <SkeletonLine width="76%" className="skeleton--heading" />
      </div>
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="card skeleton-table" role="status" aria-label="Loading table">
    {Array.from({ length: rows + 1 }, (_, row) => (
      <div
        className="skeleton-table__row"
        style={{ "--skeleton-columns": columns }}
        key={row}
        aria-hidden="true"
      >
        {Array.from({ length: columns }, (__, column) => (
          <SkeletonLine
            key={column}
            width={row === 0 ? "55%" : column === 0 ? "82%" : "68%"}
            className={row === 0 ? "" : column === 0 ? "skeleton--heading" : ""}
          />
        ))}
      </div>
    ))}
  </div>
);

export const DetailSkeleton = ({ rows = 3, className = "" }) => (
  <div
    className={`card skeleton-detail ${className}`.trim()}
    role="status"
    aria-label="Loading details"
  >
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} aria-hidden="true">
        <SkeletonLine width="24%" />
        <SkeletonLine width={index === 1 ? "88%" : "58%"} className="skeleton--heading" />
      </div>
    ))}
    <SkeletonLine width="150px" className="skeleton--button" />
  </div>
);

export const SectionListSkeleton = ({ count = 3 }) => (
  <div className="typed-section-list" role="status" aria-label="Loading sections">
    {Array.from({ length: count }, (_, index) => (
      <div className="card skeleton-section" key={index} aria-hidden="true">
        <span>
          <SkeletonLine width="86px" />
          <SkeletonLine width="46%" className="skeleton--heading" />
          <SkeletonLine width="72%" />
        </span>
        <SkeletonLine width="180px" className="skeleton--button" />
      </div>
    ))}
  </div>
);

export const DocumentSkeleton = ({ className = "" }) => (
  <div
    className={`resume-live-preview skeleton-document ${className}`.trim()}
    role="status"
    aria-label="Loading resume preview"
  >
    <div aria-hidden="true">
      <SkeletonLine width="46%" className="skeleton--title" />
      <SkeletonLine width="30%" />
      <SkeletonLine width="58%" />
      <span className="skeleton-document__rule" />
      {[0, 1, 2].map((section) => (
        <section key={section}>
          <SkeletonLine width="25%" className="skeleton--heading" />
          <SkeletonLine />
          <SkeletonLine width="94%" />
          <SkeletonLine width="78%" />
        </section>
      ))}
    </div>
  </div>
);

export const AiJobSkeleton = ({
  title = "AI is preparing your result",
  steps = ["Reading your input", "Building a focused draft", "Finishing the response"],
}) => (
  <div className="ai-job-skeleton" role="status" aria-live="polite" aria-label={title}>
    <div className="ai-job-skeleton__heading">
      <span className="ai-job-skeleton__mark" aria-hidden="true">
        ✦
      </span>
      <div>
        <strong>{title}</strong>
        <span>This may take a moment. You can keep this page open.</span>
      </div>
    </div>
    <div className="ai-job-skeleton__document" aria-hidden="true">
      <SkeletonLine width="72%" className="skeleton--heading" />
      <SkeletonLine />
      <SkeletonLine width="94%" />
      <SkeletonLine width="86%" />
      <SkeletonLine />
      <SkeletonLine width="63%" />
    </div>
    <ol className="ai-job-steps">
      {steps.map((step, index) => (
        <li key={step} className={index === 0 ? "is-active" : ""}>
          <span />
          {step}
        </li>
      ))}
    </ol>
  </div>
);
