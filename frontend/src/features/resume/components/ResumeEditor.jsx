import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { AppIcon } from "../../../components/AppIcon";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { FormField } from "../../../components/FormField";
import { Input } from "../../../components/Input";
import { Modal } from "../../../components/Modal";
import { MultiStepFormWizard } from "../../../components/MultiStepFormWizard";
import { Select } from "../../../components/Select";
import { Textarea } from "../../../components/Textarea";
import { UnsavedChangesDialog } from "../../../components/UnsavedChangesDialog";
import { useUndoRedoState } from "../../../hooks/useUndoRedoState";
import { validateResume } from "../../../validators/resumeValidator";
import { generateResumeSummary } from "../../ai/api/aiApi";
import { getProfile } from "../../profile/api/profileApi";
import { applyTemplate, listTemplates } from "../../templates/api/templateApi";
import {
  createResume,
  downloadResumePdf,
  getResume,
  listSections,
  publishResume,
  updateResume,
} from "../api/resumeApi";
import { useResumeCompletion } from "../completion/useResumeCompletion";
import { useResumeAutosave } from "../hooks/useResumeAutosave";
import { ResumeCompletionCard } from "./ResumeCompletionCard";
import { ResumeDocumentPreview } from "./ResumeDocumentPreview";
import { TypedSectionsEditor } from "./TypedSectionsEditor";

const emptyResume = {
  title: "",
  fullName: "",
  summary: "",
  targetJobTitle: "",
  contactEmail: "",
  phone: "",
  location: "",
  githubUrl: "",
  linkedinUrl: "",
  skillsContent: "",
  experienceContent: "",
  projectsContent: "",
  educationContent: "",
  certificationsContent: "",
  languagesContent: "",
  fontFamily: "HELVETICA",
  fontSize: 10.5,
  lineSpacing: 1.25,
  sectionSpacing: 12,
  pageMargin: 42,
};

const contentFields = [
  ["skillsContent", "Skills", "Front-End: HTML, CSS, JavaScript, React\nTools: Git, GitHub"],
  ["experienceContent", "Experience", "Role — Company | 2024–Present\n• Describe impact and measurable results."],
  ["projectsContent", "Projects", "Project name (2025)\n• Explain what you built and the technologies used."],
  ["certificationsContent", "Certifications", "• Certification — Issuer"],
  ["educationContent", "Education", "Degree — Institution | 2022–2026"],
  ["languagesContent", "Languages", "English: Fluent, Hindi: Conversational"],
];

