import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { AppIcon } from "../components/AppIcon";
import { useAuth } from "../context/AuthContext";

const navigation = [
  ["Overview", "/dashboard", "dashboard"],
  ["My resumes", "/resumes", "document"],
  ["Templates", "/templates", "templates"],
  ["Cover letter", "/cover-letter", "coverLetter"],
  ["ATS checker", "/ats", "ats"],
  ["Job matches", "/job-matching", "jobs"],
  ["AI Center", "/ai-assistant", "ai"],
  ["Notifications", "/notifications", "notifications"],
  ["Profile", "/profile", "profile"],
  ["Settings", "/settings", "settings"],
];

export const DashboardLayout = () => {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const logout = async () => {
    await signOut();
    navigate("/");
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/dashboard">
          <AppIcon name="ai" size={19} /> résumé
        </NavLink>
        <nav aria-label="Primary navigation">
          {navigation.map(([label, to, icon]) => (
            <NavLink key={to} to={to} className="nav-link">
              <AppIcon className="nav-icon" name={icon} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {session?.role === "ADMIN" && (
            <NavLink to="/admin" className="nav-link">
              <AppIcon className="nav-icon" name="admin" />
              <span>Admin</span>
            </NavLink>
          )}
          <button className="account" onClick={logout} aria-label="Sign out">
            <span className="avatar">{session?.email?.[0]?.toUpperCase() ?? "U"}</span>
            <span className="account-copy">
              <strong>{session?.email?.split("@")[0] ?? "Your account"}</strong>
              <small>Sign out</small>
            </span>
            <AppIcon className="account-logout" name="logout" size={18} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <Outlet />
      </div>
    </div>
  );
};
