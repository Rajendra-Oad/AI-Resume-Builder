import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { completeOnboarding, getProfile, updateProfile } from "../api/profileApi";
import { ProfilePanel } from "./ProfilePanel";

vi.mock("../api/profileApi", () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  completeOnboarding: vi.fn(),
  uploadProfilePhoto: vi.fn(),
  deleteProfilePhoto: vi.fn(),
  getProfilePhoto: vi.fn(),
}));

const profile = {
  publicId: "d7cc4df2-afd5-45c8-9f4b-78d718442fb7",
  firstName: "Asha",
  lastName: "Rao",
  email: "asha@example.com",
  role: "USER",
  displayName: "Asha",
  phone: "",
  location: "Bengaluru",
};

const renderPanel = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ProfilePanel />
    </QueryClientProvider>,
  );
};

describe("ProfilePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProfile.mockResolvedValue(profile);
  });

  it("renders structured profile fields instead of the response object", async () => {
    renderPanel();

    expect(await screen.findByLabelText("First name")).toHaveValue("Asha");
    expect(screen.getByLabelText("Last name")).toHaveValue("Rao");
    expect(screen.getByText("asha@example.com")).toBeInTheDocument();
    expect(screen.getByText(profile.publicId)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Bengaluru")).toBeInTheDocument();
  });

  it("updates the structured profile contract", async () => {
    updateProfile.mockImplementation(async (request) => ({ ...profile, ...request }));
    completeOnboarding.mockImplementation(async (request) => ({ ...profile, ...request }));
    renderPanel();
    const location = await screen.findByLabelText("Location");

    fireEvent.change(location, { target: { name: "location", value: "Mysuru" } });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalled());
    expect(updateProfile.mock.calls[0][0]).toEqual(expect.objectContaining({ location: "Mysuru" }));
    expect(await screen.findByText("Profile updated successfully.")).toBeInTheDocument();
  });
});
