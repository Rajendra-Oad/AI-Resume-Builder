import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { RouteErrorBoundary } from "./RouteErrorBoundary";

const BrokenFeature = () => {
  throw new Error("Feature failed");
};

describe("RouteErrorBoundary", () => {
  it("isolates a feature crash and lets the user retry", () => {
    const consoleError = vi.spyOn(globalThis.console, "error").mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={["/feature"]}>
        <Routes>
          <Route
            path="/feature"
            element={
              <RouteErrorBoundary featureName="Resume workspace">
                <BrokenFeature />
              </RouteErrorBoundary>
            }
          />
          <Route path="/dashboard" element={<p>Dashboard content</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Resume workspace could not be displayed");
    fireEvent.click(screen.getByRole("link", { name: "Go to dashboard" }));
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
