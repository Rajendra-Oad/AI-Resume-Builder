import { lazy } from "react";
const AtsWorkspace = lazy(() =>
  import("./components/AtsWorkspace").then((module) => ({ default: module.AtsWorkspace })),
);
export const atsRoutes = [{ path: "ats", element: <AtsWorkspace /> }];
