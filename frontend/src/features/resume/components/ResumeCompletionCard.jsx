import { Card } from "../../../components/Card";
import { COMPLETION_STATUS } from "../completion/completionConfig";

const statusLabel = {
  [COMPLETION_STATUS.COMPLETE]: "Complete",
  [COMPLETION_STATUS.NEEDS_IMPROVEMENT]: "Needs improvement",
  [COMPLETION_STATUS.INCOMPLETE]: "Incomplete",
};

export const ResumeCompletionCard = ({ completion, onSectionSelect }) => (
  <Card className="resume-completion-card">
    <div className="completion-heading">
      <div>
        <p className="eyebrow">RESUME COMPLETION</p>
        <h2>{completion.overall}% complete</h2>
        <p className="muted">{completion.completedCount} of {completion.sections.length} sections ready · about {completion.estimatedMinutes} min left</p>
      </div>
      <div className="completion-ring" style={{ "--completion": `${completion.overall * 3.6}deg` }} role="img" aria-label={`${completion.overall}% resume completion`}>
        <span>{completion.overall}%</span>
      </div>
    </div>
    <div className="completion-linear" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={completion.overall}>
      <i style={{ width: `${completion.overall}%` }} />
    </div>
    <div className="completion-sections">
      {completion.sections.map((section) => (
        <button key={section.id} type="button" className={`completion-section completion-section--${section.status}`} onClick={() => onSectionSelect?.(section.id)}>
          <span className="completion-status-icon" aria-hidden="true">{section.status === "complete" ? "✓" : section.status === "incomplete" ? "×" : "!"}</span>
          <span><strong>{section.label}</strong><small>{statusLabel[section.status]} · {section.completion}%</small></span>
        </button>
      ))}
    </div>
    {completion.remainingItems.length > 0 && <div className="completion-tasks">
      <h3>Best next steps</h3>
      <ul>{completion.remainingItems.slice(0, 4).map((item, index) => <li key={`${item.sectionId}-${index}`}>{item.text}</li>)}</ul>
    </div>}
    {completion.isComplete && <p className="completion-celebration" role="status">Your resume is complete and ready to share.</p>}
  </Card>
);
