import { lazy } from "react";
const AdminManagementPanel = lazy(() =>
  import("./components/AdminManagementPanel").then((module) => ({ default: module.AdminManagementPanel })),
);
export const adminRoutes = [{ path: "admin", element: <AdminManagementPanel /> }];
