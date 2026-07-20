import { lazy } from "react";
const SettingsForm = lazy(() =>
  import("./components/SettingsForm").then((module) => ({ default: module.SettingsForm })),
);
export const settingsRoutes = [{ path: "settings", element: <SettingsForm /> }];
