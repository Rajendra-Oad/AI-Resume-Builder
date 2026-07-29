export const Card = ({ children, className = "", ...props }) => (
  <section className={`card rounded-card border border-border bg-surface p-6 shadow-card ${className}`.trim()} {...props}>
    {children}
  </section>
);
