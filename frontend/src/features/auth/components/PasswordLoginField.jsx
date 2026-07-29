import { Eye, EyeOff, KeyRound, TriangleAlert } from "lucide-react";
import { useState } from "react";

export const PasswordLoginField = ({ register, error }) => {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const updateCapsLock = (event) =>
    setCapsLock(event.getModifierState?.("CapsLock") ?? false);

  return (
    <div className="password-login-field">
      <label htmlFor="password">Password</label>
      <div className={`password-input-wrap ${error ? "has-error" : ""}`}>
        <KeyRound className="password-leading-icon" aria-hidden="true" />
        <input
          id="password"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          autoCapitalize="none"
          spellCheck="false"
          placeholder="Enter your password"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "password-error" : capsLock ? "password-caps-lock" : undefined}
          {...register("password", { required: "Password is required." })}
          onKeyDown={updateCapsLock}
          onKeyUp={updateCapsLock}
          onBlur={() => setCapsLock(false)}
        />
        <button
          type="button"
          className="password-visibility"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Conceal entry" : "Reveal entry"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
      {capsLock && (
        <p id="password-caps-lock" className="password-caps" role="status">
          <TriangleAlert aria-hidden="true" /> Caps Lock is on.
        </p>
      )}
      {error && <p id="password-error" className="password-field-error" role="alert">{error}</p>}
    </div>
  );
};
