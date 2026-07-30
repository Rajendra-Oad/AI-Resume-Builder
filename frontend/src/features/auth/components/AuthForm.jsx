import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "../../../components/Button";
import { FormField } from "../../../components/FormField";
import { useAuth } from "../../../context/AuthContext";
import { login, register as registerAccount } from "../api/authApi";
import { AuthInput } from "./AuthInput";
import { PasswordCreationFields } from "./PasswordCreationFields";
import { PasswordLoginField } from "./PasswordLoginField";

export const AuthForm = ({ mode }) => {
  const isRegister = mode === "register";
  const [apiError, setApiError] = useState("");
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    mode: "onChange",
    defaultValues: { email: "", phone: "", password: "", confirmPassword: "", firstName: "", lastName: "" },
  });
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const submit = async (values) => {
    setApiError("");
    try {
      if (isRegister) {
        const { confirmPassword: ignored, ...payload } = values;
        void ignored;
        await registerAccount(payload);
        navigate("/verify-email-sent", { state: { email: values.email } });
        return;
      }
      const session = await login(values);
      signIn(session);
      navigate("/dashboard");
    } catch (error) {
      const message = error.message || "We could not complete that request.";
      setApiError(message);
    }
  };

  return (
    <section className={`auth-card ${isRegister ? "auth-card--password" : ""}`}>
      <p className="eyebrow">{isRegister ? "START BUILDING" : "WELCOME BACK"}</p>
      <h1>{isRegister ? "Create your account" : "Sign in to your workspace"}</h1>
      <p className="muted">{isRegister ? "Build a polished resume that gets noticed." : "Your next opportunity is waiting."}</p>
      <form onSubmit={handleSubmit(submit)} noValidate>
        {isRegister && <div className="name-fields">
          <FormField id="firstName" label="First name" error={errors.firstName?.message}><AuthInput icon="user" id="firstName" autoComplete="given-name" placeholder="Alex" {...register("firstName", { required: "First name is required.", maxLength: { value: 100, message: "Use 100 characters or fewer." } })} /></FormField>
          <FormField id="lastName" label="Last name" error={errors.lastName?.message}><AuthInput icon="user" id="lastName" autoComplete="family-name" placeholder="Morgan" {...register("lastName", { required: "Last name is required.", maxLength: { value: 100, message: "Use 100 characters or fewer." } })} /></FormField>
        </div>}
        <FormField id="email" label="Email address" error={errors.email?.message}>
          <AuthInput id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register("email", { required: "Email is required." })} />
        </FormField>
        {isRegister && <FormField id="phone" label="Mobile number" hint="Optional contact information." error={errors.phone?.message}><AuthInput icon="phone" id="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" {...register("phone", { pattern: { value: /^[+0-9 ()-]{10,20}$/, message: "Enter a valid phone number." } })} /></FormField>}
        {isRegister
          ? <PasswordCreationFields register={register} setValue={setValue} password={watch("password")} confirmPassword={watch("confirmPassword")} email={watch("email")} errors={errors} />
          : <PasswordLoginField register={register} error={errors.password?.message} />}
        {apiError && <p className="form-error" role="alert">{apiError}</p>}
        <Button type="submit" className="full-width auth-submit-button" disabled={isSubmitting}>{isSubmitting ? "Please wait…" : isRegister ? "Create account" : "Sign in"}</Button>
      </form>
      {!isRegister && <p className="auth-switch auth-switch--recovery"><Link to="/forgot-password">Forgot your password?</Link></p>}
      <p className="auth-switch">{isRegister ? "Already have an account?" : "New to resume?"} <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create an account"}</Link></p>
    </section>
  );
};
