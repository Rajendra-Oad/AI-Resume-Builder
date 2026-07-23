import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { FormField } from "../../../components/FormField";
import { Input } from "../../../components/Input";
import { ModulePage } from "../../../components/ModulePage";
import { changePassword } from "../../auth/api/authApi";
export const SettingsForm=()=>{const [result,setResult]=useState({message:"",error:""});const {register,handleSubmit,reset,formState:{errors,isSubmitting}}=useForm({defaultValues:{currentPassword:"",newPassword:""}});const submit=async(values)=>{setResult({message:"",error:""});try{await changePassword(values);reset();setResult({message:"Password changed successfully.",error:""});}catch(error){setResult({message:"",error:error.message});}};return <ModulePage eyebrow="PREFERENCES" title="Settings" description="Manage account security and workspace preferences."><Card><form onSubmit={handleSubmit(submit)} noValidate><h2>Change password</h2><FormField id="currentPassword" label="Current password" error={errors.currentPassword?.message}><Input id="currentPassword" type="password" autoComplete="current-password" {...register("currentPassword",{required:"Current password is required."})}/></FormField><FormField id="settingsNewPassword" label="New password" hint="Use at least 12 characters." error={errors.newPassword?.message}><Input id="settingsNewPassword" type="password" autoComplete="new-password" {...register("newPassword",{required:"New password is required.",minLength:{value:12,message:"Use at least 12 characters."}})}/></FormField>{result.error&&<p className="form-error" role="alert">{result.error}</p>}{result.message&&<p role="status">{result.message}</p>}<Button disabled={isSubmitting}>{isSubmitting?"Updating…":"Update password"}</Button></form></Card></ModulePage>;};
