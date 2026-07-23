import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "../../../components/Button";
import { FormField } from "../../../components/FormField";
import { Input } from "../../../components/Input";
import { useAuth } from "../../../context/AuthContext";
import { login, register as registerAccount } from "../api/authApi";

export const AuthForm = ({ mode }) => {
  const isRegister = mode === "register";
  const [apiError,setApiError]=useState("");
  const {register,handleSubmit,formState:{errors,isSubmitting}}=useForm({defaultValues:{email:"",phone:"",password:"",firstName:"",lastName:""}});
  const {signIn}=useAuth();const navigate=useNavigate();
  const submit=async(values)=>{setApiError("");try{if(isRegister){await registerAccount(values);navigate("/verify-email-sent",{state:{email:values.email}});return;}const session=await login(values);signIn(session);navigate("/dashboard");}catch(error){setApiError(error.message);}};
  return <section className="auth-card"><p className="eyebrow">{isRegister?"START BUILDING":"WELCOME BACK"}</p><h1>{isRegister?"Create your account":"Sign in to your workspace"}</h1><p className="muted">{isRegister?"Build a polished resume that gets noticed.":"Your next opportunity is waiting."}</p><form onSubmit={handleSubmit(submit)} noValidate>{isRegister&&<div className="name-fields"><FormField id="firstName" label="First name" error={errors.firstName?.message}><Input id="firstName" placeholder="Alex" {...register("firstName",{required:"First name is required.",maxLength:{value:100,message:"Use 100 characters or fewer."}})}/></FormField><FormField id="lastName" label="Last name" error={errors.lastName?.message}><Input id="lastName" placeholder="Morgan" {...register("lastName",{required:"Last name is required.",maxLength:{value:100,message:"Use 100 characters or fewer."}})}/></FormField></div>}<FormField id="email" label={isRegister?"Email address":"Email or verified phone number"} error={errors.email?.message}><Input id="email" type={isRegister?"email":"text"} placeholder={isRegister?"you@example.com":"you@example.com or +91 98765 43210"} {...register("email",{required:"Email or phone is required."})}/></FormField>{isRegister&&<FormField id="phone" label="Mobile number" hint="Optional. Verify it from Profile to enable phone sign-in." error={errors.phone?.message}><Input id="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" {...register("phone",{pattern:{value:/^[+0-9 ()-]{10,20}$/,message:"Enter a valid phone number."}})}/></FormField>}<FormField id="password" label="Password" error={errors.password?.message}><Input id="password" type="password" placeholder="At least 12 characters" {...register("password",{required:"Password is required.",minLength:{value:12,message:"Use at least 12 characters."}})}/></FormField>{apiError&&<p className="form-error" role="alert">{apiError}</p>}<Button type="submit" className="full-width" disabled={isSubmitting}>{isSubmitting?"Please wait…":isRegister?"Create account":"Sign in"}</Button></form>{!isRegister&&<p className="auth-switch auth-switch--recovery"><Link to="/forgot-password">Forgot your password?</Link></p>}<p className="auth-switch">{isRegister?"Already have an account?":"New to resume?"} <Link to={isRegister?"/login":"/register"}>{isRegister?"Sign in":"Create an account"}</Link></p></section>;
};
