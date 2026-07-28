import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "./api/queryClient";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NotificationProvider } from "./components/NotificationProvider";
import { AuthProvider } from "./context/AuthContext";
import { AppRoutes } from "./routes";

const App = () => (
  <ErrorBoundary>
    <NotificationProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </QueryClientProvider>
    </NotificationProvider>
  </ErrorBoundary>
);

export default App;
