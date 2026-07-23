import axios from "axios";

import { config } from "../config/env";
import { authSession } from "../services/authSession";

let refreshPromise = null;

export const refreshAccessToken = async () => {
  refreshPromise ??= axios
    .post(`${config.apiBaseUrl}/api/v1/auth/refresh`, {}, { withCredentials: true })
    .then((response) => {
      const session = response.data.data;
      authSession.setToken(session.accessToken);
      window.dispatchEvent(new window.CustomEvent("auth:refreshed", { detail: session }));
      return session.accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
};

export const expireSession = () => {
  authSession.clear();
  window.dispatchEvent(new window.Event("auth:expired"));
};
