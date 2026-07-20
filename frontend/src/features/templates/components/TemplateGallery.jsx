import { Card } from "../../../components/Card";

const templates = [
  { id: "classic", name: "Classic", description: "A traditional single-column layout." },
  { id: "modern", name: "Modern", description: "Clean hierarchy with strong section labels." },
  { id: "compact", name: "Compact", description: "Space-efficient for experienced candidates." },
];
export const TemplateGallery = () => (
  <div className="resume-grid">
    {templates.map((template) => (
      <Card key={template.id}>
        <div className={`template-preview template-preview--${template.id}`} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <h2>{template.name}</h2>
        <p className="muted">{template.description}</p>
        <span className="status-pill">Preview only</span>
      </Card>
    ))}
  </div>
);
