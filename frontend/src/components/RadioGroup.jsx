export const RadioGroup = ({ legend, name, options, value, onChange }) => (
  <fieldset className="radio-group">
    <legend>{legend}</legend>
    {options.map((option) => (
      <label className="choice" key={option.value}>
        <input
          type="radio"
          name={name}
          value={option.value}
          checked={value === option.value}
          onChange={onChange}
        />
        <span>{option.label}</span>
      </label>
    ))}
  </fieldset>
);
