import { useState } from "react";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { FormField } from "../../../components/FormField";
import { Input } from "../../../components/Input";
import { ModulePage } from "../../../components/ModulePage";
import { changePassword } from "../../auth/api/authApi";
export const SettingsForm = () => {
  const [values, setValues] = useState({ currentPassword: "", newPassword: "" });
  const [state, setState] = useState({ loading: false, message: "", error: "" });
  const submit = async (event) => {
    event.preventDefault();
    if (values.newPassword.length < 12) {
      setState({
        loading: false,
        message: "",
        error: "New password must contain at least 12 characters.",
      });
      return;
    }
    setState({ loading: true, message: "", error: "" });
    try {
      await changePassword(values);
      setValues({ currentPassword: "", newPassword: "" });
      setState({ loading: false, message: "Password changed successfully.", error: "" });
    } catch (error) {
      setState({ loading: false, message: "", error: error.message });
    }
  };
  return (
    <ModulePage
      eyebrow="PREFERENCES"
      title="Settings"
      description="Manage account security and workspace preferences."
    >
      <Card>
        <form onSubmit={submit}>
          <h2>Change password</h2>
          <FormField id="currentPassword" label="Current password">
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={values.currentPassword}
              onChange={(event) => setValues({ ...values, currentPassword: event.target.value })}
              required
            />
          </FormField>
          <FormField id="newPassword" label="New password" hint="Use at least 12 characters.">
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={values.newPassword}
              onChange={(event) => setValues({ ...values, newPassword: event.target.value })}
              required
            />
          </FormField>
          {state.error && (
            <p className="form-error" role="alert">
              {state.error}
            </p>
          )}
          {state.message && <p role="status">{state.message}</p>}
          <Button disabled={state.loading}>
            {state.loading ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Card>
    </ModulePage>
  );
};
