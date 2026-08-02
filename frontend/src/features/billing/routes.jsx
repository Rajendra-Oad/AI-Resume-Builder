import { lazy } from "react";

const BillingWorkspace = lazy(() =>
  import("./components/BillingWorkspace").then((module) => ({ default: module.BillingWorkspace })),
);

export const billingRoutes = [{ path: "billing", element: <BillingWorkspace /> }];
