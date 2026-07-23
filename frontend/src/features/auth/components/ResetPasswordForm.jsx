import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link,useSearchParams } from "react-router-dom";

import { Button } from "../../../components/Button";
import { FormField } from "../../../components/FormField";
import { Input } from "../../../components/Input";
import { resetPassword } from "../api/authApi";
export const ResetPasswordForm=()=>{const [params]=useSearchParams();const token=params.get("token")??"";const [tokenError,setTokenError]=useState("");const reset=useMutation({mutationFn:(password)=>resetPassword(token,password)});const {register,handleSubmit,formState:{errors}}=useForm({defaultValues:{password:""}});const submit=({password})=>{setTokenError("");if(!token){setTokenError("This reset link is invalid or incomplete.");return;}reset.mutate(password);};return <section className="auth-card"><p className="eyebrow">ACCOUNT RECOVERY</p><h1>Choose a new password</h1>{reset.isSuccess?<><p className="form-success">Your password has been reset. You can now sign in.</p><p className="auth-switch"><Link to="/login">Go to sign in</Link></p></>:<form className="recovery-form" onSubmit={handleSubmit(submit)} noValidate><FormField id="newPassword" label="New password" error={errors.password?.message}><Input id="newPassword" type="password" placeholder="At least 12 characters" {...register("password",{required:"Password is required.",minLength:{value:12,message:"Use at least 12 characters."}})}/></FormField>{(tokenError||reset.error)&&<p className="form-error" role="alert">{tokenError||reset.error.message}</p>}<Button type="submit" className="full-width" disabled={reset.isPending}>{reset.isPending?"Resetting…":"Reset password"}</Button></form>}</section>;};
