import { lazy } from "react";

const ResumesPage = lazy(() =>
  import("../../pages/ResumesPage").then((module) => ({ default: module.ResumesPage })),
);
const ResumeEditorPage = lazy(() =>
  import("../../pages/ResumeEditorPage").then((module) => ({ default: module.ResumeEditorPage })),
);

export const resumeRoutes = [
  { path: "resumes", element: <ResumesPage /> },
  { path: "resumes/new", element: <ResumeEditorPage /> },
  { path: "resumes/:resumeId", element: <ResumeEditorPage /> },
];
