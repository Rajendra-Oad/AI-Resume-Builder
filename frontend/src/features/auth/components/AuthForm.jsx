import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../../components/Button";
import { FormField } from "../../../components/FormField";
import { useAuth } from "../../../context/AuthContext";
import { login, register } from "../api/authApi";

export const AuthForm = ({ mode }) => {
  const isRegister = mode === "register";
  const [values, setValues] = useState({ email: "", password: "", firstName: "", lastName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const update = (event) =>
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await (isRegister ? register(values) : login(values));
      signIn(session);
      navigate("/dashboard");
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <section className="auth-card">
      <p className="eyebrow">{isRegister ? "START BUILDING" : "WELCOME BACK"}</p>
      <h1>{isRegister ? "Create your account" : "Sign in to your workspace"}</h1>
      <p className="muted">
        {isRegister
          ? "Build a polished resume that gets noticed."
          : "Your next opportunity is waiting."}
      </p>
      <form onSubmit={submit} noValidate>
        {isRegister && (
          <div className="name-fields">
            <FormField id="firstName" label="First name">
              <input
                id="firstName"
                name="firstName"
                value={values.firstName}
                onChange={update}
                required
                placeholder="Alex"
              />
            </FormField>
            <FormField id="lastName" label="Last name">
              <input
                id="lastName"
                name="lastName"
                value={values.lastName}
                onChange={update}
                required
                placeholder="Morgan"
              />
            </FormField>
          </div>
        )}
        <FormField id="email" label="Email address">
          <input
            id="email"
            name="email"
            value={values.email}
            onChange={update}
            type="email"
            required
            placeholder="you@example.com"
          />
        </FormField>
        <FormField id="password" label="Password">
          <input
            id="password"
            name="password"
            value={values.password}
            onChange={update}
            type="password"
            required
            minLength="12"
            placeholder="At least 12 characters"
          />
        </FormField>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="full-width" disabled={loading}>
          {loading ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
        </Button>
      </form>
      {!isRegister && (
        <p className="auth-switch auth-switch--recovery">
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
      )}
      <p className="auth-switch">
        {isRegister ? "Already have an account?" : "New to resume?"}{" "}
        <Link to={isRegister ? "/login" : "/register"}>
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </section>
  );
};
