import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { useDashboardWorkspace } from "../hooks/useDashboardWorkspace";
import { DashboardWorkspace } from "./DashboardWorkspace";

vi.mock("../hooks/useDashboardWorkspace", () => ({ useDashboardWorkspace: vi.fn() }));

describe("DashboardWorkspace analytics", () => {
  it("renders persisted analytics instead of placeholder metrics", () => {
    useDashboardWorkspace.mockReturnValue({
      name: "Alex",
      resumeCount: 2,
      recent: [],
      resumes: { data: [], isLoading: false, error: null, refresh: vi.fn() },
      analytics: {
        data: {
          totals: {
            resumesCreated: 3,
            atsReports: 4,
            averageAtsScore: 81.6,
            aiRequests: 7,
            aiTokens: 1200,
            pdfExports: 5,
          },
        },
        isLoading: false,
        isError: false,
      },
    });

    render(<MemoryRouter><DashboardWorkspace /></MemoryRouter>);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("82%")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.queryByText("84")).not.toBeInTheDocument();
  });
});
