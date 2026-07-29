const variants = {
  primary: "primary",
  secondary: "secondary",
  ghost: "ghost",
  destructive: "destructive",
};

export const Button = ({ children, className = "", variant = "primary", ...props }) => (
  <button
    className={`button button--${variants[variant] ?? variants.primary} ${className}`.trim()}
    {...props}
  >
    {children}
  </button>
);
