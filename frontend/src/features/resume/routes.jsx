import { lazy } from "react";

const ResumesPage = lazy(() =>
  import("../../pages/ResumesPage").then((module) => ({ default: module.ResumesPage })),
);
const ResumeEditorPage = lazy(() =>
  import("../../pages/ResumeEditorPage").then((module) => ({ default: module.ResumeEditorPage })),
);
const RecentlyDeletedPage = lazy(() =>
  import("../../pages/RecentlyDeletedPage").then((module) => ({ default: module.RecentlyDeletedPage })),
);
const ResumePreviewPage=lazy(()=>import("../../pages/ResumePreviewPage").then((module)=>({default:module.ResumePreviewPage})));
const ResumeVersionsPage=lazy(()=>import("../../pages/ResumeVersionsPage").then((module)=>({default:module.ResumeVersionsPage})));
const ResumeVersionDetailPage=lazy(()=>import("../../pages/ResumeVersionDetailPage").then((module)=>({default:module.ResumeVersionDetailPage})));
const ResumeAtsPage=lazy(()=>import("../../pages/ResumeAtsPage").then((module)=>({default:module.ResumeAtsPage})));

export const resumeRoutes = [
  { path: "resumes", element: <ResumesPage /> },
  { path: "resumes/deleted", element: <RecentlyDeletedPage /> },
  { path: "resumes/new", element: <ResumeEditorPage /> },
  { path: "resumes/:resumeId", element: <ResumeEditorPage /> },
  { path: "resumes/:resumeId/edit", element: <ResumeEditorPage /> },
  { path: "resumes/:resumeId/preview", element: <ResumePreviewPage /> },
  { path: "resumes/:resumeId/ats-check", element: <ResumeAtsPage /> },
  { path: "resumes/:resumeId/versions", element: <ResumeVersionsPage /> },
  { path: "resumes/:resumeId/versions/:versionId", element: <ResumeVersionDetailPage /> },
];
