import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { AsyncState } from "../components/AsyncState";
import { Button } from "../components/Button";
import { ModulePage } from "../components/ModulePage";
import { DocumentSkeleton } from "../components/Skeleton";
import { downloadResumePdf, getResume, listSections } from "../features/resume/api/resumeApi";
import { ResumeDocumentPreview } from "../features/resume/components/ResumeDocumentPreview";
export const ResumePreviewPage = () => {
  const { resumeId } = useParams();
  const resume = useQuery({ queryKey: ["resume", resumeId], queryFn: () => getResume(resumeId) });
  const sections = useQuery({
    queryKey: ["resume-sections", resumeId],
    queryFn: () => listSections(resumeId),
  });
  return (
    <ModulePage
      eyebrow="FULL PREVIEW"
      title={resume.data?.title || "Resume preview"}
      description="Review the document without editor controls before exporting."
    >
      <div className="preview-page-actions">
        <Link to={`/resumes/${resumeId}/edit`}>
          <Button variant="ghost">Back to editor</Button>
        </Link>
        <Button
          disabled={!resume.data}
          onClick={() => downloadResumePdf(resumeId, resume.data?.title)}
        >
          Download PDF
        </Button>
      </div>
      <AsyncState
        isLoading={resume.isLoading || sections.isLoading}
        error={(resume.error || sections.error)?.message}
        onRetry={() => {
          resume.refetch();
          sections.refetch();
        }}
        fallback={<DocumentSkeleton className="resume-preview--standalone" />}
      >
        {resume.data && (
          <ResumeDocumentPreview
            values={resume.data}
            sections={sections.data ?? []}
            className="resume-preview--standalone"
          />
        )}
      </AsyncState>
    </ModulePage>
  );
};
