import { useEffect, useState } from "react";

import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { FormField } from "../../../components/FormField";
import { Input } from "../../../components/Input";
import { ModulePage } from "../../../components/ModulePage";
import { Select } from "../../../components/Select";
import { Textarea } from "../../../components/Textarea";
import { createPrompt, providerHealth } from "../../ai/api/promptAdminApi";
export const PromptAdminPanel = () => {
  const [health, setHealth] = useState([]);
  const [form, setForm] = useState({
    workflow: "resume-summary",
    locale: "en-US",
    category: "RESUME",
    systemInstruction: "",
  });
  const [message, setMessage] = useState("");
  useEffect(() => {
    providerHealth()
      .then(setHealth)
      .catch((error) => setMessage(error.message));
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    try {
      await createPrompt(form);
      setMessage("Prompt draft created.");
    } catch (error) {
      setMessage(error.message);
    }
  };
  return (
    <ModulePage
      eyebrow="ADMINISTRATION"
      title="AI prompt management"
      description="Create versioned prompt drafts and monitor providers."
    >
      <div className="editor-grid">
        <Card>
          <h2>Provider health</h2>
          {health.length ? (
            health.map((item) => (
              <p key={item.provider}>
                {item.provider}: <span className="status-pill">{item.status}</span>
              </p>
            ))
          ) : (
            <p className="muted">No provider status available.</p>
          )}
        </Card>
        <Card>
          <form onSubmit={submit}>
            <h2>New prompt draft</h2>
            <FormField id="workflow" label="Workflow">
              <Input
                id="workflow"
                value={form.workflow}
                onChange={(event) => setForm({ ...form, workflow: event.target.value })}
              />
            </FormField>
            <FormField id="category" label="Category">
              <Select
                id="category"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              >
                <option>RESUME</option>
                <option>COVER_LETTER</option>
                <option>ATS</option>
              </Select>
            </FormField>
            <FormField id="instruction" label="System instruction">
              <Textarea
                id="instruction"
                value={form.systemInstruction}
                onChange={(event) => setForm({ ...form, systemInstruction: event.target.value })}
                rows="8"
                required
              />
            </FormField>
            {message && <p role="status">{message}</p>}
            <Button>Create draft</Button>
          </form>
        </Card>
      </div>
    </ModulePage>
  );
};
