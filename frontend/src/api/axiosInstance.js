import axios from "axios";

import { config } from "../config/env";
import { installRequestInterceptor } from "./interceptors/requestInterceptor";
import { installResponseInterceptor } from "./interceptors/responseInterceptor";

const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.requestTimeout,
  withCredentials: true,
});

installRequestInterceptor(apiClient);
installResponseInterceptor(apiClient);

export default apiClient;
