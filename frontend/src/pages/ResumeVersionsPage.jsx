import { useParams } from "react-router-dom";

import { ResumeVersionsPanel } from "../features/resume/components/ResumeVersionsPanel";
export const ResumeVersionsPage=()=>{const {resumeId}=useParams();return <ResumeVersionsPanel resumeId={resumeId}/>;};
