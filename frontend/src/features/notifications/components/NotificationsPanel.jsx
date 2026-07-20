import { ModulePage } from "../../../components/ModulePage";
import { useModuleHealth } from "../../../hooks/useModuleHealth";
import { checkNotificationHealth } from "../api/notificationApi";
export const NotificationsPanel = () => {
  const health = useModuleHealth("notifications", checkNotificationHealth);
  return (
    <ModulePage
      eyebrow="INBOX"
      title="Notifications"
      description="Updates about documents, exports, and AI jobs."
      health={health}
    />
  );
};
