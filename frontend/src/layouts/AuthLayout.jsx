import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";

export const AuthLayout = () => {
  const [theme, setTheme] = useState(() => window.localStorage.getItem("landing-theme") || "dark");

  useEffect(() => {
    window.localStorage.setItem("landing-theme", theme);
  }, [theme]);

  return (
    <main className="auth-layout" data-auth-theme={theme}>
      <Link to="/" className="brand brand--dark">
        <img className="brand-logo" src="/logo.svg" alt="" /> resumé
      </Link>
      <button
        className="auth-theme-toggle"
        type="button"
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <Outlet />
    </main>
  );
};
