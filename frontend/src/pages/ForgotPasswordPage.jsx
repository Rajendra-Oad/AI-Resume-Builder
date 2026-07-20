import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { forgotPassword } from "../features/auth/api/authApi";

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <section className="auth-card">
      <p className="eyebrow">ACCOUNT RECOVERY</p>
      <h1>Reset your password</h1>
      <p className="muted">Enter your account email and we will send a reset link.</p>
      {sent ? (
        <p className="form-success">
          If an account exists for that address, a reset link has been sent.
        </p>
      ) : (
        <form className="recovery-form" onSubmit={submit}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="you@example.com"
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="full-width" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
      <p className="auth-switch">
        <Link to="/login">Back to sign in</Link>
      </p>
    </section>
  );
};
