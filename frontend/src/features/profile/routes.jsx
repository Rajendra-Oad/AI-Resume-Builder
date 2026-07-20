import { lazy } from "react";
const ProfilePanel = lazy(() =>
  import("./components/ProfilePanel").then((module) => ({ default: module.ProfilePanel })),
);
export const profileRoutes = [{ path: "profile", element: <ProfilePanel /> }];
