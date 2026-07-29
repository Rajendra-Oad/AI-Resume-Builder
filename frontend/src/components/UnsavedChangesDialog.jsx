import { ConfirmationDialog } from "./ConfirmationDialog";

export const UnsavedChangesDialog = ({ blocker }) => {
  if (blocker.state !== "blocked") return null;
  return (
    <ConfirmationDialog
      isOpen
      title="Leave with unsaved changes?"
      description="Your latest edits have not reached the server yet. Leaving now will discard them."
      cancelLabel="Keep editing"
      confirmLabel="Discard changes"
      tone="danger"
      onCancel={() => blocker.reset()}
      onConfirm={() => blocker.proceed()}
    />
  );
};
