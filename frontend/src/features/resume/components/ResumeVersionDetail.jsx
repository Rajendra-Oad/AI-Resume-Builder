import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { AsyncState } from "../../../components/AsyncState";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { ModulePage } from "../../../components/ModulePage";
import { DetailSkeleton } from "../../../components/Skeleton";
import { getVersion, rollbackVersion } from "../api/resumeApi";
export const ResumeVersionDetail = ({ resumeId, versionId }) => {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["resume-version", resumeId, versionId],
    queryFn: () => getVersion({ resumeId, versionId }),
  });
  const restore = useMutation({
    mutationFn: () => rollbackVersion({ resumeId, versionId }),
    onSuccess: () => navigate(`/resumes/${resumeId}/edit`),
  });
  return (
    <ModulePage
      eyebrow="VERSION SNAPSHOT"
      title={query.data ? `Version ${query.data.version.versionNumber}` : "Resume version"}
      description="A read-only view of the data captured in this version."
    >
      <Link className="text-link" to={`/resumes/${resumeId}/versions`}>
        ← Version history
      </Link>
      <AsyncState
        isLoading={query.isLoading}
        error={query.error?.message}
        onRetry={query.refetch}
        fallback={<DetailSkeleton />}
      >
        {query.data && (
          <Card className="version-snapshot">
            <dl className="detail-list">
              <div>
                <dt>Title</dt>
                <dd>{query.data.snapshot.title}</dd>
              </div>
              <div>
                <dt>Summary</dt>
                <dd>{query.data.snapshot.summary || "—"}</dd>
              </div>
              <div>
                <dt>Sections</dt>
                <dd>{query.data.snapshot.sections?.length ?? 0}</dd>
              </div>
            </dl>
            <Button disabled={restore.isPending} onClick={() => restore.mutate()}>
              {restore.isPending ? "Restoring…" : "Restore this version"}
            </Button>
          </Card>
        )}
      </AsyncState>
    </ModulePage>
  );
};
