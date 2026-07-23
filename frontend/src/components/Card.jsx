export const Card = ({ children, className = "" }) => (
  <section className={`card rounded-card border border-border bg-surface p-6 shadow-card ${className}`.trim()}>
    {children}
  </section>
);
