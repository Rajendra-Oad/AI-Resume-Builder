import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { AppIcon } from "../components/AppIcon";
import { useAuth } from "../context/AuthContext";

export const DashboardPage = () => {
  const { session } = useAuth();
  const name = session?.email?.split("@")[0] ?? "there";
  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">YOUR WORKSPACE</p>
          <h1>Good morning, {name}.</h1>
          <p className="muted">Let’s make your next opportunity happen.</p>
        </div>
        <Link to="/resumes/new">
          <Button>+ New resume</Button>
        </Link>
      </header>
      <section className="welcome-grid">
        <Card className="welcome-card">
          <p className="eyebrow">BUILD WITH CONFIDENCE</p>
          <h2>Small details make a memorable first impression.</h2>
          <p>Use our guided builder to turn your experience into a clear, compelling story.</p>
          <Link to="/resumes/new" className="text-link">
            Start building <span>→</span>
          </Link>
        </Card>
        <Card className="score-card">
          <p>YOUR RESUME HEALTH</p>
          <strong>—</strong>
          <span>Create a resume to see your score</span>
          <div className="score-track">
            <i />
          </div>
        </Card>
      </section>
      <section className="section-header">
        <div>
          <h2>Recent resumes</h2>
          <p className="muted">Pick up where you left off.</p>
        </div>
        <Link className="text-link" to="/resumes">
          View all <span>→</span>
        </Link>
      </section>
      <Card className="empty-state">
        <div className="empty-icon">
          <AppIcon name="document" />
        </div>
        <h3>Your story starts here</h3>
        <p>
          Create your first resume and we’ll guide you from a blank page to a polished final draft.
        </p>
        <Link to="/resumes/new">
          <Button variant="secondary">Create a resume</Button>
        </Link>
      </Card>
    </div>
  );
};
