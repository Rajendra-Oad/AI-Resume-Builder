import { useState } from "react";

import { Button } from "../../../components/Button";
import { Modal } from "../../../components/Modal";
import { notify } from "../../../components/NotificationProvider";

const submitted = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export const AiJobDetailsModal = ({ job, onClose }) => {
  const [copying, setCopying] = useState(false);
  const copy = async () => {
    setCopying(true);
    try {
      await window.navigator.clipboard.writeText(job.content);
      notify.success({ title: "Result copied", message: "The generated content is on your clipboard." });
    } catch {
      notify.error({ title: "Copy failed", message: "Your browser did not allow clipboard access." });
    } finally {
      setCopying(false);
    }
  };
  return (
    <Modal isOpen={Boolean(job)} onClose={onClose} title="AI job details">
      {job && <>
        <dl className="ai-job-details">
          <div><dt>Job ID</dt><dd><code>{job.id}</code></dd></div>
          <div><dt>Workflow</dt><dd>{job.workflow}</dd></div>
          <div><dt>Status</dt><dd>{job.status || "UNKNOWN"}</dd></div>
          <div><dt>Submitted in this session</dt><dd>{submitted(job.submittedAt)}</dd></div>
        </dl>
        {job.error && <div className="notice notice--error" role="alert"><p>{job.error}</p></div>}
        <section className="ai-job-result" aria-labelledby="ai-job-result-title">
          <h3 id="ai-job-result-title">Generated result</h3>
          <pre>{job.content || "No generated result is available yet."}</pre>
        </section>
        <p className="muted">Provider, token, cost, latency, resume association, and server timestamps are not returned by the job API.</p>
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={copy} disabled={!job.content || copying}>{copying ? "Copying…" : "Copy result"}</Button>
        </div>
      </>}
    </Modal>
  );
};
