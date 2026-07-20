import { lazy } from "react";
const JobMatchingWorkspace = lazy(() =>
  import("./components/JobMatchingWorkspace").then((module) => ({
    default: module.JobMatchingWorkspace,
  })),
);
export const jobMatchingRoutes = [{ path: "job-matching", element: <JobMatchingWorkspace /> }];
