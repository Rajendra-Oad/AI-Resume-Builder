export const FormField = ({ error, id, label, children, hint }) => (
  <div className="form-field">
    <label htmlFor={id}>{label}</label>
    {children}
    {hint && <small>{hint}</small>}
    {error && (
      <p id={`${id}-error`} className="field-error" role="alert">
        {error}
      </p>
    )}
  </div>
);
