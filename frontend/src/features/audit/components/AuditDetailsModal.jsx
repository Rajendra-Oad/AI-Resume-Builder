import { Button } from "../../../components/Button";
import { Modal } from "../../../components/Modal";

export const parseAuditState = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
};

const StateBlock = ({ label, value }) => {
  const parsed = parseAuditState(value);
  return (
    <div className="audit-state-block">
      <dt>{label}</dt>
      <dd>{parsed === null ? <span className="muted">Not available</span> : <pre>{typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2)}</pre>}</dd>
    </div>
  );
};

const timestamp = (value) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "long" }).format(new Date(value));

export const AuditDetailsModal = ({ entry, onClose }) => (
  <Modal isOpen={Boolean(entry)} onClose={onClose} title="Activity details">
    {entry && <>
      <dl className="audit-detail-grid">
        <div><dt>Action</dt><dd>{entry.action}</dd></div>
        <div><dt>Entity</dt><dd>{entry.entityType} #{entry.entityId}</dd></div>
        <div><dt>Timestamp</dt><dd>{timestamp(entry.createdAt)}</dd></div>
        <div><dt>IP address</dt><dd>{entry.ipAddress || "Not recorded"}</dd></div>
        <StateBlock label="Before state" value={entry.beforeState} />
        <StateBlock label="After state" value={entry.afterState} />
      </dl>
      <div className="dialog-actions"><Button type="button" onClick={onClose}>Done</Button></div>
    </>}
  </Modal>
);
