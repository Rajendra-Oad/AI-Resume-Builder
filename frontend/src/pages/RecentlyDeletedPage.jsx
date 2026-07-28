import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { AppIcon } from "../components/AppIcon";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CardSkeleton } from "../components/Skeleton";
import { listDeletedResumes, restoreResume } from "../features/resume/api/resumeApi";

const remainingDays = (recoverableUntil) => {
  const milliseconds = new Date(recoverableUntil).getTime() - Date.now();
  return Math.max(1, Math.ceil(milliseconds / 86_400_000));
};

const DeletedResumeCard = ({ resume, onRestored }) => {
  const restore = useMutation({ mutationFn: () => restoreResume(resume.id), onSuccess: onRestored });
  const days = remainingDays(resume.recoverableUntil);
  return (
    <Card className="deleted-resume-card">
      <div className="deleted-resume-card__icon"><AppIcon name="document" /></div>
      <div className="deleted-resume-card__body">
        <span className="status-pill status-pill--warning">{days} {days === 1 ? "day" : "days"} remaining</span>
        <h2>{resume.title}</h2>
        <p>{resume.summary || "No professional summary."}</p>
        <small>Deleted {new Date(resume.deletedAt).toLocaleDateString()}</small>
      </div>
      <div className="deleted-resume-card__action">
        <Button type="button" variant="secondary" disabled={restore.isPending} onClick={() => restore.mutate()}>{restore.isPending ? "Restoring…" : "Restore resume"}</Button>
        {restore.isError && <p className="form-error" role="alert">{restore.error.message}</p>}
      </div>
    </Card>
  );
};

export const RecentlyDeletedPage = () => {
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const deleted = useQuery({ queryKey: ["deleted-resumes"], queryFn: listDeletedResumes });
  const restored = (resume) => {
    queryClient.setQueryData(["deleted-resumes"], (current) =>
      Array.isArray(current) ? current.filter((item) => item.id !== resume.id) : current,
    );
    queryClient.invalidateQueries({ queryKey: ["resumes"] });
    setMessage(`“${resume.title}” was restored to My Resumes.`);
  };

  if (deleted.isLoading)
    return (
      <main className="dashboard-page">
        <header className="page-header">
          <div>
            <p className="eyebrow">RECOVERY</p>
            <h1>Recently deleted</h1>
          </div>
        </header>
        <CardSkeleton count={3} className="deleted-resume-list" />
      </main>
    );
  return (
    <main className="dashboard-page">
      <header className="page-header">
        <div><p className="eyebrow">RECOVERY</p><h1>Recently deleted</h1><p className="muted">Deleted resumes can be restored for 30 days. After that, they are no longer recoverable.</p></div>
        <Link to="/resumes"><Button variant="secondary">Back to My Resumes</Button></Link>
      </header>
      {message && <div className="notice notice--success" role="status">{message}</div>}
      {deleted.isError ? <Card className="notice notice--error"><p>We couldn’t load recently deleted resumes.</p><Button variant="secondary" onClick={() => deleted.refetch()}>Try again</Button></Card> : deleted.data.length ? <div className="deleted-resume-list">{deleted.data.map((resume) => <DeletedResumeCard key={resume.id} resume={resume} onRestored={restored} />)}</div> : <Card className="empty-state"><div className="empty-icon"><AppIcon name="document" /></div><h2>Nothing to recover</h2><p>Resumes you delete will stay here for up to 30 days.</p><Link to="/resumes"><Button>View my resumes</Button></Link></Card>}
    </main>
  );
};
