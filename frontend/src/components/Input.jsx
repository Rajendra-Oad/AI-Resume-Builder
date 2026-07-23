export const Input = ({ className = "", ...props }) => (
  <input
    className={`input w-full rounded-control border border-border bg-surface px-3 py-3 text-ink outline-none focus:border-brand focus:ring-3 focus:ring-brand/15 ${className}`.trim()}
    {...props}
  />
);
