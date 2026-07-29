import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";

import { Button } from "../../../components/Button";
import { resetPassword } from "../api/authApi";
import { PasswordCreationFields } from "./PasswordCreationFields";

export const ResetPasswordForm = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [tokenError, setTokenError] = useState("");
  const reset = useMutation({ mutationFn: (password) => resetPassword(token, password) });
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    mode: "onChange",
    defaultValues: { password: "", confirmPassword: "" },
  });
  const submit = ({ password }) => {
    setTokenError("");
    if (!token) {
      setTokenError("This reset link is invalid or incomplete.");
      return;
    }
    reset.mutate(password);
  };
  return <section className="auth-card auth-card--password">
    <p className="eyebrow">ACCOUNT RECOVERY</p>
    <h1>Choose a new password</h1>
    <p className="muted">Make it long, unique, and easy for your password manager to remember.</p>
    {reset.isSuccess ? <>
      <p className="form-success">Your password has been reset. You can now sign in.</p>
      <p className="auth-switch"><Link to="/login">Go to sign in</Link></p>
    </> : <form className="recovery-form" onSubmit={handleSubmit(submit)} noValidate>
      <PasswordCreationFields register={register} setValue={setValue} password={watch("password")} confirmPassword={watch("confirmPassword")} passwordId="newPassword" label="New password" errors={errors} />
      {(tokenError || reset.error) && <p className="form-error" role="alert">{tokenError || reset.error.message}</p>}
      <Button type="submit" className="full-width" disabled={reset.isPending}>{reset.isPending ? "Resetting…" : "Reset password"}</Button>
    </form>}
  </section>;
};
