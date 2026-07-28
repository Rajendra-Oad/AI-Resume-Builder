import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AppIcon } from "../../../components/AppIcon";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Modal } from "../../../components/Modal";
import { deleteResume, duplicateResume } from "../api/resumeApi";

export const ResumeCard = ({ resume }) => {
  const [message, setMessage] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const duplicate = useMutation({
    mutationFn: () => duplicateResume(resume.id),
    onSuccess: async (copy) => {
      await queryClient.invalidateQueries({ queryKey: ["resumes"] });
      navigate(`/resumes/${copy.id}`, { state: { notice: `Created “${copy.title}”. Rename it whenever you’re ready.` } });
    },
    onError: (error) => setMessage(error.message),
  });
  const remove = useMutation({
    mutationFn: () => deleteResume(resume.id),
    onSuccess: () => {
      queryClient.setQueryData(["resumes"], (current) =>
        Array.isArray(current) ? current.filter((item) => item.id !== resume.id) : current,
      );
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      setConfirmingDelete(false);
    },
    onError: (error) => setMessage(error.message),
  });
  const closeDeleteDialog = () => {
    if (!remove.isPending) setConfirmingDelete(false);
  };

  return (
    <Card className="resume-card">
      <div className="document-thumbnail"><AppIcon name="documentReady" /><i /><i /><i /><i /></div>
      <div className="resume-card__content">
        <p className="eyebrow">DRAFT</p>
        <h3>{resume.title}</h3>
        <p>{resume.summary || "No professional summary yet."}</p>
        <div className="resume-card__actions">
          <Link to={`/resumes/${resume.id}`} className="resume-card__edit-action">
            <AppIcon name="coverLetter" size={17} />
            <span>Continue editing</span>
            <AppIcon name="expand" size={16} className="resume-card__edit-arrow" />
          </Link>
          <div className="resume-card__utilities">
            <Button
              type="button"
              variant="ghost"
              className="resume-card__icon-action"
              aria-label={duplicate.isPending ? "Duplicating resume" : "Duplicate resume"}
              title={duplicate.isPending ? "Duplicating resume…" : "Duplicate resume"}
              disabled={duplicate.isPending || remove.isPending}
              onClick={() => {
                setMessage("");
                duplicate.mutate();
              }}
            >
              <AppIcon name="copy" size={16} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="resume-card__icon-action resume-card__icon-action--danger"
              aria-label="Delete"
              title="Delete resume"
              disabled={duplicate.isPending || remove.isPending}
              onClick={() => {
                setMessage("");
                setConfirmingDelete(true);
              }}
            >
              <AppIcon name="trash" size={16} />
            </Button>
          </div>
        </div>
        {message && !confirmingDelete && <p className="resume-card__error" role="alert">{message}</p>}
      </div>
      <Modal isOpen={confirmingDelete} onClose={closeDeleteDialog} title="Delete this resume?">
        <p className="dialog-copy">You’re about to remove <strong>“{resume.title}”</strong> from your workspace.</p>
        <p className="dialog-supporting">It will move to Recently Deleted, where you can restore it for 30 days. Your other resumes and exported files will not be affected.</p>
        {remove.isError && <p className="form-error" role="alert">{message || "We couldn’t delete this resume. Please try again."}</p>}
        <div className="dialog-actions">
          <Button type="button" variant="secondary" disabled={remove.isPending} onClick={closeDeleteDialog}>Keep resume</Button>
          <Button type="button" variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate()}>
            <AppIcon name="trash" size={16} />
            {remove.isPending ? "Deleting…" : "Delete resume"}
          </Button>
        </div>
      </Modal>
    </Card>
  );
};
