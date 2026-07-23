import { useParams } from "react-router-dom";

import { AtsWorkspace } from "../features/ats/components/AtsWorkspace";
export const ResumeAtsPage=()=>{const {resumeId}=useParams();return <AtsWorkspace initialResumeId={resumeId}/>;};
