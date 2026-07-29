import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { FormField } from "../../../components/FormField";
import { Input } from "../../../components/Input";
import { ModulePage } from "../../../components/ModulePage";
import { changePassword } from "../../auth/api/authApi";
import { PasswordCreationFields } from "../../auth/components/PasswordCreationFields";

export const SettingsForm = () => {
  const [result, setResult] = useState({ message: "", error: "" });
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm({
    mode: "onChange",
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const submit = async ({ currentPassword, newPassword }) => {
    setResult({ message: "", error: "" });
    try {
      await changePassword({ currentPassword, newPassword });
      reset();
      setResult({ message: "Password changed successfully.", error: "" });
    } catch (error) {
      setResult({ message: "", error: error.message });
    }
  };
  return <ModulePage eyebrow="PREFERENCES" title="Settings" description="Manage account security and workspace preferences.">
    <Card className="settings-password-card"><form onSubmit={handleSubmit(submit)} noValidate>
      <h2>Change password</h2>
      <p className="muted">Choose a long, unique password you do not use anywhere else.</p>
      <FormField id="currentPassword" label="Current password" error={errors.currentPassword?.message}><Input id="currentPassword" type="password" autoComplete="current-password" {...register("currentPassword", { required: "Current password is required." })} /></FormField>
      <PasswordCreationFields register={register} setValue={setValue} password={watch("newPassword")} confirmPassword={watch("confirmPassword")} passwordName="newPassword" passwordId="settingsNewPassword" label="New password" errors={errors} />
      {result.error && <p className="form-error" role="alert">{result.error}</p>}
      {result.message && <p className="form-success" role="status">{result.message}</p>}
      <Button disabled={isSubmitting}>{isSubmitting ? "Updating…" : "Update password"}</Button>
    </form></Card>
  </ModulePage>;
};
