import { ModulePage } from "../components/ModulePage";
import { TemplateGallery } from "../features/templates";
export const TemplatesPage = () => (
  <ModulePage
    eyebrow="DESIGN LIBRARY"
    title="Templates"
    description="Preview layouts prepared for the template API."
  >
    <TemplateGallery />
  </ModulePage>
);
