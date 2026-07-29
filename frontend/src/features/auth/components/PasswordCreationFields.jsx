import { gsap } from "gsap";
import {
  Check, CircleCheck, CircleX, Copy, Diamond, Eye, EyeOff,
  KeyRound, ShieldCheck, Sparkles, TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { notify } from "../../../components/NotificationProvider";
import { checkPasswordBreach } from "../api/passwordBreachApi";
import {
  evaluatePassword, generateStrongPassword, isBasedOnEmail,
  isCommonPassword, PASSWORD_MAX_LENGTH,
} from "../utils/passwordSecurity";

const strengthIcons = [CircleX, TriangleAlert, ShieldCheck, ShieldCheck, CircleCheck, Diamond];

export const PasswordCreationFields = ({
  register,
  setValue,
  password = "",
  confirmPassword = "",
  email = "",
  passwordName = "password",
  confirmName = "confirmPassword",
  passwordId = "password",
  label = "Password",
  errors = {},
  showConfirm = true,
}) => {
  const [visible, setVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [breachCount, setBreachCount] = useState(0);
  const [checkingBreach, setCheckingBreach] = useState(false);
  const meterRef = useRef(null);
  const checklistRef = useRef(null);
  const strength = useMemo(() => evaluatePassword(password, email), [email, password]);
  const passwordsMatch = Boolean(confirmPassword) && password === confirmPassword;
  const breachEnabled = import.meta.env.VITE_PASSWORD_BREACH_CHECK === "true";

  const checks = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Recommended 12+ characters", met: password.length >= 12 },
    { label: "Not commonly used", met: Boolean(password) && !isCommonPassword(password) },
    { label: "Not based on your email", met: Boolean(password) && !isBasedOnEmail(password, email) },
    { label: "Strong enough", met: strength.strongEnough && !breachCount },
  ];

  useEffect(() => {
    if (!meterRef.current) return;
    gsap.to(meterRef.current, {
      width: `${strength.percent}%`,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.45,
      ease: "power2.out",
    });
  }, [strength.percent]);

  useEffect(() => {
    if (!checklistRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(
      checklistRef.current.querySelectorAll(".password-check--met"),
      { scale: 0.96 },
      { scale: 1, duration: 0.25, stagger: 0.025, ease: "back.out(1.5)" },
    );
  }, [password, email]);

  useEffect(() => {
    setBreachCount(0);
    if (!breachEnabled || password.length < 8) return undefined;
    const controller = new globalThis.AbortController();
    const timer = window.setTimeout(async () => {
      setCheckingBreach(true);
      try {
        setBreachCount(await checkPasswordBreach(password, { signal: controller.signal }));
      } catch (error) {
        if (error.name !== "AbortError") setBreachCount(0);
      } finally {
        if (!controller.signal.aborted) setCheckingBreach(false);
      }
    }, 650);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [breachEnabled, password]);

  const registerOptions = {
    required: "Password is required.",
    minLength: { value: 8, message: "Password must be at least 8 characters." },
    maxLength: { value: PASSWORD_MAX_LENGTH, message: "Password must be 128 characters or fewer." },
    validate: {
      notCommon: (value) => !isCommonPassword(value) || "Choose a less commonly used password.",
      notBreached: () => !breachCount || "This password appears in known data breaches. Please choose another.",
    },
  };
  const StrengthIcon = strengthIcons[strength.score];

  const generate = async () => {
    const generated = generateStrongPassword();
    setValue(passwordName, generated, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    if (showConfirm) setValue(confirmName, generated, { shouldDirty: true, shouldValidate: true });
    try {
      await globalThis.navigator.clipboard.writeText(generated);
      notify.success({ title: "Strong password generated", message: "Copied to your clipboard and filled in." });
    } catch {
      notify.success({ title: "Strong password generated", message: "Filled in. You can copy it from the field." });
    }
  };

  const inputEvents = {
    onKeyDown: (event) => setCapsLock(event.getModifierState?.("CapsLock") ?? false),
    onKeyUp: (event) => setCapsLock(event.getModifierState?.("CapsLock") ?? false),
    onBlur: () => setCapsLock(false),
  };

  return (
    <div className={`password-creator password-creator--${strength.tone}`}>
      <div className="password-heading">
        <label htmlFor={passwordId}>{label}</label>
        <button type="button" className="password-generate" onClick={generate}>
          <Sparkles aria-hidden="true" /> Generate strong password
        </button>
      </div>
      <div className={`password-input-wrap ${errors[passwordName] ? "has-error" : ""} ${strength.strongEnough ? "is-success" : ""}`}>
        <KeyRound className="password-leading-icon" aria-hidden="true" />
        <input
          id={passwordId}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          autoCapitalize="none"
          spellCheck="false"
          maxLength={PASSWORD_MAX_LENGTH}
          aria-invalid={Boolean(errors[passwordName])}
          aria-describedby={`${passwordId}-feedback`}
          placeholder="Use 12+ characters or a passphrase"
          {...register(passwordName, registerOptions)}
          {...inputEvents}
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
      {capsLock && <p className="password-caps" role="status"><TriangleAlert aria-hidden="true" /> Caps Lock is on.</p>}
      {errors[passwordName] && <p className="password-field-error" role="alert"><CircleX aria-hidden="true" />{errors[passwordName].message}</p>}

      <div id={`${passwordId}-feedback`} className="password-strength" aria-live="polite">
        <div className="password-strength__label">
          <span><StrengthIcon aria-hidden="true" /> {strength.label}</span>
          <small>{password.length}/{PASSWORD_MAX_LENGTH}</small>
        </div>
        <div className="password-meter" role="progressbar" aria-label="Password strength" aria-valuemin="0" aria-valuemax="100" aria-valuenow={strength.percent}>
          <span ref={meterRef} />
        </div>
        <p>{strength.strongEnough ? "Great! This password is strong." : password.length < 12 ? "Longer passwords are stronger. Try a memorable passphrase." : "Use a unique password you do not use elsewhere."}</p>
      </div>

      <ul ref={checklistRef} className="password-checklist" aria-label="Password requirements">
        {checks.map((check) => (
          <li key={check.label} className={check.met ? "password-check--met" : ""}>
            <span aria-hidden="true">{check.met ? <Check /> : <span />}</span>{check.label}
          </li>
        ))}
      </ul>
      {checkingBreach && <p className="password-breach-note" role="status">Checking against known breached passwords…</p>}
      {breachCount > 0 && <p className="password-breach-warning" role="alert"><TriangleAlert aria-hidden="true" />This password has appeared in a known data breach. Choose another.</p>}

      {showConfirm && (
        <div className="password-confirm">
          <label htmlFor={`${passwordId}-confirm`}>Confirm password</label>
          <div className={`password-input-wrap ${confirmPassword ? (passwordsMatch ? "is-success" : "has-error") : ""}`}>
            {passwordsMatch ? <CircleCheck className="password-leading-icon" aria-hidden="true" /> : <Copy className="password-leading-icon" aria-hidden="true" />}
            <input
              id={`${passwordId}-confirm`}
              type={confirmVisible ? "text" : "password"}
              autoComplete="new-password"
              autoCapitalize="none"
              spellCheck="false"
              maxLength={PASSWORD_MAX_LENGTH}
              aria-invalid={Boolean(confirmPassword && !passwordsMatch)}
              {...register(confirmName, {
                required: "Please confirm your password.",
                validate: (value) => value === password || "Passwords do not match.",
              })}
              {...inputEvents}
            />
            <button type="button" className="password-visibility" onClick={() => setConfirmVisible((current) => !current)} aria-label={confirmVisible ? "Hide confirmation password" : "Show confirmation password"}>
              {confirmVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>
          {confirmPassword && <p className={`password-match ${passwordsMatch ? "is-match" : ""}`} role="status">{passwordsMatch ? <CircleCheck aria-hidden="true" /> : <CircleX aria-hidden="true" />}{passwordsMatch ? "Passwords match" : "Passwords do not match"}</p>}
          {errors[confirmName] && !confirmPassword && <p className="password-field-error" role="alert"><CircleX aria-hidden="true" />{errors[confirmName].message}</p>}
        </div>
      )}
    </div>
  );
};
