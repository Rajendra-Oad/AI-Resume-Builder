import { lazy } from "react";
const TemplatesPage = lazy(() =>
  import("../../pages/TemplatesPage").then((module) => ({ default: module.TemplatesPage })),
);
export const templateRoutes = [{ path: "templates", element: <TemplatesPage /> }];
