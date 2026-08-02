import { lazy } from "react";

const AuditHistoryWorkspace = lazy(() =>
  import("./components/AuditHistoryWorkspace").then((module) => ({ default: module.AuditHistoryWorkspace })),
);

export const auditRoutes = [{ path: "activity", element: <AuditHistoryWorkspace /> }];
