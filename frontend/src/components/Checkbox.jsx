export const Checkbox = ({ id, label, ...props }) => (
  <label className="choice flex min-h-11 items-center gap-2.5" htmlFor={id}>
    <input className="w-auto" id={id} type="checkbox" {...props} />
    <span>{label}</span>
  </label>
);
