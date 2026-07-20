import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import { PageLoader } from "../components/PageLoader";
import { RouteFocusManager } from "../components/RouteFocusManager";
import { adminRoutes } from "../features/admin/routes";
import { aiAssistantRoutes } from "../features/aiAssistant/routes";
import { atsRoutes } from "../features/ats/routes";
import { authRoutes } from "../features/auth/routes";
import { coverLetterRoutes } from "../features/coverLetter/routes";
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
import { ProtectedRoute } from "./ProtectedRoute";
const LandingPage = lazy(() =>
  import("../pages/LandingPage").then((module) => ({ default: module.LandingPage })),
);
const DashboardPage = lazy(() =>
  import("../pages/DashboardPage").then((module) => ({ default: module.DashboardPage })),
);
const NotFoundPage = lazy(() =>
  import("../pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })),
);
const ForbiddenPage = lazy(() =>
  import("../pages/ForbiddenPage").then((module) => ({ default: module.ForbiddenPage })),
);
const RouteRoot = () => (
  <Suspense fallback={<PageLoader />}>
    <RouteFocusManager />
    <Outlet />
  </Suspense>
);
const featureRoutes = [
  ...resumeRoutes,
  ...templateRoutes,
  ...atsRoutes,
  ...jobMatchingRoutes,
  ...coverLetterRoutes,
  ...notificationRoutes,
  ...profileRoutes,
  ...settingsRoutes,
  ...aiAssistantRoutes,
];
const router = createBrowserRouter([
  {
    element: <RouteRoot />,
    children: [
      { index: true, element: <LandingPage /> },
      { element: <GuestRoute />, children: [{ element: <AuthLayout />, children: authRoutes }] },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { path: "dashboard", element: <DashboardPage /> },
              ...featureRoutes,
              { element: <AdminRoute />, children: adminRoutes },
            ],
          },
        ],
      },
      { path: "forbidden", element: <ForbiddenPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
export const AppRoutes = () => <RouterProvider router={router} />;
