import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { authSession } from "../services/authSession";
import { logout, refreshSession } from "../features/auth/api/authApi";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const channel = useRef(
    typeof window.BroadcastChannel === "undefined"
      ? null
      : new window.BroadcastChannel("ai-resume-auth"),
  );
  const clearSession = () => {
    authSession.clear();
    setSession(null);
  };
  useEffect(() => {
    const broadcast = channel.current;
    if (broadcast)
      broadcast.onmessage = ({ data }) => {
        if (data?.type === "logout") clearSession();
      };
    const onExpired = () => clearSession();
    const onRefreshed = ({ detail }) => setSession(detail);
    window.addEventListener("auth:expired", onExpired);
    window.addEventListener("auth:refreshed", onRefreshed);
    refreshSession()
      .then((value) => {
        authSession.setToken(value.accessToken);
        setSession(value);
      })
      .catch(clearSession)
      .finally(() => setIsInitializing(false));
    return () => {
      window.removeEventListener("auth:expired", onExpired);
      window.removeEventListener("auth:refreshed", onRefreshed);
      if (broadcast) broadcast.close();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session?.accessToken),
      isInitializing,
      signIn: (payload) => {
        authSession.setToken(payload.accessToken);
        setSession(payload);
      },
      signOut: async () => {
        try {
          await logout();
        } finally {
          clearSession();
          channel.current?.postMessage({ type: "logout" });
        }
      },
    }),
    [isInitializing, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