export const ResumeEditor = ({ resumeId }) => {
  const isNew = !resumeId;
  const location = useLocation();
  const { value: values, setValue: setValues, reset: resetValues, undo, redo, canUndo, canRedo } = useUndoRedoState(emptyResume);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(() => location.state?.notice ?? "");
  const [loaded, setLoaded] = useState(isNew);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [historyMessage, setHistoryMessage] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [viewMode,setViewMode]=useState("split");
  const formRef = useRef(null);
  const improveRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const templatesQuery = useQuery({ queryKey: ["templates"], queryFn: listTemplates });
  const sectionsQuery=useQuery({queryKey:["resume-sections",resumeId],queryFn:()=>listSections(resumeId),enabled:!isNew});
  const completion = useResumeCompletion(values, sectionsQuery.data ?? [], profileQuery.data ?? {});
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const onSaved = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["resumes"] }),
    [queryClient],
  );
  const autosave = useResumeAutosave({ enabled: !isNew && loaded, resumeId, values, onSaved });

  useEffect(() => {
    if (isNew) return;
    getResume(resumeId)
      .then((resume) => {
        const editable = { ...emptyResume, ...resume };
        resetValues(editable);
        autosave.markSaved(editable);
        setLoaded(true);
      })
      .catch((error) => setMessage(error.message)); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, resumeId]);

  const update = ({ target }) => {
    const value = target.type === "range" ? Number(target.value) : target.value;
    setValues((current) => ({ ...current, [target.name]: value }), target.name);
    setErrors((current) => ({ ...current, [target.name]: "" }));
  };

  const undoChange = useCallback(() => {
    if (!canUndo) return;
    undo();
    setHistoryMessage("Undid the last change.");
  }, [canUndo, undo]);

  const redoChange = useCallback(() => {
    if (!canRedo) return;
    redo();
    setHistoryMessage("Redid the last change.");
  }, [canRedo, redo]);

  useEffect(() => {
    const handleShortcut = (event) => {
      if (showShortcuts) return;
      const key = event.key.toLowerCase();
      const command = event.ctrlKey || event.metaKey;
      const editable = ["INPUT", "TEXTAREA", "SELECT"].includes(event.target?.tagName) || event.target?.isContentEditable;
      if (event.altKey && /^[1-5]$/.test(key)) {
        event.preventDefault();
        setCurrentStep(Number(key) - 1);
      } else if (command && key === "s") {
        event.preventDefault();
        formRef.current?.requestSubmit();
      } else if (command && event.shiftKey && key === "i") {
        event.preventDefault();
        improveRef.current?.();
      } else if (command && key === "/") {
        event.preventDefault();
        setShowShortcuts(true);
      } else if (!editable && !command && !event.altKey && key === "?") {
        event.preventDefault();
        setShowShortcuts(true);
      } else if (!event.altKey && command && key === "z" && event.shiftKey) {
        event.preventDefault();
        redoChange();
      } else if (!event.altKey && command && key === "z") {
        event.preventDefault();
        undoChange();
      } else if (!event.altKey && command && key === "y") {
        event.preventDefault();
        redoChange();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [redoChange, showShortcuts, undoChange]);

  const improveWithAi = async () => {
    if (!values.summary.trim()) {
      setErrors((current) => ({ ...current, summary: "Add your experience facts before using AI." }));
      return;
    }
    setGenerating(true);
    setMessage("");
    try {
      const result = await generateResumeSummary(
        `Target role: ${values.targetJobTitle || values.title}\nCandidate facts: ${values.summary}`,
      );
      setValues((current) => ({ ...current, summary: result.content }));
      setMessage("AI draft ready. Review every fact before saving.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setGenerating(false);
    }
  };
  improveRef.current = improveWithAi;

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
      let saved;
      if (isNew) {
        const created = await createResume({ title: values.title, summary: values.summary });
        saved = await updateResume(created.id, values);
      } else {
        saved = await updateResume(resumeId, values);
      }
      autosave.markSaved(values);
      onSaved();
      if (isNew) navigate(`/resumes/${saved.id}`, { replace: true });
      else setMessage("Resume saved.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const download = async () => {
    setDownloading(true);
    setMessage("");
    try {
      await downloadResumePdf(resumeId, values.title);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setDownloading(false);
    }
  };

  const publish=async()=>{try{await publishResume(resumeId);setMessage("Resume published.");queryClient.invalidateQueries({queryKey:["resumes"]});}catch(error){setMessage(error.message);}};
  const selectTemplate = async ({ target }) => {
    const templateId = Number(target.value);
    const template = templatesQuery.data?.find((item) => item.id === templateId);
    if (!template || isNew) return;
    setApplyingTemplate(true);
    setMessage("");
    try {
      await applyTemplate({ templateId, resumeId: Number(resumeId) });
      setValues((current) => ({ ...current, templateId, templateConfiguration: template.configuration }));
      await queryClient.invalidateQueries({ queryKey: ["resumes"] });
      setMessage(`${template.name} template applied.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setApplyingTemplate(false);
    }
  };

  const openCompletionSection = (sectionId) => {
    if (["personal", "links"].includes(sectionId)) setCurrentStep(0);
    else if (sectionId === "summary") setCurrentStep(1);
    else setCurrentStep(2);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="editor-page">
      <header className="page-header">
        <div><p className="eyebrow">RESUME BUILDER</p><h1>{isNew ? "Build a complete resume" : values.title || "Edit resume"}</h1></div>
        <div className="editor-header__tools">
        <div className="history-controls" aria-label="Editing history">
          <Button type="button" variant="ghost" disabled={!canUndo} onClick={undoChange} title="Undo (Ctrl+Z)">Undo</Button>
          <Button type="button" variant="ghost" disabled={!canRedo} onClick={redoChange} title="Redo (Ctrl+Y or Ctrl+Shift+Z)">Redo</Button>
          <Button type="button" variant="ghost" onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (Ctrl+/)">Shortcuts</Button>
          <span className="sr-only" aria-live="polite">{historyMessage}</span>
        </div>
        <span className="save-status" aria-live="polite">● {!loaded ? "Loading…" : autosave.status === "saving" ? "Saving…" : autosave.isDirty ? "Unsaved changes" : "All changes saved"}</span>
        </div>
      </header>
      {!isNew&&<nav className="builder-subnav" aria-label="Resume tools"><Link to={`/resumes/${resumeId}/edit`}>Edit</Link><Link to={`/resumes/${resumeId}/preview`}>Full preview</Link><Link to={`/resumes/${resumeId}/ats-check`}>ATS check</Link><Link to={`/resumes/${resumeId}/versions`}>Versions</Link><Button type="button" variant="ghost" onClick={publish}>Publish</Button></nav>}
      <ResumeCompletionCard completion={completion} onSectionSelect={openCompletionSection} />
      <div className="preview-mode-switch" aria-label="Builder view"><Button type="button" variant={viewMode==="edit"?"primary":"ghost"} onClick={()=>setViewMode("edit")}>Edit only</Button><Button type="button" variant={viewMode==="split"?"primary":"ghost"} onClick={()=>setViewMode("split")}>Split</Button><Button type="button" variant={viewMode==="preview"?"primary":"ghost"} onClick={()=>setViewMode("preview")}>Preview only</Button></div>
      <div className={`editor-grid editor-grid--wide editor-grid--${viewMode}`}>
        {viewMode!=="preview"&&<Card>
          <form ref={formRef} onSubmit={submit} noValidate>
            <h2>Resume content</h2>
            <MultiStepFormWizard currentStep={currentStep} onStepChange={setCurrentStep} steps={[
              { id: "basics", label: "Header" }, { id: "summary", label: "Summary" },
              { id: "content", label: "Sections" }, { id: "design", label: "Design" }, { id: "review", label: "Review" },
            ]}>
              {currentStep === 0 && <div className="form-grid">
                <FormField id="title" label="Internal resume title" error={errors.title}><Input id="title" name="title" value={values.title} onChange={update} /></FormField>
                <FormField id="fullName" label="Full name" error={errors.fullName}><Input id="fullName" name="fullName" value={values.fullName} onChange={update} autoComplete="name" placeholder="Your full name" /></FormField>
                <FormField id="targetJobTitle" label="Professional title"><Input id="targetJobTitle" name="targetJobTitle" value={values.targetJobTitle} onChange={update} placeholder="Front-End Developer" /></FormField>
                <FormField id="contactEmail" label="Contact email"><Input id="contactEmail" name="contactEmail" type="email" value={values.contactEmail} onChange={update} /></FormField>
                <FormField id="phone" label="Phone"><Input id="phone" name="phone" value={values.phone} onChange={update} /></FormField>
                <FormField id="location" label="Location"><Input id="location" name="location" value={values.location} onChange={update} /></FormField>
                <FormField id="githubUrl" label="GitHub"><Input id="githubUrl" name="githubUrl" value={values.githubUrl} onChange={update} placeholder="github.com/username" /></FormField>
                <FormField id="linkedinUrl" label="LinkedIn"><Input id="linkedinUrl" name="linkedinUrl" value={values.linkedinUrl} onChange={update} placeholder="linkedin.com/in/username" /></FormField>
              </div>}
              {currentStep === 1 && <>
                <FormField id="summary" label="Career objective / professional summary" error={errors.summary}><Textarea id="summary" name="summary" rows="9" value={values.summary} onChange={update} /></FormField>
                <Button type="button" variant="secondary" onClick={improveWithAi} disabled={generating}>{!generating && <AppIcon name="ai" size={18} />}{generating ? "Creating AI draft…" : "Improve with AI"}</Button>
              </>}
              {currentStep === 2 && <div className="resume-section-fields">
                {!isNew && <TypedSectionsEditor resumeId={resumeId} onSections={(items)=>queryClient.setQueryData(["resume-sections",resumeId],items)}/>}
                {isNew
                  ? contentFields.map(([name,label,placeholder]) => <FormField key={name} id={name} label={label}><Textarea id={name} name={name} rows="5" value={values[name]} onChange={update} placeholder={placeholder} /></FormField>)
                  : <details className="legacy-sections"><summary>Text sections</summary>{contentFields.map(([name,label,placeholder]) => <FormField key={name} id={name} label={label}><Textarea id={name} name={name} rows="5" value={values[name]} onChange={update} placeholder={placeholder} /></FormField>)}</details>}
              </div>}
              {currentStep === 3 && <div className="customizer-grid">
                <FormField id="templateId" label="Resume template">
                  <Select id="templateId" name="templateId" value={values.templateId ?? ""} onChange={selectTemplate} disabled={isNew || applyingTemplate}>
                    <option value="">{isNew ? "Save the resume before choosing a template" : "Choose a template"}</option>
                    {(templatesQuery.data ?? []).map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                  </Select>
                </FormField>
                <FormField id="fontFamily" label="Font"><Select id="fontFamily" name="fontFamily" value={values.fontFamily} onChange={update}><option value="HELVETICA">Arial / Helvetica</option><option value="TIMES">Times</option><option value="COURIER">Courier</option></Select></FormField>
                <FormField id="fontSize" label={`Body size — ${values.fontSize} pt`}><Input id="fontSize" name="fontSize" type="range" min="9" max="13" step="0.5" value={values.fontSize} onChange={update} /></FormField>
                <FormField id="lineSpacing" label={`Line spacing — ${values.lineSpacing}`}><Input id="lineSpacing" name="lineSpacing" type="range" min="1" max="1.8" step="0.05" value={values.lineSpacing} onChange={update} /></FormField>
                <FormField id="sectionSpacing" label={`Section spacing — ${values.sectionSpacing} pt`}><Input id="sectionSpacing" name="sectionSpacing" type="range" min="6" max="24" value={values.sectionSpacing} onChange={update} /></FormField>
                <FormField id="pageMargin" label={`Page margin — ${values.pageMargin} pt`}><Input id="pageMargin" name="pageMargin" type="range" min="24" max="72" step="3" value={values.pageMargin} onChange={update} /></FormField>
              </div>}
              {currentStep === 4 && <div className="review-summary"><p className="eyebrow">READY TO EXPORT</p><h3>{values.targetJobTitle || values.title}</h3><p className="muted">Review the live A4 preview, save, then download your PDF.</p></div>}
            </MultiStepFormWizard>
            {(message || autosave.error) && <p className={autosave.error ? "form-error" : "muted"} role={autosave.error ? "alert" : "status"}>{autosave.error || message}</p>}
            <div className="form-actions"><Button type="submit">{isNew ? "Create resume" : "Save now"}</Button>{!isNew && <Button type="button" variant="secondary" onClick={download} disabled={downloading}><AppIcon name="documentReady" size={18} />{downloading ? "Preparing PDF…" : "Download PDF"}</Button>}</div>
          </form>
        </Card>}
        {viewMode!=="edit"&&<ResumeDocumentPreview values={values} sections={sectionsQuery.data??[]} />}
      </div>
      <UnsavedChangesDialog blocker={autosave.blocker} />
      <Modal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} title="Keyboard shortcuts">
        <p className="dialog-supporting">Work through your resume without leaving the keyboard.</p>
        <dl className="shortcut-list">
          <div><dt>Save resume</dt><dd><kbd>Ctrl</kbd><span>+</span><kbd>S</kbd></dd></div>
          <div><dt>Undo</dt><dd><kbd>Ctrl</kbd><span>+</span><kbd>Z</kbd></dd></div>
          <div><dt>Redo</dt><dd><kbd>Ctrl</kbd><span>+</span><kbd>Y</kbd></dd></div>
          <div><dt>Improve summary with AI</dt><dd><kbd>Ctrl</kbd><span>+</span><kbd>Shift</kbd><span>+</span><kbd>I</kbd></dd></div>
          <div><dt>Open shortcut help</dt><dd><kbd>Ctrl</kbd><span>+</span><kbd>/</kbd></dd></div>
          <div><dt>Jump to builder section</dt><dd><kbd>Alt</kbd><span>+</span><kbd>1–5</kbd></dd></div>
        </dl>
        <p className="shortcut-note">On macOS, use Command instead of Ctrl. You can also press <kbd>?</kbd> outside a form field to open this panel.</p>
        <div className="dialog-actions"><Button type="button" onClick={() => setShowShortcuts(false)}>Done</Button></div>
      </Modal>
    </main>
  );
};
