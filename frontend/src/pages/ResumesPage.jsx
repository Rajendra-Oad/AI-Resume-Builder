import { Link } from "react-router-dom";

import { AppIcon } from "../components/AppIcon";
import { Button } from "../components/Button";
import { CardSkeleton } from "../components/Skeleton";
import { ResumeCard, useResumes } from "../features/resume";

export const ResumesPage = () => {
  const { data: resumes, error, isLoading } = useResumes();
  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">YOUR DOCUMENTS</p>
          <h1>My resumes</h1>
          <p className="muted">Create, refine, and tailor your applications.</p>
        </div>
        <div className="page-header__actions">
          <Link to="/resumes/deleted"><Button variant="secondary">Recently deleted</Button></Link>
          <Link to="/resumes/new">
            <Button className="new-resume-button"><AppIcon name="plus" size={17} /> New resume</Button>
          </Link>
        </div>
      </header>
      {isLoading ? <CardSkeleton count={6} className="resume-grid" /> : error ? (
        <div className="notice notice--error">{error}</div>
      ) : resumes.length ? (
        <div className="resume-grid">
          {resumes.map((resume) => (
            <ResumeCard key={resume.id} resume={resume} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <AppIcon name="document" />
          </div>
          <h2>No resumes yet</h2>
          <p>Your next great opportunity deserves a great first impression.</p>
          <Link to="/resumes/new">
            <Button>Create my first resume</Button>
          </Link>
        </div>
      )}
    </div>
  );
};
