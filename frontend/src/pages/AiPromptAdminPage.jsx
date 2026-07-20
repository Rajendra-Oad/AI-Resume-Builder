import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { createPrompt, providerHealth } from "../features/ai/api/promptAdminApi";
export const AiPromptAdminPage = () => {
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
      .catch((e) => setMessage(e.message));
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    try {
      await createPrompt(form);
      setMessage("Prompt draft created.");
    } catch (err) {
      setMessage(err.message);
    }
  };
  return (
    <div className="dashboard-page">
      <h1>AI prompt management</h1>
      <p className="muted">
        Create versioned prompt drafts. Publishing is controlled by the admin workflow.
      </p>
      <section className="card">
        <h2>Provider health</h2>
        {health.map((item) => (
          <p key={item.provider}>
            {item.provider}: {item.status}
          </p>
        ))}
      </section>
      <section className="card">
        <h2>New prompt draft</h2>
        <form onSubmit={submit}>
          <input
            value={form.workflow}
            onChange={(e) => setForm({ ...form, workflow: e.target.value })}
            placeholder="Workflow"
          />
          <input
            value={form.locale}
            onChange={(e) => setForm({ ...form, locale: e.target.value })}
            placeholder="Locale"
          />
          <textarea
            value={form.systemInstruction}
            onChange={(e) => setForm({ ...form, systemInstruction: e.target.value })}
            placeholder="System instruction"
            rows="8"
            required
          />
          {message && <p>{message}</p>}
          <Button>Create draft</Button>
        </form>
      </section>
    </div>
  );
};
