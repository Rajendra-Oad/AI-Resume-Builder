import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/Button";
import { AppIcon } from "../../../components/AppIcon";
import { Card } from "../../../components/Card";
import { FormField } from "../../../components/FormField";
import { Input } from "../../../components/Input";
import { MultiStepFormWizard } from "../../../components/MultiStepFormWizard";
import { Textarea } from "../../../components/Textarea";
import { UnsavedChangesDialog } from "../../../components/UnsavedChangesDialog";
import { validateResume } from "../../../validators/resumeValidator";
import { generateResumeSummary } from "../../ai/api/aiApi";
import { createResume, getResume, updateResume } from "../api/resumeApi";
import { useResumeAutosave } from "../hooks/useResumeAutosave";
const emptyResume = { title: "", summary: "" };
export const ResumeEditor = ({ resumeId }) => {
  const isNew = !resumeId;
  const [values, setValues] = useState(emptyResume);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(isNew);
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const onSaved = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["resumes"] }),
    [queryClient],
  );
  const autosave = useResumeAutosave({ enabled: !isNew && loaded, resumeId, values, onSaved });
  useEffect(() => {
    if (isNew) return;
    getResume(resumeId)
      .then((resume) => {
        const editable = { title: resume.title ?? "", summary: resume.summary ?? "" };
        setValues(editable);
        autosave.markSaved(editable);
        setLoaded(true);
      })
      .catch((error) => setMessage(error.message)); /* identifier-only reload */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, resumeId]);
  const update = ({ target }) => {
    setValues((current) => ({ ...current, [target.name]: target.value }));
    setErrors((current) => ({ ...current, [target.name]: "" }));
  };
  const improveWithAi = async () => {
    if (!values.summary.trim()) {
      setErrors((current) => ({
        ...current,
        summary: "Add your experience facts before using AI.",
      }));
      return;
    }
    setGenerating(true);
    setMessage("");
    try {
      const result = await generateResumeSummary(
        `Target role: ${values.title || "Not specified"}\nCandidate facts: ${values.summary}`,
      );
      setValues((current) => ({ ...current, summary: result.content }));
      setMessage("AI draft ready. Review the facts before it is saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setGenerating(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validateResume(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setCurrentStep(nextErrors.title ? 0 : 1);
      return;
    }
    setMessage("");
    try {
      const saved = isNew ? await createResume(values) : await updateResume(resumeId, values);
      autosave.markSaved(values);
      onSaved();
      if (isNew) navigate(`/resumes/${saved.id}`, { replace: true });
      else setMessage("Resume saved.");
    } catch (error) {
      setMessage(error.message);
    }
  };
  const saveLabel = !loaded
    ? "Loading resume…"
    : autosave.status === "saving"
      ? "Saving…"
      : autosave.status === "error"
        ? "Autosave failed"
        : autosave.isDirty
          ? "Unsaved changes"
          : "All changes saved";
  return (
    <main className="editor-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">RESUME BUILDER</p>
          <h1>{isNew ? "Start a new resume" : values.title || "Edit resume"}</h1>
        </div>
        <span className="save-status" aria-live="polite">
          ● {saveLabel}
        </span>
      </header>
      <div className="editor-grid">
        <Card>
          <form onSubmit={submit} noValidate>
            <h2>Build your resume</h2>
            <MultiStepFormWizard
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              steps={[
                { id: "basics", label: "Basics" },
                { id: "summary", label: "Summary" },
                { id: "review", label: "Review" },
              ]}
            >
              {currentStep === 0 && (
                <>
                  <p className="muted">Give this version a clear internal title.</p>
                  <FormField id="title" label="Resume title" error={errors.title}>
                    <Input
                      id="title"
                      name="title"
                      value={values.title}
                      onChange={update}
                      aria-invalid={Boolean(errors.title)}
                      aria-describedby={errors.title ? "title-error" : undefined}
                    />
                  </FormField>
                </>
              )}
              {currentStep === 1 && (
                <>
                  <p className="muted">
                    Write from facts. AI can improve wording after you provide the substance.
                  </p>
                  <FormField id="summary" label="Professional summary" error={errors.summary}>
                    <Textarea
                      id="summary"
                      name="summary"
                      rows="8"
                      value={values.summary}
                      onChange={update}
                      aria-invalid={Boolean(errors.summary)}
                      aria-describedby={errors.summary ? "summary-error" : undefined}
                    />
                  </FormField>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={improveWithAi}
                    disabled={generating}
                  >
                    {!generating && <AppIcon name="ai" size={18} />}
                    {generating ? "Creating AI draft…" : "Improve with AI"}
                  </Button>
                </>
              )}
              {currentStep === 2 && (
                <div className="review-summary">
                  <p className="eyebrow">READY TO SAVE</p>
                  <h3>{values.title || "Untitled resume"}</h3>
                  <p className="muted">{values.summary || "Add a summary before saving."}</p>
                </div>
              )}
            </MultiStepFormWizard>
            {(message || autosave.error) && (
              <p
                className={autosave.error ? "form-error" : "muted"}
                role={autosave.error ? "alert" : "status"}
              >
                {autosave.error || message}
              </p>
            )}
            <div className="form-actions">
              <Button type="submit">{isNew ? "Create resume" : "Save now"}</Button>
            </div>
          </form>
        </Card>
        <aside className="preview-paper" aria-label="Live resume preview">
          <p className="preview-name">YOUR NAME</p>
          <div className="preview-rule" />
          <h2>{values.title || "Your professional title"}</h2>
          <p>{values.summary || "Your summary will appear here as you write it."}</p>
          <h3>EXPERIENCE</h3>
          <div className="preview-lines">
            <i />
            <i />
            <i />
          </div>
        </aside>
      </div>
      <UnsavedChangesDialog blocker={autosave.blocker} />
    </main>
  );
};
