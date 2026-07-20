import { Card } from "../components/Card";
export const FeaturePlaceholderPage = ({ eyebrow, title, description }) => (
  <div className="dashboard-page">
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
    </header>
    <Card className="empty-state">
      <div className="empty-icon">✦</div>
      <h2>Coming into focus</h2>
      <p>
        This feature has its route and layout ready. Its dedicated feature module can be added
        without changing the rest of the app.
      </p>
    </Card>
  </div>
);
