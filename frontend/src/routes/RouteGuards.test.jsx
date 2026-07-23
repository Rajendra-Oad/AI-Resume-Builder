import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminRoute } from "./AdminRoute";
import { GuestRoute } from "./GuestRoute";
import { ProtectedRoute } from "./ProtectedRoute";

const state = vi.hoisted(() => ({ auth: {} }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => state.auth }));

const renderRoutes = (guard, initial = "/private") => render(
  <MemoryRouter initialEntries={[initial]}>
    <Routes>
      <Route element={guard}>
        <Route path="/private" element={<p>Private content</p>} />
      </Route>
      <Route path="/login" element={<p>Login page</p>} />
      <Route path="/dashboard" element={<p>Dashboard</p>} />
      <Route path="/forbidden" element={<p>Forbidden</p>} />
    </Routes>
  </MemoryRouter>,
);

describe("route guards", () => {
  beforeEach(() => { state.auth = {}; });

  it("shows a loader while restoring a protected session", () => {
    state.auth = { isInitializing: true, isAuthenticated: false };
    renderRoutes(<ProtectedRoute />);
    expect(screen.getByRole("status", { name: "Loading page" })).toBeInTheDocument();
  });

  it("redirects anonymous users and permits authenticated users", () => {
    state.auth = { isInitializing: false, isAuthenticated: false };
    const first = renderRoutes(<ProtectedRoute />);
    expect(screen.getByText("Login page")).toBeInTheDocument();
    first.unmount();
    state.auth = { isInitializing: false, isAuthenticated: true };
    renderRoutes(<ProtectedRoute />);
    expect(screen.getByText("Private content")).toBeInTheDocument();
  });

  it("permits administrators and rejects other roles", () => {
    state.auth = { session: { role: "USER" } };
    const first = renderRoutes(<AdminRoute />);
    expect(screen.getByText("Forbidden")).toBeInTheDocument();
    first.unmount();
    state.auth = { session: { role: "ADMIN" } };
    renderRoutes(<AdminRoute />);
    expect(screen.getByText("Private content")).toBeInTheDocument();
  });

  it("keeps guests out of the dashboard and signed-in users out of guest routes", () => {
    state.auth = { isAuthenticated: false };
    const first = renderRoutes(<GuestRoute />);
    expect(screen.getByText("Private content")).toBeInTheDocument();
    first.unmount();
    state.auth = { isAuthenticated: true };
    renderRoutes(<GuestRoute />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
