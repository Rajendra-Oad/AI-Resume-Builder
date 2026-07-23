import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { FormField } from "../../../components/FormField";
import { ModulePage } from "../../../components/ModulePage";
import { Select } from "../../../components/Select";
import { AiJobSkeleton } from "../../../components/Skeleton";
import { listJobs } from "../../jobMatching/api/jobApi";
import { listResumes } from "../../resume/api/resumeApi";
import { analyzeResume, getAtsReport, getResumeReports } from "../api/atsApi";

const scoreTone = (score) => (score >= 80 ? "strong" : score >= 60 ? "fair" : "weak");

export const AtsWorkspace = ({ initialResumeId = "" }) => {
  const [resumeId, setResumeId] = useState(String(initialResumeId));
  const [jobId, setJobId] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const resumes = useQuery({ queryKey: ["resumes"], queryFn: listResumes });
  const jobs = useQuery({ queryKey: ["jobs"], queryFn: listJobs });
  const history = useQuery({ queryKey:["ats-reports",resumeId],queryFn:()=>getResumeReports(Number(resumeId)),enabled:Boolean(resumeId) });
  const analysis = useMutation({ mutationFn: () => analyzeResume(Number(resumeId), Number(jobId)),onSuccess:(value)=>setSelectedReport(value) });
  const reportQuery = useMutation({ mutationFn:getAtsReport,onSuccess:setSelectedReport });
  const ready = resumeId && jobId;
  const report = selectedReport;
  const score = Number(report?.summary?.overallScore ?? 0);

  return (
    <ModulePage eyebrow="RESUME HEALTH" title="ATS checker" description="Compare your resume with a real job listing and turn gaps into a clear action plan.">
      <div className="ats-layout">
        <Card className="ats-setup">
          <div><p className="eyebrow">STEP 1 OF 2</p><h2>Choose what to compare</h2><p className="muted">Your resume stays unchanged. Analysis only reads the selected documents.</p></div>
          <div className="form-grid form-grid--two">
            <FormField id="atsResume" label="Resume"><Select id="atsResume" value={resumeId} onChange={(event) => setResumeId(event.target.value)}><option value="">Select a resume</option>{(resumes.data ?? []).map((resume) => <option key={resume.id} value={resume.id}>{resume.title}</option>)}</Select></FormField>
            <FormField id="atsJob" label="Target job"><Select id="atsJob" value={jobId} onChange={(event) => setJobId(event.target.value)}><option value="">Select a saved job</option>{(jobs.data ?? []).map((job) => <option key={job.id} value={job.id}>{job.title || "Untitled role"}{job.companyName ? ` - ${job.companyName}` : ""}</option>)}</Select></FormField>
          </div>
          {(!jobs.isLoading && !jobs.data?.length) && <p className="notice notice--info">Save a target listing in <Link className="text-link" to="/job-matching">Job workspace</Link> before running a tailored check.</p>}
          {(resumes.isError || jobs.isError) && <p className="form-error" role="alert">Could not load your documents. Refresh and try again.</p>}
          {analysis.isError && <p className="form-error" role="alert">{analysis.error.message} Your resume was not changed.</p>}
          <Button disabled={!ready || analysis.isPending} onClick={() => analysis.mutate()}>{analysis.isPending ? "Analyzing match..." : "Run ATS analysis"}</Button>
          {history.data?.length ? <div className="ats-history"><h3>Recent reports</h3>{history.data.slice(0,5).map((item)=><button type="button" key={item.id} onClick={()=>reportQuery.mutate(item.id)}><span>{Math.round(Number(item.overallScore))}% match</span><time>{new Date(item.createdAt).toLocaleDateString()}</time></button>)}</div>:null}
        </Card>

        {analysis.isPending ? <Card><AiJobSkeleton title="Analyzing your resume match" steps={["Reading both documents", "Comparing skills and keywords", "Prioritizing improvements"]} /></Card> : !report ? <Card className="ats-awaiting"><div className="score-ring score-ring--empty"><strong>--</strong><span>match</span></div><h2>Your report will appear here</h2><p className="muted">You will get a match score, detected keywords, missing skills, and prioritized fixes.</p></Card> : (
          <div className="ats-report" aria-live="polite">
            <Card className="ats-score-card"><div className={`score-ring score-ring--${scoreTone(score)}`} style={{ "--score": `${score * 3.6}deg` }}><strong>{Math.round(score)}</strong><span>out of 100</span></div><div><p className="eyebrow">MATCH SCORE</p><h2>{score >= 80 ? "Strong match" : score >= 60 ? "Good foundation" : "Needs tailoring"}</h2><p className="muted">Scores explain alignment, not your worth. Use the findings below as an editing guide.</p></div></Card>
            <div className="report-grid">
              <Card><p className="eyebrow">KEYWORDS</p><h3>Detected in your resume</h3><div className="keyword-list">{report.keywords?.map((item) => <span key={item.keyword} className={`keyword keyword--${item.found ? "found" : "missing"}`}>{item.keyword}</span>)}</div></Card>
              <Card><p className="eyebrow">SKILL GAPS</p><h3>Consider adding evidence</h3>{report.missingSkills?.length ? <ul className="clean-list">{report.missingSkills.map((skill) => <li key={skill}>{skill}</li>)}</ul> : <p className="muted">No major skill gaps detected.</p>}</Card>
            </div>
            <Card><p className="eyebrow">PRIORITIZED FIXES</p><h3>What to improve next</h3>{report.recommendations?.length ? <ol className="recommendation-list">{report.recommendations.map((item, index) => <li key={`${item.category}-${index}`}><span>{index + 1}</span><div><strong>{item.category}</strong><p>{item.text}</p></div></li>)}</ol> : <p className="muted">No specific recommendations were returned.</p>}<Link to={`/resumes/${resumeId}`}><Button variant="secondary">Open resume to improve</Button></Link></Card>
          </div>
        )}
      </div>
    </ModulePage>
  );
};
