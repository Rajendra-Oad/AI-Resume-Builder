import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from "../api/notificationApi";
import { NotificationsPanel } from "./NotificationsPanel";

vi.mock("../api/notificationApi", () => ({
  listNotifications: vi.fn(),
  getNotificationPreferences: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  updateNotificationPreferences: vi.fn(),
}));

const renderPanel = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NotificationsPanel />
    </QueryClientProvider>,
  );
};

describe("NotificationsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listNotifications.mockResolvedValue([
      {
        id: 3,
        title: "PDF ready",
        body: "Your resume export is ready.",
        readAt: null,
        createdAt: "2026-07-21T05:30:00Z",
      },
    ]);
    getNotificationPreferences.mockResolvedValue({ emailEnabled: true, inAppEnabled: true, jobAlertsEnabled: true, aiUpdatesEnabled: true });
    markNotificationRead.mockResolvedValue({ id: 3, readAt: "2026-07-21T05:31:00Z" });
    markAllNotificationsRead.mockResolvedValue({ updated: 1 });
    updateNotificationPreferences.mockResolvedValue({ emailEnabled: true, inAppEnabled: true, jobAlertsEnabled: true, aiUpdatesEnabled: true });
  });

  it("loads the real notification collection instead of a health endpoint", async () => {
    renderPanel();

    expect(await screen.findByText("PDF ready")).toBeInTheDocument();
    expect(screen.getByText("Your resume export is ready.")).toBeInTheDocument();
    expect(listNotifications).toHaveBeenCalledWith(false);
  });

  it("marks an owned notification as read", async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Mark PDF ready as read" }));

    await waitFor(() => expect(markNotificationRead).toHaveBeenCalled());
    expect(markNotificationRead.mock.calls[0][0]).toBe(3);
  });
});
