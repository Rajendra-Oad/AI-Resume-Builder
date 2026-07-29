import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AsyncState } from "../../../components/AsyncState";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { FormField } from "../../../components/FormField";
import { notify } from "../../../components/NotificationProvider";
import { Select } from "../../../components/Select";
import { CardSkeleton } from "../../../components/Skeleton";
import { listResumes } from "../../resume/api/resumeApi";
import { applyTemplate, listTemplates } from "../api/templateApi";
import { resolveTemplate } from "../templateEngine";

const TemplateSwatch = ({ template }) => {
  const resolved = resolveTemplate(template.configuration);
  return <div
    className={`template-preview template-preview--${resolved.layout === "sidebar" ? "compact" : "modern"}`}
    aria-hidden="true"
  ><i /><i /><i /><i /></div>;
};

export const TemplateGallery = () => {
  const [resumeId, setResumeId] = useState("");
  const [applyingTemplateId, setApplyingTemplateId] = useState(null);
  const client = useQueryClient();
  const templates = useQuery({ queryKey: ["templates"], queryFn: listTemplates });
  const resumes = useQuery({ queryKey: ["resumes"], queryFn: listResumes });
  useEffect(() => {
    if (!resumeId && resumes.data?.length) setResumeId(String(resumes.data[0].id));
  }, [resumeId, resumes.data]);
  const apply = useMutation({
    mutationFn: applyTemplate,
    onMutate: ({ templateId }) => setApplyingTemplateId(templateId),
    onSuccess: async (_, variables) => {
      notify.success("Template applied to your resume.");
      await client.invalidateQueries({ queryKey: ["resumes"] });
      await client.invalidateQueries({ queryKey: ["resume", String(variables.resumeId)] });
    },
    onError: (error) => notify.error({ message: error.message, details: error.message, copyError: true }),
    onSettled: () => setApplyingTemplateId(null),
  });

  return <>
    <Card className="template-toolbar">
      <div><h2>Choose a resume</h2><p className="muted">Select the document you want to restyle, then apply any active template.</p></div>
      <FormField id="templateResume" label="Resume">
        <Select id="templateResume" value={resumeId} onChange={(event) => setResumeId(event.target.value)}>
          <option value="">Select a resume</option>
          {(resumes.data ?? []).map((resume) => <option key={resume.id} value={resume.id}>{resume.title}</option>)}
        </Select>
      </FormField>
    </Card>
    <AsyncState isLoading={templates.isLoading || resumes.isLoading} error={(templates.error || resumes.error)?.message} onRetry={() => { templates.refetch(); resumes.refetch(); }} fallback={<CardSkeleton count={3} className="resume-grid" />}>
      {(templates.data ?? []).length ? <div className="resume-grid">
        {templates.data.map((template) => <Card key={template.id} className="template-card">
          <TemplateSwatch template={template} />
          <h2>{template.name}</h2><p className="muted">{template.description || "A polished, ATS-ready resume layout."}</p>
          <Button variant="secondary" disabled={!resumeId || apply.isPending} onClick={() => apply.mutate({ templateId: template.id, resumeId: Number(resumeId) })}>{applyingTemplateId === template.id ? "Applying…" : "Apply to selected resume"}</Button>
        </Card>)}
      </div> : <Card className="empty-state"><h2>No templates available</h2><p>Active templates will appear here when an administrator publishes them.</p></Card>}
    </AsyncState>
  </>;
};
