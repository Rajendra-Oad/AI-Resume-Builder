import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AsyncState } from "../../../components/AsyncState";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Checkbox } from "../../../components/Checkbox";
import { FormField } from "../../../components/FormField";
import { Input } from "../../../components/Input";
import { RadioGroup } from "../../../components/RadioGroup";
import { Select } from "../../../components/Select";
import { FormSkeleton } from "../../../components/Skeleton";
import {
  deleteProviderCredential,
  getAiSettings,
  saveProviderCredential,
  updateAiSettings,
} from "../api/aiSettingsApi";

export const AiProviderSettings = () => {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["ai-settings"], queryFn: getAiSettings });
  const [form, setForm] = useState({
    mode: "PLATFORM",
    preferredProvider: "gemini",
    allowPlatformFallback: true,
  });
  const [apiKey, setApiKey] = useState("");
  const [state, setState] = useState({ loading: false, message: "", error: "" });
  useEffect(() => {
    if (query.data)
      setForm({
        mode: query.data.mode,
        preferredProvider: query.data.preferredProvider,
        allowPlatformFallback: query.data.allowPlatformFallback,
      });
  }, [query.data]);
  const refresh = (data) => {
    queryClient.setQueryData(["ai-settings"], data);
    setForm({
      mode: data.mode,
      preferredProvider: data.preferredProvider,
      allowPlatformFallback: data.allowPlatformFallback,
    });
  };
  const saveKey = async () => {
    if (!apiKey.trim()) return;
    setState({ loading: true, message: "", error: "" });
    try {
      refresh(await saveProviderCredential(form.preferredProvider, apiKey));
      setApiKey("");
      setState({
        loading: false,
        message: "API key encrypted and saved. It will not be shown again.",
        error: "",
      });
    } catch (error) {
      setState({ loading: false, message: "", error: error.message });
    }
  };
  const saveChoice = async (event) => {
    event.preventDefault();
    setState({ loading: true, message: "", error: "" });
    try {
      refresh(await updateAiSettings(form));
      setState({ loading: false, message: "AI provider choice updated.", error: "" });
    } catch (error) {
      setState({ loading: false, message: "", error: error.message });
    }
  };
  const remove = async () => {
    setState({ loading: true, message: "", error: "" });
    try {
      refresh(await deleteProviderCredential(form.preferredProvider));
      setState({
        loading: false,
        message: "Saved key removed. Platform AI mode is active.",
        error: "",
      });
    } catch (error) {
      setState({ loading: false, message: "", error: error.message });
    }
  };
  const credential = query.data?.credentials?.find(
    (item) => item.provider === form.preferredProvider,
  );
  return (
    <Card>
      <h2>AI connection</h2>
      <p className="muted">
        Use the platform AI allowance or securely connect your own provider account. Your key is
        encrypted on the server and is never displayed after saving.
      </p>
      <AsyncState
        isLoading={query.isLoading}
        error={query.error?.message}
        onRetry={query.refetch}
        fallback={<FormSkeleton fields={3} />}
      >
        <form onSubmit={saveChoice}>
          <RadioGroup
            legend="Who provides the API access?"
            name="aiMode"
            value={form.mode}
            onChange={(event) => setForm({ ...form, mode: event.target.value })}
            options={[
              { value: "PLATFORM", label: "Use platform AI" },
              { value: "BYOK", label: "Use my API key" },
            ]}
          />
          <FormField id="preferredProvider" label="Preferred provider">
            <Select
              id="preferredProvider"
              value={form.preferredProvider}
              onChange={(event) => setForm({ ...form, preferredProvider: event.target.value })}
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
            </Select>
          </FormField>
          {form.mode === "BYOK" && (
            <>
              <FormField
                id="providerApiKey"
                label={`${form.preferredProvider === "openai" ? "OpenAI" : "Gemini"} API key`}
                hint={
                  credential?.configured
                    ? `Saved key: ${credential.keyHint}`
                    : "The key is sent once over HTTPS and encrypted at rest."
                }
              >
                <Input
                  id="providerApiKey"
                  type="password"
                  autoComplete="off"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                />
              </FormField>
              <div className="form-actions">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={state.loading || !apiKey.trim()}
                  onClick={saveKey}
                >
                  {credential?.configured ? "Replace saved key" : "Save key securely"}
                </Button>
                {credential?.configured && (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={state.loading}
                    onClick={remove}
                  >
                    Remove key
                  </Button>
                )}
              </div>
              <Checkbox
                id="platformFallback"
                label="Use platform AI if my provider is unavailable"
                checked={form.allowPlatformFallback}
                onChange={(event) =>
                  setForm({ ...form, allowPlatformFallback: event.target.checked })
                }
              />
            </>
          )}{" "}
          {state.error && (
            <p className="form-error" role="alert">
              {state.error}
            </p>
          )}
          {state.message && (
            <p className="form-success" role="status">
              {state.message}
            </p>
          )}
          <Button disabled={state.loading}>Save AI choice</Button>
        </form>
      </AsyncState>
    </Card>
  );
};
