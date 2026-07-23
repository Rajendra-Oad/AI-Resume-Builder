import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AsyncState } from "./AsyncState";

describe("AsyncState", () => {
  it("renders loading placeholders before content", () => {
    const { container } = render(<AsyncState isLoading>Ready</AsyncState>);
    expect(container.querySelectorAll(".skeleton")).toHaveLength(2);
    expect(screen.queryByText("Ready")).not.toBeInTheDocument();
  });

  it("shows an actionable error", () => {
    const retry = vi.fn();
    render(<AsyncState error="Request failed" onRetry={retry}>Ready</AsyncState>);
    expect(screen.getByRole("alert")).toHaveTextContent("Request failed");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("renders children after loading succeeds", () => {
    render(<AsyncState><p>Ready</p></AsyncState>);
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });
});
