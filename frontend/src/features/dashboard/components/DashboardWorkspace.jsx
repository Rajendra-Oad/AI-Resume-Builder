import { Link } from "react-router-dom";

import { AppIcon } from "../../../components/AppIcon";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { ResumeCard } from "../../resume";
import { useDashboardWorkspace } from "../hooks/useDashboardWorkspace";

const StatCard = ({ icon, label, value, detail, tone = "" }) => (
  <Card className={`metric-card ${tone}`} data-reveal>
    <div className="metric-card__top">
      <span className="metric-card__icon"><AppIcon name={icon} size={18} /></span>
      <span className="metric-card__trend">This month</span>
    </div>
    <strong>{value}</strong>
    <span>{label}</span>
    <small>{detail}</small>
  </Card>
);

export const DashboardWorkspace = () => {
  const { name, resumes, recent, resumeCount, analytics } = useDashboardWorkspace();
  const profileProgress = resumeCount ? Math.min(92, 58 + resumeCount * 8) : 32;
  const totals = analytics.data?.totals;
  const metric = (value, suffix = "") =>
    analytics.isLoading ? "…" : value == null ? "—" : `${value}${suffix}`;

  return (
    <main className="dashboard-page">
      <header className="page-header dashboard-heading" data-reveal>
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h1>Good to see you, {name}.</h1>
          <p className="muted">Build, refine, and tailor every application from one place.</p>
        </div>
        <Link to="/resumes/new"><Button className="new-resume-button"><AppIcon name="plus" size={17} /> New resume</Button></Link>
      </header>

      <section className="dashboard-metrics" aria-label="Workspace metrics">
        <StatCard icon="document" label="Resumes created" value={metric(totals?.resumesCreated)} detail="During the last 30 days" />
        <StatCard icon="ats" label="Average ATS score" value={metric(totals?.averageAtsScore == null ? null : Math.round(totals.averageAtsScore), "%")} detail={`${totals?.atsReports ?? 0} analyses in this period`} tone="metric-card--green" />
        <StatCard icon="ai" label="AI requests" value={metric(totals?.aiRequests)} detail={`${totals?.aiTokens ?? 0} tokens processed`} tone="metric-card--violet" />
        <StatCard icon="chart" label="PDF exports" value={metric(totals?.pdfExports)} detail="During the last 30 days" tone="metric-card--amber" />
      </section>
      {analytics.isError && <p className="form-error" role="status">Live workspace metrics are temporarily unavailable.</p>}

      <section className="dashboard-feature-grid">
        <Card className="next-step-card" data-reveal>
          <div className="next-step-card__copy">
            <span className="feature-badge"><AppIcon name="ai" size={14} /> Recommended next step</span>
            <h2>Make every application feel made for the role.</h2>
            <p>Use AI-guided tailoring to align your strongest experience with the language hiring teams look for.</p>
            <div className="next-step-actions">
              <Link to={resumeCount ? "/ai-assistant" : "/resumes/new"}><Button>{resumeCount ? "Tailor a resume" : "Create your first resume"} <AppIcon name="expand" size={16} /></Button></Link>
              <Link className="quiet-link" to="/templates">Explore templates</Link>
            </div>
          </div>
          <div className="insight-visual" aria-hidden="true">
            <div className="insight-orbit"><AppIcon name="ai" size={22} /></div>
            <div className="insight-line"><span>Impact language</span><strong>+24%</strong></div>
            <div className="insight-line"><span>Role alignment</span><strong>Excellent</strong></div>
            <div className="insight-meter"><i /></div>
          </div>
        </Card>
        <Card className="progress-card" data-reveal>
          <div className="card-title-row"><div><p className="eyebrow">PROFILE</p><h2>Completion</h2></div><strong>{profileProgress}%</strong></div>
          <div className="progress-ring" style={{ "--progress": `${profileProgress * 3.6}deg` }}><span>{profileProgress}%</span></div>
          <p>Complete your profile once, then reuse the details in every application.</p>
          <Link className="text-link" to="/profile">Complete profile <span>→</span></Link>
        </Card>
      </section>

      <section className="section-header" data-reveal>
        <div><p className="eyebrow">RECENT WORK</p><h2>Your resumes</h2><p className="muted">Continue from exactly where you left off.</p></div>
        <Link className="text-link" to="/resumes">View all <span>→</span></Link>
      </section>
      {resumes.isLoading ? (
        <div className="resume-grid" aria-label="Loading resumes"><div className="skeleton" /><div className="skeleton" /></div>
      ) : resumes.error ? (
        <Card className="notice notice--error"><p>We couldn’t load your resumes.</p><Button variant="secondary" onClick={resumes.refresh}>Try again</Button></Card>
      ) : recent.length ? (
        <div className="resume-grid" data-reveal>{recent.map((resume) => <ResumeCard key={resume.id} resume={resume} />)}</div>
      ) : (
        <Card className="empty-state" data-reveal><div className="empty-icon"><AppIcon name="document" /></div><h3>Your story starts here</h3><p>Create your first resume and we’ll guide you from a blank page to a polished final draft.</p><Link to="/resumes/new"><Button variant="secondary">Create a resume</Button></Link></Card>
      )}

      <section className="quick-actions" data-reveal>
        <div className="section-header"><div><p className="eyebrow">QUICK ACTIONS</p><h2>Keep moving</h2></div></div>
        <div className="quick-action-grid">
          <Link to="/ats"><Card><span className="action-icon"><AppIcon name="ats" /></span><div><h3>Check ATS fit</h3><p>Compare your resume with a target role.</p></div><AppIcon name="expand" size={16} /></Card></Link>
          <Link to="/job-matching"><Card><span className="action-icon"><AppIcon name="jobs" /></span><div><h3>Save a target job</h3><p>Keep the listing ready for tailoring.</p></div><AppIcon name="expand" size={16} /></Card></Link>
          <Link to="/cover-letter"><Card><span className="action-icon"><AppIcon name="coverLetter" /></span><div><h3>Draft a cover letter</h3><p>Turn your facts into a focused first draft.</p></div><AppIcon name="expand" size={16} /></Card></Link>
        </div>
      </section>
    </main>
  );
};
