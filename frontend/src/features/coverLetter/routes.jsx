import { lazy } from "react";
const CoverLetterWorkspace = lazy(() =>
  import("./components/CoverLetterWorkspace").then((module) => ({
    default: module.CoverLetterWorkspace,
  })),
);
export const coverLetterRoutes = [{ path: "cover-letter", element: <CoverLetterWorkspace /> }];
