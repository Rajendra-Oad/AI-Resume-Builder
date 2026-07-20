import { useState } from "react";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { FormField } from "../../../components/FormField";
import { ModulePage } from "../../../components/ModulePage";
import { Textarea } from "../../../components/Textarea";
import { generateContent } from "../../aiAssistant/api/aiAssistantApi";
export const CoverLetterWorkspace = () => {
  const [facts, setFacts] = useState("");
  const [result, setResult] = useState("");
  const [state, setState] = useState({ loading: false, error: "" });
  const generate = async (event) => {
    event.preventDefault();
    if (!facts.trim()) return;
    setState({ loading: true, error: "" });
    try {
      const response = await generateContent("cover-letter", facts);
      setResult(response.content);
    } catch (error) {
      setState({ loading: false, error: error.message });
      return;
    }
    setState({ loading: false, error: "" });
  };
  return (
    <ModulePage
      eyebrow="WRITING STUDIO"
      title="Cover letter"
      description="Generate an editable first draft from facts you provide."
    >
      <div className="editor-grid">
        <Card>
          <form onSubmit={generate}>
            <FormField
              id="coverFacts"
              label="Role and candidate facts"
              hint="Include the company, role, achievements, and motivation."
            >
              <Textarea
                id="coverFacts"
                rows="10"
                value={facts}
                onChange={(event) => setFacts(event.target.value)}
                required
              />
            </FormField>
            {state.error && (
              <p className="form-error" role="alert">
                {state.error}
              </p>
            )}
            <Button disabled={state.loading}>
              {state.loading ? "Generating…" : "Generate draft"}
            </Button>
          </form>
        </Card>
        <Card>
          <h2>Draft</h2>
          <p className="cover-output" aria-live="polite">
            {result || "Your generated draft will appear here."}
          </p>
        </Card>
      </div>
    </ModulePage>
  );
};
