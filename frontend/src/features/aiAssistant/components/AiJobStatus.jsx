import { Card } from "../../../components/Card";
import { useAiJob } from "../hooks/useAiJob";

const progress = { PENDING: 20, PROCESSING: 65, SUCCEEDED: 100, FAILED: 100 };
const tone = { PENDING: "info", PROCESSING: "warning", SUCCEEDED: "success", FAILED: "danger" };

export const AiJobStatus = ({ entry, onSelect }) => {
  const query = useAiJob(entry.id);
  const job = query.data ?? entry;
  const value = progress[job.status] ?? 10;
  return (
    <Card className="ai-queue-item">
      <button className="ai-queue-item__button" type="button" onClick={() => onSelect({ ...entry, ...job })} aria-label={`View AI job ${entry.id}`}>
        <div className="ai-queue-item__heading">
          <div><strong>{entry.label}</strong><span>{entry.workflow}</span></div>
          <span className={`ai-job-badge ai-job-badge--${tone[job.status] ?? "muted"}`}>{job.status || "UNKNOWN"}</span>
        </div>
        <code>{entry.id}</code>
        <div className="ai-job-progress" role="progressbar" aria-label={`${entry.label} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={value}>
          <i style={{ width: `${value}%` }} />
        </div>
        <small>{query.isFetching && !["SUCCEEDED", "FAILED"].includes(job.status) ? "Checking status…" : job.status === "SUCCEEDED" ? "Result ready" : job.status === "FAILED" ? "Needs attention" : "Processing in background"}</small>
      </button>
    </Card>
  );
};
