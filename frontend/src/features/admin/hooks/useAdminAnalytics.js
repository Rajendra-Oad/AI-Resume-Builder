import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { getAdminAnalytics, getAdminUsageMetrics } from "../api/adminApi";

const iso = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const presetRange = (days) => {
  const to = new Date();
  to.setHours(0, 0, 0, 0);
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));
  return { from: iso(from), to: iso(to) };
};

const ranges = { TODAY: 1, DAYS_7: 7, DAYS_30: 30, DAYS_90: 90, YEAR: 365 };

export const useAdminAnalytics = () => {
  const initial = useMemo(() => presetRange(30), []);
  const [preset, setPreset] = useState("DAYS_30");
  const [range, setRange] = useState(initial);
  const [customFrom, setCustomFrom] = useState(initial.from);
  const [customTo, setCustomTo] = useState(initial.to);
  const [validationError, setValidationError] = useState("");
  const overview = useQuery({
    queryKey: ["admin-analytics", range.from, range.to],
    queryFn: () => getAdminAnalytics(range),
  });
  const metrics = useQuery({
    queryKey: ["admin-usage-metrics", range.from, range.to],
    queryFn: () => getAdminUsageMetrics(range),
  });

  const selectPreset = (value) => {
    setPreset(value);
    setValidationError("");
    if (ranges[value]) {
      const next = presetRange(ranges[value]);
      setRange(next);
      setCustomFrom(next.from);
      setCustomTo(next.to);
    }
  };

  const applyCustomRange = () => {
    if (!customFrom || !customTo) {
      setValidationError("Choose both a start date and an end date.");
      return false;
    }
    const from = new Date(`${customFrom}T00:00:00`);
    const to = new Date(`${customTo}T00:00:00`);
    const days = Math.floor((to - from) / 86_400_000) + 1;
    if (days < 1) {
      setValidationError("The start date must be on or before the end date.");
      return false;
    }
    if (days > 366) {
      setValidationError("Analytics ranges cannot exceed 366 days.");
      return false;
    }
    setValidationError("");
    setRange({ from: customFrom, to: customTo });
    return true;
  };

  const refresh = () => Promise.all([overview.refetch(), metrics.refetch()]);

  return {
    preset, range, customFrom, customTo, validationError,
    setCustomFrom, setCustomTo, selectPreset, applyCustomRange,
    overview, metrics, refresh,
    isRefreshing: overview.isFetching || metrics.isFetching,
  };
};
