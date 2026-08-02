import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

import { getAiJob } from "../api/aiAssistantApi";
import { registerAiJob } from "../hooks/useAiJob";
import { AiJobQueue } from "./AiJobQueue";

vi.mock("../api/aiAssistantApi", () => ({ getAiJob: vi.fn(), submitAiJob: vi.fn() }));

describe("AiJobQueue", () => {
  it("shows current-session jobs, filters them, and opens details accessibly", async () => {
    const job = { id: "queue-job-42", status: "SUCCEEDED", content: "Generated result", error: null };
    getAiJob.mockResolvedValue(job);
    registerAiJob(job, { workflow: "cover-letter", label: "Cover-letter draft" });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={client}><AiJobQueue /></QueryClientProvider>,
    );

    expect(await screen.findByText("Cover-letter draft")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search AI jobs"), { target: { value: "missing" } });
    expect(screen.getByText("No matching jobs")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search AI jobs"), { target: { value: "queue-job" } });
    fireEvent.click(await screen.findByRole("button", { name: "View AI job queue-job-42" }));
    expect(screen.getByRole("dialog", { name: "AI job details" })).toBeInTheDocument();
    expect(screen.getByText("Generated result", { selector: "pre" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
