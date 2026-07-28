import { gsap } from "gsap";
import {
  Bell, Bot, Check, CircleCheck, CircleX, Clock, CloudDownload, CloudUpload,
  Copy, FileText, Info, RefreshCw, Save, Search, ShieldCheck,
  Sparkles, Trash2, TriangleAlert, Wifi, WifiOff, X,
} from "lucide-react";
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";

import { notificationEnter, notificationExit } from "../animations/motion";

const NotificationContext = createContext(null);
const listeners = new Set();
let nextId = 0;

export const NOTIFICATION_TYPES = {
  success: { title: "Success", duration: 4500, icon: CircleCheck },
  error: { title: "Something went wrong", duration: 9000, icon: CircleX },
  warning: { title: "Please note", duration: 6500, icon: TriangleAlert },
  info: { title: "Update", duration: 5500, icon: Info },
  loading: { title: "Working…", duration: Infinity, icon: FileText, animated: true },
  upload: { title: "Uploading…", duration: Infinity, icon: CloudUpload },
  download: { title: "Downloading…", duration: Infinity, icon: CloudDownload },
  resume: { title: "Resume generated", duration: 6500, icon: FileText },
  ai: { title: "AI is working", duration: Infinity, icon: Sparkles, animated: true },
  processing: { title: "Processing…", duration: Infinity, icon: Bot, animated: true },
  auth: { title: "Account security", duration: 8000, icon: ShieldCheck },
  session: { title: "Session expired", duration: 9000, icon: Clock },
  network: { title: "Connection update", duration: 7000, icon: WifiOff },
  online: { title: "Back online", duration: 5000, icon: Wifi },
  autosave: { title: "Changes saved", duration: 3500, icon: Save },
  import: { title: "File imported", duration: 5500, icon: FileText },
  export: { title: "Export ready", duration: 5500, icon: CloudDownload },
  sync: { title: "Syncing…", duration: Infinity, icon: RefreshCw, animated: true },
  queue: { title: "Added to queue", duration: 5000, icon: Clock },
  scheduled: { title: "Task scheduled", duration: 5000, icon: Clock },
  achievement: { title: "Nicely done", duration: 6000, icon: Check },
};

