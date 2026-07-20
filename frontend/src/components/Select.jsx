export const Select = ({ className = "", children, ...props }) => (
  <select className={`input ${className}`.trim()} {...props}>
    {children}
  </select>
);
