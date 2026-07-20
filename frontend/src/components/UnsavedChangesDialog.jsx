import { Button } from "./Button";

export const UnsavedChangesDialog = ({ blocker }) => {
  if (blocker.state !== "blocked") return null;
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-title"
      >
        <h2 id="unsaved-title">Leave with unsaved changes?</h2>
        <p className="muted">Your latest edits have not reached the server yet.</p>
        <div className="dialog-actions">
          <Button variant="ghost" onClick={() => blocker.reset()}>
            Keep editing
          </Button>
          <Button variant="destructive" onClick={() => blocker.proceed()}>
            Leave page
          </Button>
        </div>
      </section>
    </div>
  );
};
