import { ModulePage } from "../../../components/ModulePage";
import { useModuleHealth } from "../../../hooks/useModuleHealth";
import { checkJobHealth } from "../api/jobApi";
export const JobMatchingWorkspace = () => {
  const health = useModuleHealth("jobs", checkJobHealth);
  return (
    <ModulePage
      eyebrow="OPPORTUNITIES"
      title="Job matches"
      description="Discover roles aligned with your experience."
      health={health}
    />
  );
};
