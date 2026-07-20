import { useQuery } from "@tanstack/react-query";

export const useModuleHealth = (key, checkHealth) =>
  useQuery({ queryKey: ["module-health", key], queryFn: checkHealth, staleTime: 60_000 });
