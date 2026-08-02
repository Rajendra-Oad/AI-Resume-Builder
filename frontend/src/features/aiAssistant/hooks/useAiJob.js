import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";

import { notify } from "../../../components/NotificationProvider";
import { getAiJob, submitAiJob } from "../api/aiAssistantApi";

const terminalStatuses = new Set(["SUCCEEDED", "FAILED"]);
const queue = new Map();
const listeners = new Set();
const notified = new Set();

const emit = () => listeners.forEach((listener) => listener());
const snapshot = () => [...queue.values()].sort((left, right) => right.submittedAt - left.submittedAt);
let lastSnapshot = snapshot();
const refreshSnapshot = () => { lastSnapshot = snapshot(); emit(); };

export const registerAiJob = (job, metadata = {}) => {
  queue.set(job.id, {
    ...queue.get(job.id),
    id: job.id,
    workflow: metadata.workflow ?? queue.get(job.id)?.workflow ?? "Unknown workflow",
    label: metadata.label ?? queue.get(job.id)?.label ?? "AI request",
    submittedAt: queue.get(job.id)?.submittedAt ?? Date.now(),
    status: job.status,
    content: job.content,
    error: job.error,
  });
  refreshSnapshot();
};

const updateAiJob = (job) => {
  if (!job?.id || !queue.has(job.id)) return;
  queue.set(job.id, { ...queue.get(job.id), ...job });
  refreshSnapshot();
};

export const useAiJobQueue = () =>
  useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => lastSnapshot,
    () => lastSnapshot,
  );

export const useAiJob = (id, { notifications = true } = {}) => {
  const query = useQuery({
    queryKey: ["ai-job", id],
    queryFn: () => getAiJob(id),
    enabled: Boolean(id),
    refetchInterval: ({ state }) => terminalStatuses.has(state.data?.status) ? false : 1500,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!query.data) return;
    updateAiJob(query.data);
    if (!notifications || !terminalStatuses.has(query.data.status) || notified.has(query.data.id)) return;
    notified.add(query.data.id);
    if (query.data.status === "SUCCEEDED") {
      notify.success({ title: "AI job completed", message: "Your generated result is ready." });
    } else {
      notify.error({ title: "AI job failed", message: query.data.error || "The AI request could not be completed." });
    }
  }, [notifications, query.data]);

  return query;
};

export const useAiJobRunner = (workflow, label) => {
  const [jobId, setJobId] = useState(null);
  const submission = useMutation({
    mutationFn: (input) => submitAiJob({ workflow, input }),
    onSuccess: (job) => {
      registerAiJob(job, { workflow, label });
      setJobId(job.id);
      notify.queue({ title: "AI job queued", message: `${label || workflow} is processing.` });
    },
  });
  const job = useAiJob(jobId);
  const status = job.data?.status ?? submission.data?.status;
  return {
    submit: submission.mutateAsync,
    reset: () => { submission.reset(); setJobId(null); },
    jobId,
    job: job.data,
    error: submission.error || job.error,
    isRunning: submission.isPending || Boolean(jobId && !terminalStatuses.has(status)),
  };
};

export const isTerminalAiJob = (status) => terminalStatuses.has(status);
