import { useParams } from "react-router-dom";

import { ResumeVersionDetail } from "../features/resume/components/ResumeVersionDetail";
export const ResumeVersionDetailPage=()=>{const {resumeId,versionId}=useParams();return <ResumeVersionDetail resumeId={resumeId} versionId={versionId}/>;};
