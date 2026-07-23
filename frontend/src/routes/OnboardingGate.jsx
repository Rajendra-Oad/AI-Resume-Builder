import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { AsyncState } from "../components/AsyncState";
import { getProfile } from "../features/profile/api/profileApi";

export const OnboardingGate = () => {
  const location = useLocation();
  const profile = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  if (profile.isLoading) return <div className="onboarding-gate"><span className="page-loader"><span /></span></div>;
  if (profile.isError) {
    return <main className="onboarding-gate"><AsyncState error={profile.error.message} onRetry={profile.refetch} /></main>;
  }
  if (!profile.data?.onboardingCompleted) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }
  return <Outlet />;
};
