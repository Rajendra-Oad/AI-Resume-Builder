import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import { Button } from "../../../components/Button";
import { FormField } from "../../../components/FormField";
import { Input } from "../../../components/Input";
import { resendVerification, verifyEmail } from "../api/authApi";

export const VerifyEmailForm = ({ sent = false }) => {
  const [params] = useSearchParams();
  const location = useLocation();
  const token = params.get("token") ?? "";
  const verification = useMutation({ mutationFn: () => verifyEmail(token) });
  const resend = useMutation({ mutationFn: resendVerification });
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { email: location.state?.email ?? "" } });

  if (sent) {
    return <section className="auth-card"><p className="eyebrow">CHECK YOUR INBOX</p><h1>Verify your email</h1><p className="muted">We sent a verification link to {location.state?.email ?? "your email address"}. Open it to activate your account.</p>{resend.isSuccess ? <p className="form-success">If the account is awaiting verification, a new link has been sent.</p> : <form className="recovery-form" onSubmit={handleSubmit(({ email }) => resend.mutate(email))} noValidate><FormField id="resendEmail" label="Email address" error={errors.email?.message}><Input id="resendEmail" type="email" {...register("email", { required: "Email is required.", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email address." } })} /></FormField>{resend.error && <p className="form-error" role="alert">{resend.error.message}</p>}<Button type="submit" className="full-width" disabled={resend.isPending}>{resend.isPending ? "Sending…" : "Resend verification link"}</Button></form>}<p className="auth-switch"><Link to="/login">Back to sign in</Link></p></section>;
  }

  return <section className="auth-card"><p className="eyebrow">EMAIL VERIFICATION</p><h1>Activate your account</h1>{verification.isSuccess ? <><p className="form-success">Your email is verified. You can now sign in.</p><p className="auth-switch"><Link to="/login">Go to sign in</Link></p></> : <><p className="muted">Confirm your email address to activate your account.</p>{!token ? <p className="form-error" role="alert">This verification link is invalid or incomplete.</p> : <Button className="full-width" onClick={() => verification.mutate()} disabled={verification.isPending}>{verification.isPending ? "Verifying…" : "Verify email"}</Button>}{verification.error && <p className="form-error" role="alert">{verification.error.message}</p>}</>}</section>;
};
