import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
export const GuestRoute = () =>
  useAuth().isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
