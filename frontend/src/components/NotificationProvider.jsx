import { gsap } from "gsap";
import { X } from "lucide-react";
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";

import { notificationEnter, notificationExit } from "../animations/motion";

const NotificationContext = createContext(null);
const listeners = new Set();
let nextId = 0;

export const NOTIFICATION_TYPES = {
  success: { title: "Success", duration: 4500 },
  error: { title: "Something went wrong", duration: 7000 },
  warning: { title: "Please note", duration: 6000 },
  info: { title: "Update", duration: 5000 },
  loading: { title: "Working…", duration: Infinity },
  upload: { title: "Uploading…", duration: Infinity },
  download: { title: "Downloading…", duration: Infinity },
  resume: { title: "Resume generated", duration: 6000 },
  ai: { title: "AI is working", duration: Infinity },
  processing: { title: "Processing…", duration: Infinity },
  auth: { title: "Account security", duration: 7000 },
  session: { title: "Session expired", duration: 7000 },
  network: { title: "Connection update", duration: 6000 },
  online: { title: "Back online", duration: 4500 },
  autosave: { title: "Changes saved", duration: 3500 },
  import: { title: "File imported", duration: 5000 },
  export: { title: "Export ready", duration: 5000 },
  sync: { title: "Syncing…", duration: Infinity },
  queue: { title: "Added to queue", duration: 5000 },
  scheduled: { title: "Task scheduled", duration: 5000 },
  achievement: { title: "Nicely done", duration: 5500 },
};

const normalize = (type, input, options = {}) => {
  const content = typeof input === "string" ? { message: input } : (input || {});
  const theme = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info;
  return {
    id: options.id ?? content.id ?? `notice-${Date.now()}-${++nextId}`,
    type: NOTIFICATION_TYPES[type] ? type : "info",
    ...theme,
    ...content,
    ...options,
  };
};

const emit = (event) => listeners.forEach((listener) => listener(event));
const create = (type) => (input, options) => {
  const item = normalize(type, input, options);
  emit({ action: "add", item });
  return item.id;
};

export const notify = Object.assign(
  (input, options = {}) => create(options.type || "info")(input, options),
  Object.fromEntries(Object.keys(NOTIFICATION_TYPES).map((type) => [type, create(type)])),
  {
    dismiss: (id) => emit({ action: "dismiss", id }),
    dismissAll: () => emit({ action: "dismissAll" }),
    clearHistory: () => {},
    queue: (input, options) => create(options?.type || "queue")(input, options),
    update: (id, input, options = {}) =>
      emit({ action: "update", id, item: normalize(options.type || "info", input, { ...options, id }) }),
    promise: async (promiseOrFactory, messages) => {
      const id = notify.loading(messages.loading);
      try {
        const value = await (typeof promiseOrFactory === "function" ? promiseOrFactory() : promiseOrFactory);
        notify.update(id, typeof messages.success === "function" ? messages.success(value) : messages.success, { type: "success" });
        return value;
      } catch (error) {
        notify.update(
          id,
          typeof messages.error === "function" ? messages.error(error) : messages.error,
          { type: "error" },
        );
        throw error;
      }
    },
  },
);

export const showSuccess = notify.success;
export const showError = notify.error;
export const showWarning = notify.warning;
export const showInfo = notify.info;
export const showLoading = notify.loading;
export const queueNotification = notify.queue;
export const updateNotification = notify.update;
export const dismissNotification = notify.dismiss;
export const dismissAll = notify.dismissAll;
export const promiseNotification = notify.promise;

const NotificationToast = ({ item, onDismiss }) => {
  const ref = useRef(null);
  const timer = useRef();

  useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion) notificationEnter(gsap, ref.current, { y: 0 });
    if (Number.isFinite(item.duration)) {
      timer.current = window.setTimeout(() => onDismiss(item.id), item.duration);
    }
    return () => window.clearTimeout(timer.current);
  }, [item.duration, item.id, onDismiss]);

  const dismiss = () => {
    window.clearTimeout(timer.current);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      onDismiss(item.id);
      return;
    }
    notificationExit(gsap, ref.current, { onComplete: () => onDismiss(item.id) });
  };

  return (
    <article
      ref={ref}
      className={`notification notification--${item.type}`}
      role={item.type === "error" || item.type === "warning" ? "alert" : "status"}
      aria-atomic="true"
    >
      <span className="notification__accent" />
      <div className="notification__content">
        <div className="notification__heading">
          <strong>{item.title}</strong>
          <button type="button" onClick={dismiss} aria-label="Dismiss notification"><X /></button>
        </div>
        {item.message && <p>{item.message}</p>}
      </div>
    </article>
  );
};

export const NotificationProvider = ({ children, maxVisible = 3 }) => {
  const [items, setItems] = useState([]);
  const dismiss = useCallback((id) => setItems((all) => all.filter((item) => item.id !== id)), []);

  useEffect(() => {
    const listener = ({ action, item, id }) => {
      if (action === "dismiss") dismiss(id);
      if (action === "dismissAll") setItems([]);
      if (action === "add") {
        setItems((all) => [...all.filter((entry) => entry.id !== item.id), item].slice(-maxVisible));
      }
      if (action === "update") {
        setItems((all) => all.map((entry) => entry.id === id ? { ...entry, ...item } : entry));
      }
    };
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, [dismiss, maxVisible]);

  useEffect(() => {
    const offline = () => notify.network({ title: "You’re offline", message: "Changes will sync when your connection returns." }, { id: "network" });
    const online = () => notify.online({ message: "Your connection has been restored." }, { id: "network" });
    const expired = () => notify.session({ message: "Please sign in again to continue securely." }, { id: "session-expired" });
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    window.addEventListener("auth:expired", expired);
    if (!window.navigator.onLine) offline();
    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      window.removeEventListener("auth:expired", expired);
    };
  }, []);

  const api = useMemo(
    () => ({ notify, dismiss, dismissAll: notify.dismissAll }),
    [dismiss],
  );

  return (
    <NotificationContext.Provider value={api}>
      {children}
      <section className="notification-region" aria-label="Messages" aria-live="polite">
        {items.map((item) => <NotificationToast key={item.id} item={item} onDismiss={dismiss} />)}
      </section>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("useNotification must be used inside NotificationProvider");
  return value;
};
