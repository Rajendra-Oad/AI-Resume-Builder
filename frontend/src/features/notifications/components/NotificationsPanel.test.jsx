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

  it("updates a notification delivery preference", async () => {
    renderPanel();
    fireEvent.click(await screen.findByLabelText("Email notifications"));

    await waitFor(() => expect(updateNotificationPreferences).toHaveBeenCalled());
    expect(updateNotificationPreferences.mock.calls[0][0]).toEqual(expect.objectContaining({ emailEnabled: false }));
  });

  it("filters the inbox and marks all notifications as read", async () => {
    listNotifications.mockImplementation((unreadOnly) => Promise.resolve(unreadOnly ? [] : [{
      id: 3,
      title: "PDF ready",
      body: "Your resume export is ready.",
      readAt: null,
      createdAt: "2026-07-21T05:30:00Z",
    }]));
    renderPanel();

    await screen.findByText("PDF ready");
    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText("Unread only"));
    expect(await screen.findByText("No unread notifications")).toBeInTheDocument();
    expect(listNotifications).toHaveBeenCalledWith(true);
  });

  it("shows the empty inbox state", async () => {
    listNotifications.mockResolvedValue([]);
    renderPanel();

    expect(await screen.findByText("Your inbox is clear")).toBeInTheDocument();
  });

  it("renders a read notification without unread actions", async () => {
    listNotifications.mockResolvedValue([{
      id: 4,
      title: "Profile updated",
      body: "Your profile changes were saved.",
      readAt: "2026-07-21T05:31:00Z",
      createdAt: null,
    }]);
    renderPanel();

    expect(await screen.findByText("Profile updated")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark Profile updated as read" })).not.toBeInTheDocument();
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });

  it("shows an error when marking all notifications as read fails", async () => {
    markAllNotificationsRead.mockRejectedValue(new Error("Unable to update notifications."));
    renderPanel();

    await screen.findByText("PDF ready");
    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to update notifications.");
  });

  it("shows an error when marking a notification as read fails", async () => {
    markNotificationRead.mockRejectedValue(new Error("Unable to mark notification as read."));
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Mark PDF ready as read" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to mark notification as read.");
  });

  it("shows an error when updating delivery preferences fails", async () => {
    updateNotificationPreferences.mockRejectedValue(new Error("Unable to update preferences."));
    renderPanel();

    fireEvent.click(await screen.findByLabelText("Email notifications"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to update preferences.");
  });

  it("shows progress while marking all notifications as read", async () => {
    markAllNotificationsRead.mockImplementation(() => new Promise(() => {}));
    renderPanel();

    await screen.findByText("PDF ready");
    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));

    expect(await screen.findByText("Updating…")).toBeInTheDocument();
  });
});
