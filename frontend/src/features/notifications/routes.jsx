import { lazy } from "react";
const NotificationsPanel = lazy(() =>
  import("./components/NotificationsPanel").then((module) => ({
    default: module.NotificationsPanel,
  })),
);
export const notificationRoutes = [{ path: "notifications", element: <NotificationsPanel /> }];
