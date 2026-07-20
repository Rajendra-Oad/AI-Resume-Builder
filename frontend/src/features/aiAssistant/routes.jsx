import { lazy } from "react";
const AiAssistantPanel = lazy(() =>
  import("./components/AiAssistantPanel").then((module) => ({ default: module.AiAssistantPanel })),
);
export const aiAssistantRoutes = [{ path: "ai-assistant", element: <AiAssistantPanel /> }];
