import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../components/Button";
import { resetPassword } from "../features/auth/api/authApi";

export const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("This reset link is invalid or incomplete.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setComplete(true);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <section className="auth-card">
      <p className="eyebrow">ACCOUNT RECOVERY</p>
      <h1>Choose a new password</h1>
      {complete ? (
        <>
          <p className="form-success">Your password has been reset. You can now sign in.</p>
          <p className="auth-switch">
            <Link to="/login">Go to sign in</Link>
          </p>
        </>
      ) : (
        <form className="recovery-form" onSubmit={submit}>
          <label htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength="12"
            placeholder="At least 12 characters"
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="full-width" disabled={loading}>
            {loading ? "Resetting…" : "Reset password"}
          </Button>
        </form>
      )}
    </section>
  );
};
