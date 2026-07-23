import { Link } from "react-router-dom";

import { AppIcon } from "../../../components/AppIcon";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { ResumeCard } from "../../resume";
import { useDashboardWorkspace } from "../hooks/useDashboardWorkspace";

export const DashboardWorkspace = () => {
  const { name, resumes, recent, resumeCount } = useDashboardWorkspace();
  return <div className="dashboard-page">
    <header className="page-header"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Welcome back, {name}.</h1><p className="muted">Let’s make your next opportunity happen.</p></div><Link to="/resumes/new"><Button>+ New resume</Button></Link></header>
    <section className="welcome-grid"><Card className="welcome-card"><p className="eyebrow">BUILD WITH CONFIDENCE</p><h2>Small details make a memorable first impression.</h2><p>Use the guided builder to turn your experience into a clear, compelling story.</p><Link to="/resumes/new" className="text-link">Start building →</Link></Card><Card className="score-card"><p>YOUR WORKSPACE</p><strong>{resumeCount || "—"}</strong><span>{resumeCount ? `${resumeCount} ${resumeCount === 1 ? "resume" : "resumes"} ready to refine` : "Create a resume to begin"}</span><div className="score-track"><i style={{ width: resumeCount ? "65%" : "15%" }} /></div></Card></section>
    <section className="section-header"><div><h2>Recent resumes</h2><p className="muted">Pick up where you left off.</p></div><Link className="text-link" to="/resumes">View all →</Link></section>
    {resumes.isLoading ? <div className="resume-grid"><div className="skeleton" /><div className="skeleton" /></div> : resumes.error ? <Card className="notice notice--error"><p>We couldn’t load your resumes.</p><Button variant="secondary" onClick={resumes.refresh}>Try again</Button></Card> : recent.length ? <div className="resume-grid">{recent.map((resume) => <ResumeCard key={resume.id} resume={resume} />)}</div> : <Card className="empty-state"><div className="empty-icon"><AppIcon name="document" /></div><h3>Your story starts here</h3><p>Create your first resume and we’ll guide you from a blank page to a polished final draft.</p><Link to="/resumes/new"><Button variant="secondary">Create a resume</Button></Link></Card>}
    <section className="quick-actions"><div className="section-header"><div><h2>Keep moving</h2><p className="muted">A focused next step for every stage.</p></div></div><div className="quick-action-grid"><Link to="/ats"><Card><AppIcon name="ats" /><h3>Check ATS fit</h3><p>Compare a resume with a target role.</p></Card></Link><Link to="/job-matching"><Card><AppIcon name="jobs" /><h3>Save a target job</h3><p>Keep the full listing ready for tailoring.</p></Card></Link><Link to="/cover-letter"><Card><AppIcon name="coverLetter" /><h3>Draft a cover letter</h3><p>Turn your facts into an editable first draft.</p></Card></Link></div></section>
  </div>;
};
