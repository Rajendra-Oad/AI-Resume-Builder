export const Button = ({ children, className = "", variant = "primary", ...props }) => (
  <button className={`button button--${variant} ${className}`} {...props}>
    {children}
  </button>
);
