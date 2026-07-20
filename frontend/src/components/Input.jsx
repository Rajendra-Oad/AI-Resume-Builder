export const Input = ({ className = "", ...props }) => (
  <input className={`input ${className}`.trim()} {...props} />
);
