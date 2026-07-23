const variants = {
  primary: "bg-brand text-white hover:bg-brand-hover",
  secondary: "bg-brand-soft text-brand hover:bg-brand-soft/70",
  ghost: "bg-transparent text-brand hover:bg-brand-soft",
  destructive: "bg-danger text-white hover:bg-danger-strong",
};

export const Button = ({ children, className = "", variant = "primary", ...props }) => (
  <button
    className={`button inline-flex cursor-pointer items-center justify-center gap-2 rounded-control border-0 px-4.5 py-3 font-bold transition motion-safe:hover:-translate-y-px disabled:cursor-wait disabled:opacity-65 ${variants[variant] ?? variants.primary} ${className}`.trim()}
    {...props}
  >
    {children}
  </button>
);
