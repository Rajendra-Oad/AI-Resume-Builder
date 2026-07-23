import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { Button } from "../../../components/Button";
import { FormField } from "../../../components/FormField";
import { Input } from "../../../components/Input";
import { forgotPassword } from "../api/authApi";
export const ForgotPasswordForm=()=>{const request=useMutation({mutationFn:forgotPassword});const {register,handleSubmit,formState:{errors}}=useForm({defaultValues:{email:""}});return <section className="auth-card"><p className="eyebrow">ACCOUNT RECOVERY</p><h1>Reset your password</h1><p className="muted">Enter your account email and we will send a reset link.</p>{request.isSuccess?<p className="form-success">If an account exists for that address, a reset link has been sent.</p>:<form className="recovery-form" onSubmit={handleSubmit(({email})=>request.mutate(email))} noValidate><FormField id="recoveryEmail" label="Email address" error={errors.email?.message}><Input id="recoveryEmail" type="email" placeholder="you@example.com" {...register("email",{required:"Email is required.",pattern:{value:/^[^\s@]+@[^\s@]+\.[^\s@]+$/,message:"Enter a valid email address."}})}/></FormField>{request.error&&<p className="form-error" role="alert">{request.error.message}</p>}<Button type="submit" className="full-width" disabled={request.isPending}>{request.isPending?"Sending…":"Send reset link"}</Button></form>}<p className="auth-switch"><Link to="/login">Back to sign in</Link></p></section>;};
