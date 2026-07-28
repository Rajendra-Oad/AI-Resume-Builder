import { LogOut, ShieldAlert, TriangleAlert, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { Button } from "./Button";

const icons = { danger: ShieldAlert, warning: TriangleAlert, logout: LogOut };

export const ConfirmationDialog = ({
  isOpen, onCancel, onConfirm, title, description, confirmLabel = "Confirm",
  cancelLabel = "Cancel", tone = "warning", isPending = false, children,
}) => {
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const Icon = icons[tone] ?? TriangleAlert;
  useEffect(() => {
    if (!isOpen) return undefined;
    triggerRef.current = document.activeElement;
    const dialog = dialogRef.current;
    const controls = () => [...dialog.querySelectorAll("button,[href],[tabindex]:not([tabindex='-1'])")];
    controls()[0]?.focus();
    const keydown = (event) => {
      if (event.key === "Escape" && !isPending) onCancel();
      if (event.key !== "Tab") return;
      const items = controls(), first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    dialog.addEventListener("keydown", keydown);
    return () => { dialog.removeEventListener("keydown", keydown); triggerRef.current?.focus(); };
  }, [isOpen, isPending, onCancel]);
  if (!isOpen) return null;
  return (
    <div className="dialog-backdrop confirmation-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !isPending && onCancel()}>
      <section ref={dialogRef} className="dialog confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <button className="confirmation-dialog__close" onClick={onCancel} disabled={isPending} aria-label="Close dialog"><X /></button>
        <div className={`confirmation-dialog__icon confirmation-dialog__icon--${tone}`} aria-hidden="true"><Icon /></div>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId} className="muted">{description}</p>
        {children}
        <div className="dialog-actions">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>{cancelLabel}</Button>
          <Button type="button" variant={tone === "danger" ? "destructive" : "primary"} onClick={onConfirm} disabled={isPending}>{isPending ? "Please wait…" : confirmLabel}</Button>
        </div>
      </section>
    </div>
  );
};
