import { useQuery } from "@tanstack/react-query";

import { listResumes } from "../api/resumeApi";

export const useResumes = () => {
  const query = useQuery({ queryKey: ["resumes"], queryFn: listResumes });
  return {
    ...query,
    data: query.data ?? [],
    error: query.error?.message ?? "",
    refresh: query.refetch,
  };
};
