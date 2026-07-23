import { authSession } from "../../services/authSession";

export const attachAccessToken = (request) => {
  const token = authSession.getToken();
  if (token) request.headers.Authorization = `Bearer ${token}`;
  return request;
};

export const installRequestInterceptor = (client) =>
  client.interceptors.request.use(attachAccessToken);
