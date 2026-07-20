export const normalizeApiError = (error) => {
  const response = error.response?.data;
  return {
    status: error.response?.status ?? 0,
    code: response?.error?.code ?? "NETWORK_ERROR",
    message: response?.error?.message ?? error.message ?? "Something went wrong. Please try again.",
  };
};
