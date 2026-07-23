export const RadioGroup = ({ legend, name, options, value, onChange }) => (
  <fieldset className="radio-group mb-4.5 border-0 p-0">
    <legend className="mb-1.5 font-bold">{legend}</legend>
    {options.map((option) => (
      <label className="choice flex min-h-11 items-center gap-2.5" key={option.value}>
        <input
          className="w-auto"
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
