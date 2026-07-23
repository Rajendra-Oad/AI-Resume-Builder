import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AppIcon } from "../../../components/AppIcon";
import { AsyncState } from "../../../components/AsyncState";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Checkbox } from "../../../components/Checkbox";
import { ModulePage } from "../../../components/ModulePage";
import { ListSkeleton } from "../../../components/Skeleton";
import {
  listNotifications,
  getNotificationPreferences,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from "../api/notificationApi";

const createdLabel = (value) => {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
};

export const NotificationsPanel = () => {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: () => listNotifications(unreadOnly),
  });
  const preferences = useQuery({ queryKey: ["notification-preferences"], queryFn: getNotificationPreferences });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });
  const readMutation = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });
  const readAllMutation = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh });
  const preferenceMutation = useMutation({ mutationFn: updateNotificationPreferences, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-preferences"] }) });
  const notifications = query.data ?? [];
  const unreadCount = notifications.filter((item) => !item.readAt).length;

  return (
    <ModulePage
      eyebrow="INBOX"
      title="Notifications"
      description="Updates about documents, exports, and AI jobs."
    >
      <Card>
        <h2>Delivery preferences</h2>
        <AsyncState isLoading={preferences.isLoading} error={preferences.error?.message} onRetry={preferences.refetch}>
          {preferences.data && <div className="notification-toolbar">{[["emailEnabled", "Email notifications"], ["inAppEnabled", "In-app notifications"], ["jobAlertsEnabled", "Job alerts"], ["aiUpdatesEnabled", "AI updates"]].map(([key, label]) => <Checkbox key={key} id={`preference-${key}`} label={label} checked={preferences.data[key]} disabled={preferenceMutation.isPending} onChange={(event) => preferenceMutation.mutate({ ...preferences.data, [key]: event.target.checked })} />)}</div>}
        </AsyncState>
        {preferenceMutation.error && <p className="form-error" role="alert">{preferenceMutation.error.message}</p>}
      </Card>
      <Card>
        <div className="notification-toolbar">
          <label className="notification-filter">
            <Checkbox
              id="unreadOnly"
              checked={unreadOnly}
              onChange={(event) => setUnreadOnly(event.target.checked)}
            />
            Unread only
          </label>
          <Button
            variant="secondary"
            onClick={() => readAllMutation.mutate()}
            disabled={readAllMutation.isPending || unreadCount === 0}
          >
            {readAllMutation.isPending ? "Updating…" : "Mark all as read"}
          </Button>
        </div>

        {(readMutation.error || readAllMutation.error) && (
          <p className="form-error" role="alert">
            {(readMutation.error || readAllMutation.error).message}
          </p>
        )}

        <AsyncState isLoading={query.isLoading} error={query.error?.message} onRetry={query.refetch} fallback={<ListSkeleton count={4} />}>
          {notifications.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">
                <AppIcon name="notifications" size={24} />
              </span>
              <h2>{unreadOnly ? "No unread notifications" : "Your inbox is clear"}</h2>
              <p>Document, export, and AI job updates will appear here.</p>
            </div>
          ) : (
            <ul className="notification-list">
              {notifications.map((notification) => {
                const unread = !notification.readAt;
                return (
                  <li
                    key={notification.id}
                    className={`notification-item${unread ? " notification-item--unread" : ""}`}
                  >
                    <span className="notification-item__icon">
                      <AppIcon name="notifications" size={19} />
                    </span>
                    <div className="notification-item__content">
                      <div className="notification-item__heading">
                        <h2>{notification.title}</h2>
                        {unread && <span className="notification-badge">New</span>}
                      </div>
                      <p>{notification.body}</p>
                      <time dateTime={notification.createdAt}>{createdLabel(notification.createdAt)}</time>
                    </div>
                    {unread && (
                      <Button
                        variant="ghost"
                        onClick={() => readMutation.mutate(notification.id)}
                        disabled={readMutation.isPending}
                        aria-label={`Mark ${notification.title} as read`}
                      >
                        Mark read
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </AsyncState>
      </Card>
    </ModulePage>
  );
};
