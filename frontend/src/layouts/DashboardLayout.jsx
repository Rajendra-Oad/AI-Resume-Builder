import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { AppIcon } from "../components/AppIcon";
import { CommandPalette } from "../components/CommandPalette";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { notify } from "../components/NotificationProvider";
import { useAuth } from "../context/AuthContext";

const navigation = [
  ["Overview", "/dashboard", "dashboard"],
  ["My resumes", "/resumes", "document"],
  ["Templates", "/templates", "templates"],
  ["Cover letter", "/cover-letter", "coverLetter"],
  ["ATS checker", "/ats", "ats"],
  ["Job matches", "/job-matching", "jobs"],
  ["AI Center", "/ai-assistant", "ai"],
];

const utilityNavigation = [
  ["Notifications", "/notifications", "notifications"],
  ["Profile", "/profile", "profile"],
  ["Settings", "/settings", "settings"],
];

export const DashboardLayout = () => {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(
    () => window.localStorage.getItem("sidebar-collapsed") === "true",
  );
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [theme, setTheme] = useState(() => window.localStorage.getItem("theme") || "dark");
  const closeCommand = useCallback(() => setIsCommandOpen(false), []);

  useEffect(() => setIsMobileOpen(false), [location.pathname]);
  useEffect(() => {
    window.localStorage.setItem("sidebar-collapsed", String(isCollapsed));
  }, [isCollapsed]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("theme", theme);
  }, [theme]);
  useEffect(() => {
    const openCommand = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsCommandOpen((current) => !current);
      }
      if (event.key === "Escape") setIsMobileOpen(false);
    };
    window.addEventListener("keydown", openCommand);
    return () => window.removeEventListener("keydown", openCommand);
  }, []);
  useEffect(() => {
    document.body.classList.toggle("navigation-open", isMobileOpen);
    return () => document.body.classList.remove("navigation-open");
  }, [isMobileOpen]);

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      notify.success({ title: "Signed out", message: "Your session ended securely." });
      navigate("/");
    } catch (error) {
      notify.error({ message: error.message, details: error.message });
    } finally {
      setIsLoggingOut(false);
      setIsLogoutOpen(false);
    }
  };

  const brand = (
    <NavLink className="brand" to="/dashboard">
      <img className="brand-mark" src="/logo.svg" alt="" />
      <span>resumé</span>
    </NavLink>
  );

  return (
    <div className={`app-shell ${isCollapsed ? "app-shell--collapsed" : ""}`}>
      <header className="mobile-app-bar">
        {brand}
        <button className="sidebar-control mobile-menu-button" type="button" aria-label="Open navigation" aria-expanded={isMobileOpen} aria-controls="primary-sidebar" onClick={() => setIsMobileOpen(true)}><AppIcon name="menu" /></button>
      </header>
      {isMobileOpen && <button className="sidebar-backdrop" type="button" aria-label="Close navigation" onClick={() => setIsMobileOpen(false)} />}
      <aside id="primary-sidebar" className={`sidebar ${isMobileOpen ? "sidebar--mobile-open" : ""}`} aria-label="Application sidebar">
        <div className="sidebar-header">
          {brand}
          <button
            className="sidebar-control sidebar-collapse-button"
            type="button"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
            onClick={() => setIsCollapsed((current) => !current)}
          >
            {isCollapsed && (
              <img className="sidebar-collapse-button__logo" src="/logo.svg" alt="" />
            )}
            <AppIcon
              className="sidebar-collapse-button__arrow"
              name={isCollapsed ? "expand" : "collapse"}
            />
          </button>
          <button className="sidebar-control sidebar-mobile-close" type="button" aria-label="Close navigation" onClick={() => setIsMobileOpen(false)}><AppIcon name="close" /></button>
        </div>
        <p className="sidebar-label">Workspace</p>
        <nav aria-label="Primary navigation">
          {navigation.map(([label, to, icon]) => (
            <NavLink key={to} to={to} className="nav-link" title={isCollapsed ? label : undefined}>
              <AppIcon className="nav-icon" name={icon} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p className="sidebar-label">Account</p>
          <nav aria-label="Account navigation">
            {utilityNavigation.map(([label, to, icon]) => (
              <NavLink key={to} to={to} className="nav-link" title={isCollapsed ? label : undefined}>
                <AppIcon className="nav-icon" name={icon} />
                <span>{label}</span>
              </NavLink>
            ))}
            {session?.role === "ADMIN" && <NavLink to="/admin" className="nav-link"><AppIcon className="nav-icon" name="admin" /><span>Admin</span></NavLink>}
          </nav>
          <button className="account" onClick={() => setIsLogoutOpen(true)} aria-label="Sign out">
            <span className="avatar">{session?.email?.[0]?.toUpperCase() ?? "U"}</span>
            <span className="account-copy"><strong>{session?.email?.split("@")[0] ?? "Your account"}</strong><small>Sign out</small></span>
            <AppIcon className="account-logout" name="logout" size={17} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-bar">
          <button className="global-search" type="button" onClick={() => setIsCommandOpen(true)}>
            <AppIcon name="search" size={17} /><span>Search or jump to…</span><kbd>⌘ K</kbd>
          </button>
          <div className="workspace-actions">
            <button className="topbar-action" type="button" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}><AppIcon name={theme === "dark" ? "sun" : "moon"} size={18} /></button>
            <NavLink className="topbar-action notification-action" to="/notifications" aria-label="Notifications"><AppIcon name="notifications" size={18} /><span aria-hidden="true" /></NavLink>
            <NavLink className="topbar-profile" to="/profile"><span className="avatar">{session?.email?.[0]?.toUpperCase() ?? "U"}</span><span>{session?.email?.split("@")[0] ?? "Account"}</span><AppIcon name="chevronDown" size={14} /></NavLink>
          </div>
        </header>
        <Outlet />
      </div>
      <CommandPalette open={isCommandOpen} onClose={closeCommand} />
      <ConfirmationDialog
        isOpen={isLogoutOpen}
        onCancel={() => setIsLogoutOpen(false)}
        onConfirm={logout}
        title="Sign out of your account?"
        description="You’ll need to sign in again to access your resumes and workspace."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        tone="logout"
        isPending={isLoggingOut}
      />
    </div>
  );
};
