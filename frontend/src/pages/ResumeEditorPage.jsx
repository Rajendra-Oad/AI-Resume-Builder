import { useParams } from "react-router-dom";

import { ResumeEditor } from "../features/resume";
export const ResumeEditorPage = () => {
  const { resumeId } = useParams();
  return <ResumeEditor resumeId={resumeId} />;
};
