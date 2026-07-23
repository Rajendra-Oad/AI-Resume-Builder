import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export const AdminRoute = () => {
  const { session } = useAuth();
  return session?.role === "ADMIN" ? <Outlet /> : <Navigate to="/forbidden" replace />;
};
