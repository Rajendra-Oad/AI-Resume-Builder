import { ModulePage } from "../../../components/ModulePage";
import { useModuleHealth } from "../../../hooks/useModuleHealth";
import { checkAtsHealth } from "../api/atsApi";
export const AtsWorkspace = () => {
  const health = useModuleHealth("ats", checkAtsHealth);
  return (
    <ModulePage
      eyebrow="ANALYSIS"
      title="ATS checker"
      description="Compare a resume with a job description."
      health={health}
    />
  );
};
