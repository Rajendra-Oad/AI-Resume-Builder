import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteResume } from "../api/resumeApi";
import { ResumeCard } from "./ResumeCard";

vi.mock("../api/resumeApi", () => ({ deleteResume: vi.fn(), duplicateResume: vi.fn() }));

const resume = { id: 12, title: "Product Designer", summary: "Design systems specialist" };
const renderCard = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(["resumes"], [resume]);
  return { client, ...render(<QueryClientProvider client={client}><MemoryRouter><ResumeCard resume={resume} /></MemoryRouter></QueryClientProvider>) };
};

describe("ResumeCard deletion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires explicit confirmation before deleting", async () => {
    deleteResume.mockResolvedValue({});
    const { client } = renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("dialog", { name: "Delete this resume?" })).toBeInTheDocument();
    expect(deleteResume).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete resume" }));
    await waitFor(() => expect(deleteResume).toHaveBeenCalledWith(12));
    await waitFor(() => expect(client.getQueryData(["resumes"])).toEqual([]));
  });

  it("cancels without deleting", () => {
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep resume" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleteResume).not.toHaveBeenCalled();
  });
});
