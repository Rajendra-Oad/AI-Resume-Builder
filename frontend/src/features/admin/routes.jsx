import { lazy } from "react";
const PromptAdminPanel = lazy(() =>
  import("./components/PromptAdminPanel").then((module) => ({ default: module.PromptAdminPanel })),
);
export const adminRoutes = [{ path: "admin", element: <PromptAdminPanel /> }];
