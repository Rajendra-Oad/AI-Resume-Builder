import { lazy } from "react";
const DashboardWorkspace = lazy(() => import("./components/DashboardWorkspace").then((module) => ({ default: module.DashboardWorkspace })));
export const dashboardRoutes = [{ path: "dashboard", element: <DashboardWorkspace /> }];
