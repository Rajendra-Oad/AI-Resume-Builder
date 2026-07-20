export const Checkbox = ({ id, label, ...props }) => (
  <label className="choice" htmlFor={id}>
    <input id={id} type="checkbox" {...props} />
    <span>{label}</span>
  </label>
);
