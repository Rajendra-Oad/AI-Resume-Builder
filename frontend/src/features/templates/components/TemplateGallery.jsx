import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AsyncState } from "../../../components/AsyncState";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { FormField } from "../../../components/FormField";
import { Select } from "../../../components/Select";
import { CardSkeleton } from "../../../components/Skeleton";
import { listResumes } from "../../resume/api/resumeApi";
import { applyTemplate, listTemplates } from "../api/templateApi";

export const TemplateGallery = () => {
  const [resumeId, setResumeId] = useState("");
  const [message, setMessage] = useState("");
  const client = useQueryClient();
  const templates = useQuery({ queryKey: ["templates"], queryFn: listTemplates });
  const resumes = useQuery({ queryKey: ["resumes"], queryFn: listResumes });
  const apply = useMutation({
    mutationFn: applyTemplate,
    onSuccess: async () => {
      setMessage("Template applied to your resume.");
      await client.invalidateQueries({ queryKey: ["resumes"] });
    },
    onError: (error) => setMessage(error.message),
  });

  return <>
    <Card className="template-toolbar">
      <div><h2>Choose a resume</h2><p className="muted">Select the document you want to restyle, then apply any active template.</p></div>
      <FormField id="templateResume" label="Resume">
        <Select id="templateResume" value={resumeId} onChange={(event) => { setResumeId(event.target.value); setMessage(""); }}>
          <option value="">Select a resume</option>
          {(resumes.data ?? []).map((resume) => <option key={resume.id} value={resume.id}>{resume.title}</option>)}
        </Select>
      </FormField>
      {message && <p className={apply.isError ? "form-error" : "form-success"} role="status">{message}</p>}
    </Card>
    <AsyncState isLoading={templates.isLoading || resumes.isLoading} error={(templates.error || resumes.error)?.message} onRetry={() => { templates.refetch(); resumes.refetch(); }} fallback={<CardSkeleton count={3} className="resume-grid" />}>
      {(templates.data ?? []).length ? <div className="resume-grid">
        {templates.data.map((template) => <Card key={template.id}>
          <div className="template-preview template-preview--classic" aria-hidden="true"><i /><i /><i /><i /></div>
          <h2>{template.name}</h2><p className="muted">{template.description || "A polished, ATS-ready resume layout."}</p>
          <Button variant="secondary" disabled={!resumeId || apply.isPending} onClick={() => apply.mutate({ templateId: template.id, resumeId: Number(resumeId) })}>{apply.isPending ? "Applying…" : "Apply template"}</Button>
        </Card>)}
      </div> : <Card className="empty-state"><h2>No templates available</h2><p>Active templates will appear here when an administrator publishes them.</p></Card>}
    </AsyncState>
  </>;
};
