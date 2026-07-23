import { useAuth } from "../../../context/AuthContext";
import { useResumes } from "../../resume";

export const useDashboardWorkspace = () => {
  const { session } = useAuth();
  const resumes = useResumes();
  return {
    name: session?.email?.split("@")[0] ?? "there",
    resumes,
    recent: resumes.data.slice(0, 2),
    resumeCount: resumes.data.length,
  };
};
