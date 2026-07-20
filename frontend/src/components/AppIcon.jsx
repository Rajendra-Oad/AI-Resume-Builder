import {
  BarChart03,
  Bell01,
  Briefcase01,
  Edit05,
  File02,
  FileCheck02,
  Home01,
  LayoutGrid01,
  LogOut01,
  Palette,
  Settings01,
  Shield01,
  Stars01,
  Target04,
  User01,
} from "@untitledui/icons";

const icons = {
  admin: Shield01,
  ai: Stars01,
  ats: Target04,
  chart: BarChart03,
  coverLetter: Edit05,
  dashboard: Home01,
  document: File02,
  documentReady: FileCheck02,
  jobs: Briefcase01,
  logout: LogOut01,
  notifications: Bell01,
  profile: User01,
  settings: Settings01,
  templates: Palette,
  workspace: LayoutGrid01,
};

export const AppIcon = ({ name, size = 20, strokeWidth = 1.8, ...props }) => {
  const Icon = icons[name];
  if (!Icon) return null;
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" {...props} />;
};
