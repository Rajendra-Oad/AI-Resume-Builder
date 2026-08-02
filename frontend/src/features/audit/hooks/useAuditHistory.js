import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { getPersonalAuditHistory } from "../api/auditApi";

export const useAuditHistory = () => {
  const [page, setPage] = useState(0);
  const history = useQuery({
    queryKey: ["personal-audit-history", page],
    queryFn: () => getPersonalAuditHistory(page, 20),
    placeholderData: keepPreviousData,
  });
  return { history, page, setPage };
};
