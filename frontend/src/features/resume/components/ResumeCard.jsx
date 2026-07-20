import { Link } from "react-router-dom";
import { Card } from "../../../components/Card";
import { AppIcon } from "../../../components/AppIcon";

export const ResumeCard = ({ resume }) => (
  <Card className="resume-card">
    <div className="document-thumbnail">
      <AppIcon name="documentReady" />
      <i />
      <i />
      <i />
      <i />
    </div>
    <div className="resume-card__content">
      <p className="eyebrow">DRAFT</p>
      <h3>{resume.title}</h3>
      <p>{resume.summary || "No professional summary yet."}</p>
      <Link to={`/resumes/${resume.id}`} className="text-link">
        Continue editing <span>→</span>
      </Link>
    </div>
  </Card>
);
