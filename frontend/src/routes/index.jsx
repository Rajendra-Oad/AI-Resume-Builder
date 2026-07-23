import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";

import { PageLoader } from "../components/PageLoader";
import { RouteErrorBoundary } from "../components/RouteErrorBoundary";
import { RouteFocusManager } from "../components/RouteFocusManager";
import { adminRoutes } from "../features/admin/routes";
import { aiAssistantRoutes } from "../features/aiAssistant/routes";
import { atsRoutes } from "../features/ats/routes";
import { authRoutes } from "../features/auth/routes";
import { coverLetterRoutes } from "../features/coverLetter/routes";
import { dashboardRoutes } from "../features/dashboard/routes";
import { jobMatchingRoutes } from "../features/jobMatching/routes";
import { notificationRoutes } from "../features/notifications/routes";
import { profileRoutes } from "../features/profile/routes";
import { resumeRoutes } from "../features/resume/routes";
import { settingsRoutes } from "../features/settings/routes";
import { templateRoutes } from "../features/templates/routes";
import { AuthLayout } from "../layouts/AuthLayout";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { AdminRoute } from "./AdminRoute";
import { GuestRoute } from "./GuestRoute";
import { OnboardingGate } from "./OnboardingGate";
import { ProtectedRoute } from "./ProtectedRoute";
const LandingPage = lazy(() =>
  import("../pages/LandingPage").then((module) => ({ default: module.LandingPage })),
);
const NotFoundPage = lazy(() =>
  import("../pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })),
);
const ForbiddenPage = lazy(() =>
  import("../pages/ForbiddenPage").then((module) => ({ default: module.ForbiddenPage })),
);
const OnboardingPage = lazy(() =>
  import("../pages/OnboardingPage").then((module) => ({ default: module.OnboardingPage })),
);
const RouteRoot = () => (
  <Suspense fallback={<PageLoader />}>
    <RouteFocusManager />
    <Outlet />
  </Suspense>
);
const withFeatureBoundary = (featureName, children) => ({
  element: (
    <RouteErrorBoundary featureName={featureName}>
      <Outlet />
    </RouteErrorBoundary>
  ),
  children,
});

const featureRoutes = [
  withFeatureBoundary("Resume workspace", resumeRoutes),
  withFeatureBoundary("Templates", templateRoutes),
  withFeatureBoundary("ATS workspace", atsRoutes),
  withFeatureBoundary("Job matching", jobMatchingRoutes),
  withFeatureBoundary("Cover letters", coverLetterRoutes),
  withFeatureBoundary("Notifications", notificationRoutes),
  withFeatureBoundary("Profile", profileRoutes),
  withFeatureBoundary("Settings", settingsRoutes),
  withFeatureBoundary("AI assistant", aiAssistantRoutes),
];
const router = createBrowserRouter([
  {
    element: <RouteRoot />,
    children: [
      { index: true, element: <LandingPage /> },
      {
        element: <GuestRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [withFeatureBoundary("Authentication", authRoutes)],
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "onboarding",
            element: (
              <RouteErrorBoundary featureName="Onboarding">
                <OnboardingPage />
              </RouteErrorBoundary>
            ),
          },
          {
            element: <OnboardingGate />,
            children: [{
              element: <DashboardLayout />,
              children: [
                withFeatureBoundary("Dashboard", dashboardRoutes),
                ...featureRoutes,
                {
                  element: <AdminRoute />,
                  children: [withFeatureBoundary("Admin", adminRoutes)],
                },
              ],
            }],
          },
        ],
      },
      { path: "forbidden", element: <ForbiddenPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
export const AppRoutes = () => <RouterProvider router={router} />;
