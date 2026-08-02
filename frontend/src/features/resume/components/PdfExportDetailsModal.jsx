import { Button } from "../../../components/Button";
import { Modal } from "../../../components/Modal";

const formatDateTime = (value) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "short" }).format(new Date(value));

const formatBytes = (value) => {
  if (!Number.isFinite(value) || value < 0) return "Unknown";
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unit]}`;
};

export const PdfExportDetailsModal = ({ exportItem, resumeTitle, onClose }) => (
  <Modal isOpen={Boolean(exportItem)} onClose={onClose} title="PDF export details">
    {exportItem && (
      <>
        <dl className="pdf-export-details">
          <div><dt>File name</dt><dd>{exportItem.fileName}</dd></div>
          <div><dt>Resume</dt><dd>{resumeTitle}</dd></div>
          <div><dt>File size</dt><dd>{formatBytes(exportItem.byteSize)}</dd></div>
          <div><dt>Exported</dt><dd>{formatDateTime(exportItem.createdAt)}</dd></div>
          <div className="pdf-export-details__wide">
            <dt>SHA-256 checksum</dt>
            <dd className="pdf-export-checksum">{exportItem.sha256}</dd>
          </div>
        </dl>
        <div className="dialog-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </>
    )}
  </Modal>
);

export { formatBytes, formatDateTime };
