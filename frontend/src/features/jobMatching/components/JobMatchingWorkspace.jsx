import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { FormField } from "../../../components/FormField";
import { Input } from "../../../components/Input";
import { ModulePage } from "../../../components/ModulePage";
import { Select } from "../../../components/Select";
import { CardSkeleton } from "../../../components/Skeleton";
import { Textarea } from "../../../components/Textarea";
import { createJob, deleteJob, listJobs } from "../api/jobApi";

const initialJob = { title: "", companyName: "", seniorityLevel: "", content: "" };

export const JobMatchingWorkspace = () => {
  const [values, setValues] = useState(initialJob);
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const jobs = useQuery({ queryKey: ["jobs"], queryFn: listJobs });
  const createMutation = useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      setValues(initialJob);
      setMessage("Job description saved. You can now use it in the ATS checker.");
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (error) => setMessage(error.message),
  });
  const removeMutation = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });
  const update = ({ target }) => setValues((current) => ({ ...current, [target.name]: target.value }));
  const submit = (event) => {
    event.preventDefault();
    setMessage("");
    createMutation.mutate(values);
  };

  return (
    <ModulePage eyebrow="TARGET ROLES" title="Job workspace" description="Save a job description, then compare it with any resume in your ATS checker.">
      <div className="workspace-grid">
        <Card>
          <p className="eyebrow">ADD A TARGET</p>
          <h2>What role are you aiming for?</h2>
          <form onSubmit={submit} className="stack-form">
            <div className="form-grid form-grid--two">
              <FormField id="jobTitle" label="Job title"><Input id="jobTitle" name="title" value={values.title} onChange={update} placeholder="Product designer" /></FormField>
              <FormField id="companyName" label="Company"><Input id="companyName" name="companyName" value={values.companyName} onChange={update} placeholder="Acme Inc." /></FormField>
            </div>
            <FormField id="seniorityLevel" label="Seniority"><Select id="seniorityLevel" name="seniorityLevel" value={values.seniorityLevel} onChange={update}><option value="">Select level</option><option>Intern</option><option>Entry level</option><option>Mid level</option><option>Senior</option><option>Lead</option></Select></FormField>
            <FormField id="jobContent" label="Job description" hint="Paste the full listing so keyword analysis has enough context."><Textarea id="jobContent" name="content" rows="12" required value={values.content} onChange={update} placeholder="Responsibilities, requirements, skills..." /></FormField>
            {message && <p className={createMutation.isError ? "form-error" : "form-success"} role="status">{message}</p>}
            <Button disabled={createMutation.isPending}>{createMutation.isPending ? "Saving..." : "Save target job"}</Button>
          </form>
        </Card>
        <section aria-labelledby="saved-jobs-title">
          <div className="section-header section-header--compact"><div><p className="eyebrow">SAVED TARGETS</p><h2 id="saved-jobs-title">Your job descriptions</h2></div></div>
          {jobs.isLoading ? <CardSkeleton count={3} className="saved-job-list" /> : jobs.isError ? <Card><p className="form-error">{jobs.error.message}</p><Button variant="secondary" onClick={() => jobs.refetch()}>Try again</Button></Card> : jobs.data.length ? (
            <div className="saved-job-list">{jobs.data.map((job) => <Card key={job.id} className="saved-job-card"><div><span className="status-pill">{job.seniorityLevel || "Target role"}</span><h3>{job.title || "Untitled role"}</h3><p className="muted">{job.companyName || "Company not specified"}</p></div><Button variant="ghost" onClick={() => removeMutation.mutate(job.id)}>Remove</Button></Card>)}</div>
          ) : <Card className="empty-state empty-state--compact"><h3>No target jobs saved</h3><p>Paste a job listing to make ATS feedback specific and actionable.</p></Card>}
        </section>
      </div>
    </ModulePage>
  );
};
