let accessToken = null;

export const authSession = {
  clear: () => {
    accessToken = null;
  },
  getToken: () => accessToken,
  setToken: (token) => {
    accessToken = token;
  },
};
