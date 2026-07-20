export const Textarea = ({ className = "", ...props }) => (
  <textarea className={`textarea ${className}`.trim()} {...props} />
);
