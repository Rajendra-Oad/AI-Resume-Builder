export const FormField = ({ error, id, label, children, hint }) => (
  <div className="form-field mb-4.5">
    <label className="mb-2 block text-sm font-bold" htmlFor={id}>{label}</label>
    {children}
    {hint && <small className="text-ink-subtle">{hint}</small>}
    {error && (
      <p id={`${id}-error`} className="field-error mt-2 text-sm text-danger-strong" role="alert">
        {error}
      </p>
    )}
  </div>
);
