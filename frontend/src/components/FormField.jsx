import { CircleAlert } from "lucide-react";

export const FormField = ({ error, id, label, children, hint }) => (
  <div className="form-field mb-4.5">
    <label className="mb-2 block text-sm font-bold" htmlFor={id}>{label}</label>
    {children}
    {hint && <small className="text-ink-subtle">{hint}</small>}
    {error && (
      <p id={`${id}-error`} className="field-error mt-2 flex items-start gap-1.5 text-sm text-danger-strong" role="alert">
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{error}</span>
      </p>
    )}
  </div>
);
