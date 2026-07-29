import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationProvider, notify } from "./NotificationProvider";

describe("NotificationProvider", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
  });

  it("announces, updates, and dismisses notifications", async () => {
    render(<NotificationProvider><main>Application</main></NotificationProvider>);
    let id;
    act(() => { id = notify.loading("Generating resume…"); });
    expect(screen.getByText("Generating resume…")).toBeInTheDocument();
    act(() => { notify.update(id, "Resume generated.", { type: "success" }); });
    expect(screen.getByText("Resume generated.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(screen.queryByText("Resume generated.")).not.toBeInTheDocument();
  });

  it("shows only a concise error message without a details panel", () => {
    render(<NotificationProvider><main>Application</main></NotificationProvider>);
    act(() => notify.error({ message: "Save failed.", details: "Request ID: 42", copyError: true }));
    expect(screen.getByText("Save failed.")).toBeInTheDocument();
    expect(screen.queryByText("Request ID: 42")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy error" })).not.toBeInTheDocument();
  });
});
