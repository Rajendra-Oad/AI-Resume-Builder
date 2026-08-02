import { useEffect, useState } from "react";

import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { FormField } from "../../../components/FormField";
import { ModulePage } from "../../../components/ModulePage";
import { AiJobSkeleton } from "../../../components/Skeleton";
import { Textarea } from "../../../components/Textarea";
import { useAiJobRunner } from "../../aiAssistant/hooks/useAiJob";
export const CoverLetterWorkspace = () => {
  const [facts, setFacts] = useState("");
  const [result, setResult] = useState("");
  const [state, setState] = useState({ loading: false, error: "" });
  const generation = useAiJobRunner("cover-letter", "Cover-letter draft");
  useEffect(() => {
    if (generation.job?.status === "SUCCEEDED") {
      setResult(generation.job.content || "");
      setState({ loading: false, error: "" });
    } else if (generation.job?.status === "FAILED") {
      setState({ loading: false, error: generation.job.error || "The AI request failed." });
    }
  }, [generation.job]);
  const generate = async (event) => {
    event.preventDefault();
    if (!facts.trim()) return;
    setState({ loading: true, error: "" });
    try {
      await generation.submit(facts);
    } catch (error) {
      setState({ loading: false, error: error.message });
      return;
    }
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
            <Button disabled={state.loading || generation.isRunning}>
              {state.loading ? "Generating…" : "Generate draft"}
            </Button>
          </form>
        </Card>
        <Card>
          <h2>Draft</h2>
          {(state.loading || generation.isRunning) ? <AiJobSkeleton title="Writing your cover letter" steps={["Queued securely", "Reviewing your facts", "Polishing the draft"]} /> : <p className="cover-output" aria-live="polite">{result || "Your generated draft will appear here."}</p>}
        </Card>
      </div>
    </ModulePage>
  );
};
