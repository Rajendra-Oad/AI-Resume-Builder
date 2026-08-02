import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PdfExportHistoryPage } from "./PdfExportHistoryPage";

const { exportRecords } = vi.hoisted(() => ({
  exportRecords: [
    { id: 1, resumeId: 9, fileName: "senior-engineer.pdf", byteSize: 2048, sha256: "a".repeat(64), createdAt: "2026-07-20T10:00:00Z" },
    { id: 2, resumeId: 9, fileName: "product-resume.pdf", byteSize: 1024, sha256: "b".repeat(64), createdAt: "2026-07-10T10:00:00Z" },
  ],
}));

vi.mock("../features/resume/api/resumeApi", () => ({
  getResume: vi.fn().mockResolvedValue({ id: 9, title: "Senior Engineer" }),
  listPdfExports: vi.fn().mockResolvedValue(exportRecords),
  downloadResumePdf: vi.fn(),
}));
vi.mock("../components/NotificationProvider", () => ({
  notify: { export: vi.fn(), error: vi.fn() },
}));

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/resumes/9/exports"]}>
        <Routes><Route path="/resumes/:resumeId/exports" element={<PdfExportHistoryPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("PDF export history", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders history and opens complete export details", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("senior-engineer.pdf")).toBeInTheDocument();
    expect(screen.getAllByText("Senior Engineer").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "View details for senior-engineer.pdf" }));

    expect(screen.getByRole("dialog", { name: "PDF export details" })).toBeInTheDocument();
    expect(screen.getByText("a".repeat(64))).toBeInTheDocument();
  });

  it("searches records and explains an empty filtered result", async () => {
    const user = userEvent.setup();
    renderPage();
    const search = await screen.findByPlaceholderText("Resume or file name");

    await user.type(search, "missing-file");
    await waitFor(() => expect(screen.getByText("No exports match your search or filters.")).toBeInTheDocument());
  });
});
