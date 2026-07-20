import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("stays absent while closed", () => {
    render(<Modal isOpen={false} title="Confirm" onClose={() => {}}>Body</Modal>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("focuses content and closes with Escape, close button, and backdrop", () => {
    const close = vi.fn();
    const { container } = render(
      <Modal isOpen title="Confirm" onClose={close}><button>Continue</button></Modal>,
    );
    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    fireEvent.mouseDown(container.querySelector(".dialog-backdrop"));
    expect(close).toHaveBeenCalledTimes(3);
  });

  it("wraps keyboard focus inside the dialog", () => {
    render(<Modal isOpen title="Focus" onClose={() => {}}><button>Last action</button></Modal>);
    const closeButton = screen.getByRole("button", { name: "Close dialog" });
    const lastButton = screen.getByRole("button", { name: "Last action" });
    lastButton.focus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });
    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab", shiftKey: true });
    expect(lastButton).toHaveFocus();
  });
});
