import { ModulePage } from "../components/ModulePage";
import { TemplateGallery } from "../features/templates";
export const TemplatesPage = () => (
  <ModulePage
    eyebrow="DESIGN LIBRARY"
    title="Templates"
    description="Choose an active layout and apply it directly to one of your resumes."
  >
    <TemplateGallery />
  </ModulePage>
);
