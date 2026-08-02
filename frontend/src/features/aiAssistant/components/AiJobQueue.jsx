import { useMemo, useState } from "react";

import { Card } from "../../../components/Card";
import { Input } from "../../../components/Input";
import { Select } from "../../../components/Select";
import { useAiJobQueue } from "../hooks/useAiJob";
import { AiJobDetailsModal } from "./AiJobDetailsModal";
import { AiJobStatus } from "./AiJobStatus";

export const AiJobQueue = () => {
  const jobs = useAiJobQueue();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [workflow, setWorkflow] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const workflows = useMemo(() => [...new Set(jobs.map((job) => job.workflow))].sort(), [jobs]);
  const visible = jobs.filter((job) => {
    const term = search.trim().toLowerCase();
    return (status === "ALL" || job.status === status) &&
      (workflow === "ALL" || job.workflow === workflow) &&
      (!term || `${job.id} ${job.workflow} ${job.label}`.toLowerCase().includes(term));
  });
  return (
    <section aria-labelledby="ai-queue-title">
      <div className="section-header section-header--compact">
        <div><p className="eyebrow">BACKGROUND JOBS</p><h2 id="ai-queue-title">Current-session queue</h2><p className="muted">The backend cannot list historical jobs, so this queue contains requests submitted in this browser session.</p></div>
      </div>
      <div className="ai-queue-filters">
        <Input aria-label="Search AI jobs" placeholder="Search by job ID or workflow" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select aria-label="Filter AI jobs by status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="ALL">All statuses</option>
          <option value="PENDING">Pending</option><option value="PROCESSING">Processing</option><option value="SUCCEEDED">Succeeded</option><option value="FAILED">Failed</option>
        </Select>
        <Select aria-label="Filter AI jobs by workflow" value={workflow} onChange={(event) => setWorkflow(event.target.value)}>
          <option value="ALL">All workflows</option>{workflows.map((item) => <option key={item} value={item}>{item}</option>)}
        </Select>
      </div>
      {visible.length ? <div className="ai-queue-grid">{visible.map((job) => <AiJobStatus key={job.id} entry={job} onSelect={setSelected} />)}</div> : <Card className="empty-state empty-state--compact"><h3>{jobs.length ? "No matching jobs" : "No background jobs yet"}</h3><p>{jobs.length ? "Adjust the filters to see other requests." : "Jobs submitted from the resume editor or cover-letter workspace will appear here."}</p></Card>}
      <AiJobDetailsModal job={selected} onClose={() => setSelected(null)} />
    </section>
  );
};
