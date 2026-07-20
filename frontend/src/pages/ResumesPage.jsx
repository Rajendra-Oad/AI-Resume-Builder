import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { AppIcon } from "../components/AppIcon";
import { PageLoader } from "../components/PageLoader";
import { ResumeCard, useResumes } from "../features/resume";

export const ResumesPage = () => {
  const { data: resumes, error, isLoading } = useResumes();
  if (isLoading) return <PageLoader />;
  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">YOUR DOCUMENTS</p>
          <h1>My resumes</h1>
          <p className="muted">Create, refine, and tailor your applications.</p>
        </div>
        <Link to="/resumes/new">
          <Button>+ New resume</Button>
        </Link>
      </header>
      {error ? (
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
