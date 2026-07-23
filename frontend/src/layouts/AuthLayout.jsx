import { Link, Outlet } from "react-router-dom";

import { AppIcon } from "../components/AppIcon";

export const AuthLayout = () => (
  <main className="auth-layout">
    <Link to="/" className="brand brand--dark">
      <AppIcon name="ai" size={19} /> resumé
    </Link>
    <Outlet />
  </main>
);
