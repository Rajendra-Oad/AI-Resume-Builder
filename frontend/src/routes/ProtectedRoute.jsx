import { Navigate, Outlet, useLocation } from "react-router-dom";

import { Skeleton } from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";

export const ProtectedRoute = () => {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();
  if (isInitializing) return <Skeleton className="route-loading" label="Loading page" />;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
};
