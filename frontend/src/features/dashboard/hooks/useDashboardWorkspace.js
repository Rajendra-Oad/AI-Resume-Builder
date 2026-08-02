import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../../context/AuthContext";
import { useResumes } from "../../resume";
import { getDashboardAnalytics } from "../api/analyticsApi";

export const useDashboardWorkspace = () => {
  const { session } = useAuth();
  const resumes = useResumes();
  const analytics = useQuery({ queryKey: ["dashboard-analytics"], queryFn: getDashboardAnalytics });
  return {
    name: session?.email?.split("@")[0] ?? "there",
    resumes,
    recent: resumes.data.slice(0, 2),
    resumeCount: resumes.data.length,
    analytics,
  };
};