const normalize = (type, input, options = {}) => {
  const content = typeof input === "string" ? { message: input } : (input || {});
  const theme = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info;
  return {
    id: options.id ?? content.id ?? `notice-${Date.now()}-${++nextId}`,
    type: NOTIFICATION_TYPES[type] ? type : "info",
    createdAt: Date.now(),
    read: false,
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
    clearHistory: () => emit({ action: "clearHistory" }),
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
        notify.update(id, typeof messages.error === "function" ? messages.error(error) : messages.error,
          { type: "error", details: error?.message, copyError: true });
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

const Progress = ({ item }) => {
  if (item.progress == null && !item.steps) return null;
  const progress = Math.max(0, Math.min(100, Number(item.progress) || 0));
  return (
    <div className="notification__task">
      {item.steps && <div className="notification__steps">{item.steps.map((step, index) => (
        <span key={step} className={index < (item.currentStep || 0) ? "is-done" : index === (item.currentStep || 0) ? "is-active" : ""}>
          {index < (item.currentStep || 0) ? <Check /> : <span />}{step}
        </span>
      ))}</div>}
      {item.progress != null && <>
        <div className="notification__meter"><i style={{ width: `${progress}%` }} /></div>
        <div className="notification__meta"><span>{progress}%</span>{item.estimatedTime && <span>{item.estimatedTime}</span>}</div>
      </>}
    </div>
  );
};

const NotificationCard = ({ item, onDismiss }) => {
  const ref = useRef(null);
  const timer = useRef();
  const remaining = useRef(item.duration);
  const started = useRef();
  const pointer = useRef(null);
  const dragRef = useRef(0);
  const [expanded, setExpanded] = useState(false);
  const [drag, setDrag] = useState(0);
  const Icon = item.icon;

  const pause = useCallback(() => {
    window.clearTimeout(timer.current);
    if (started.current) remaining.current = Math.max(0, remaining.current - (Date.now() - started.current));
    started.current = null;
  }, []);
  const resume = useCallback(() => {
    if (!Number.isFinite(item.duration) || started.current) return;
    started.current = Date.now();
    timer.current = window.setTimeout(() => onDismiss(item.id), remaining.current);
  }, [item.duration, item.id, onDismiss]);
  useEffect(() => {
    remaining.current = item.duration;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) notificationEnter(gsap, ref.current, { y: 0 });
    resume();
    return pause;
  }, [item.duration, pause, resume]);
  const dismiss = () => {
    pause();
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return onDismiss(item.id);
    notificationExit(gsap, ref.current, { onComplete: () => onDismiss(item.id) });
  };
  const run = (callback, close = true) => { callback?.(); if (close) dismiss(); };

  return (
    <article ref={ref} className={`notification notification--${item.type} ${expanded ? "is-expanded" : ""}`}
      role={item.type === "error" || item.type === "warning" ? "alert" : "status"} aria-atomic="true"
      tabIndex={0} style={{ "--drag-x": `${drag}px` }} onMouseEnter={pause} onMouseLeave={resume}
      onFocus={pause} onBlur={resume} onKeyDown={(event) => event.key === "Escape" && dismiss()}
      onClick={() => item.details && setExpanded((value) => !value)}
      onPointerDown={(event) => {
        if (event.target.closest("button")) return;
        pointer.current = event.clientX;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (pointer.current == null) return;
        dragRef.current = event.clientX - pointer.current;
        setDrag(dragRef.current);
      }}
      onPointerUp={() => {
        if (Math.abs(dragRef.current) > 70) dismiss();
        else setDrag(0);
        dragRef.current = 0;
        pointer.current = null;
      }}
      onPointerCancel={() => { setDrag(0); dragRef.current = 0; pointer.current = null; }}>
      <span className="notification__accent" />
      <span className="notification__icon" aria-hidden="true"><Icon className={item.animated ? "activity-soft" : ""} /></span>
      <div className="notification__content">
        <div className="notification__heading"><div><strong>{item.title}</strong>{item.subtitle && <small>{item.subtitle}</small>}</div>
          <button type="button" onClick={(e) => { e.stopPropagation(); dismiss(); }} aria-label="Dismiss notification"><X /></button></div>
        {item.message && <p>{item.message}</p>}
        <Progress item={item} />
        {item.details && <button type="button" className="notification__details-toggle"
          onClick={(e) => { e.stopPropagation(); setExpanded((value) => !value); }} aria-expanded={expanded}>
          {expanded ? "Hide details" : "Show details"}</button>}
        {expanded && item.details && <pre onClick={(e) => e.stopPropagation()}>{item.details}</pre>}
        {(item.action || item.secondaryAction || item.retry || item.undo || item.copyError) && <div className="notification__actions" onClick={(e) => e.stopPropagation()}>
          {item.action && <button type="button" onClick={() => run(item.action.onClick)}>{item.action.label}</button>}
          {item.secondaryAction && <button type="button" onClick={() => run(item.secondaryAction.onClick)}>{item.secondaryAction.label}</button>}
          {item.retry && <button type="button" onClick={() => run(item.retry)}><RefreshCw /> Retry</button>}
          {item.undo && <button type="button" onClick={() => run(item.undo)}>Undo</button>}
          {item.copyError && <button type="button" onClick={() => run(() => window.navigator.clipboard?.writeText(item.details || item.message), false)}><Copy /> Copy error</button>}
        </div>}
      </div>
      {Number.isFinite(item.duration) && <span className="notification__lifetime" style={{ animationDuration: `${item.duration}ms` }} />}
    </article>
  );
};

const groupLabel = (timestamp) => {
  const day = new Date(timestamp); const now = new Date();
  if (day.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
  return day.toDateString() === yesterday.toDateString() ? "Yesterday" : "Earlier";
};

const NotificationHistory = ({ history, open, onClose, setHistory }) => {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const results = history.filter((item) => (filter === "all" || item.type === filter) &&
    `${item.title} ${item.message || ""}`.toLowerCase().includes(query.toLowerCase()));
  return <aside className={`notification-history ${open ? "is-open" : ""}`} aria-hidden={!open} aria-label="Notification history">
    <header><div><span>Notification center</span><strong>{history.filter((item) => !item.read).length} unread</strong></div>
      <button onClick={onClose} aria-label="Close notification history"><X /></button></header>
    <div className="notification-history__tools">
      <label><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notifications" /></label>
      <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter notifications">
        <option value="all">All activity</option><option value="success">Success</option><option value="error">Errors</option>
        <option value="warning">Warnings</option><option value="ai">AI activity</option>
      </select>
    </div>
    <div className="notification-history__commands">
      <button onClick={() => setHistory((items) => items.map((item) => ({ ...item, read: true })))}><Check /> Mark all read</button>
      <button onClick={() => setHistory([])}><Trash2 /> Clear history</button>
    </div>
    {open && <div className="notification-history__list">
      {results.length === 0 && <div className="notification-history__empty"><Bell /><strong>All quiet</strong><span>No notifications match this view.</span></div>}
      {["Today", "Yesterday", "Earlier"].map((group) => {
        const items = results.filter((item) => groupLabel(item.createdAt) === group);
        return items.length ? <section key={group}><h3>{group}</h3>{items.map((item) => {
          const Icon = item.icon; return <button key={item.id} className={!item.read ? "is-unread" : ""}
            onClick={() => setHistory((all) => all.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry))}>
            <Icon /><span><strong>{item.title}</strong><small>{item.message}</small></span><time>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
          </button>;
        })}</section> : null;
      })}
    </div>}
  </aside>;
};

export const NotificationProvider = ({ children, maxVisible = 4 }) => {
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const dismiss = useCallback((id) => setItems((all) => all.filter((item) => item.id !== id)), []);
  useEffect(() => {
    const listener = ({ action, item, id }) => {
      if (action === "dismiss") dismiss(id);
      if (action === "dismissAll") setItems([]);
      if (action === "clearHistory") setHistory([]);
      if (action === "add") {
        setItems((all) => [...all.filter((entry) => entry.id !== item.id), item]);
        setHistory((all) => [item, ...all.filter((entry) => entry.id !== item.id)].slice(0, 100));
      }
      if (action === "update") {
        setItems((all) => all.map((entry) => entry.id === id ? { ...entry, ...item, createdAt: entry.createdAt } : entry));
        setHistory((all) => all.map((entry) => entry.id === id ? { ...entry, ...item, createdAt: entry.createdAt } : entry));
      }
    };
    listeners.add(listener); return () => listeners.delete(listener);
  }, [dismiss]);
  useEffect(() => {
    const offline = () => notify.network({ title: "You’re offline", message: "Changes will sync when your connection returns." }, { id: "network" });
    const online = () => notify.online({ message: "Your connection has been restored." }, { id: "network" });
    const expired = () => notify.session({ message: "Please sign in again to continue securely." }, { id: "session-expired" });
    window.addEventListener("offline", offline); window.addEventListener("online", online); window.addEventListener("auth:expired", expired);
    if (!window.navigator.onLine) offline();
    return () => { window.removeEventListener("offline", offline); window.removeEventListener("online", online); window.removeEventListener("auth:expired", expired); };
  }, []);
  const api = useMemo(() => ({ notify, dismiss, dismissAll: notify.dismissAll, openHistory: () => setHistoryOpen(true), history }), [dismiss, history]);
  const visible = items.slice(-maxVisible);
  const isPublicAuthPage = /^\/(login|register|forgot-password|reset-password|verify-email(?:-sent)?)\/?$/.test(window.location.pathname);
  return <NotificationContext.Provider value={api}>{children}
    <section className="notification-region" aria-label="Notifications" aria-live="polite">
      {items.length > maxVisible && <button className="notification-overflow" onClick={() => setHistoryOpen(true)}>
        <Bell /> {items.length - maxVisible} earlier notification{items.length - maxVisible === 1 ? "" : "s"}
      </button>}
      {visible.map((item) => <NotificationCard key={item.id} item={item} onDismiss={dismiss} />)}
      {!isPublicAuthPage && history.length > 0 && <button className="notification-history-trigger" onClick={() => setHistoryOpen(true)} aria-label="Open notification history">
        <Bell /><span>{history.filter((item) => !item.read).length}</span>
      </button>}
    </section>
    <div className={`notification-history-backdrop ${historyOpen ? "is-open" : ""}`} onClick={() => setHistoryOpen(false)} />
    <NotificationHistory history={history} open={historyOpen} onClose={() => setHistoryOpen(false)} setHistory={setHistory} />
  </NotificationContext.Provider>;
};

export const useNotification = () => {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("useNotification must be used inside NotificationProvider");
  return value;
};
