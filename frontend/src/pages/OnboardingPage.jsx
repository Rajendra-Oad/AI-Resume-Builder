import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { AppIcon } from "../components/AppIcon";
import { Button } from "../components/Button";
import { completeOnboarding,getProfile } from "../features/profile/api/profileApi";

const personas = [
  { id: "STUDENT", title: "Student", description: "I’m building experience through education, activities, or projects." },
  { id: "FRESHER", title: "Fresher", description: "I have up to two years of professional experience." },
  { id: "PROFESSIONAL", title: "Professional", description: "I’m growing in my current field and want to move faster." },
  { id: "CAREER_SWITCHER", title: "Career switcher", description: "I’m translating existing strengths into a new direction." },
];

const goals = [
  { id: "FIRST_RESUME", title: "Create my first resume", description: "Guide me from a blank page to a complete draft." },
  { id: "IMPROVE_RESUME", title: "Improve my resume", description: "Help me sharpen the story and presentation." },
  { id: "TAILOR_FOR_JOB", title: "Tailor for a specific job", description: "Compare my resume with a role I’m targeting." },
  { id: "EXPLORE_OPPORTUNITIES", title: "Explore opportunities", description: "Help me prepare for roles that fit my strengths." },
];

const destinationFor = (goal, fallback) => {
  if (fallback?.pathname && fallback.pathname !== "/onboarding") return fallback.pathname;
  if (goal === "FIRST_RESUME") return "/resumes/new";
  if (goal === "TAILOR_FOR_JOB" || goal === "EXPLORE_OPPORTUNITIES") return "/job-matching";
  return "/dashboard";
};

const ChoiceList = ({ legend, name, options, value, onChange }) => (
  <fieldset className="onboarding-choices">
    <legend className="sr-only">{legend}</legend>
    {options.map((option) => (
      <label key={option.id} className={`onboarding-choice ${value === option.id ? "onboarding-choice--selected" : ""}`}>
        <input type="radio" name={name} value={option.id} checked={value === option.id} onChange={() => onChange(option.id)} />
        <span className="onboarding-choice__mark" aria-hidden="true">{value === option.id ? "✓" : ""}</span>
        <span><strong>{option.title}</strong><small>{option.description}</small></span>
      </label>
    ))}
  </fieldset>
);

export const OnboardingPage = () => {
  const [step, setStep] = useState(0);
  const [persona, setPersona] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const mutation = useMutation({ mutationFn: completeOnboarding });

  useEffect(() => {
    if (profile.data?.persona) setPersona(profile.data.persona);
    if (profile.data?.careerGoal) setCareerGoal(profile.data.careerGoal);
  }, [profile.data]);

  if (profile.isLoading) return <div className="page-loader"><span /></div>;
  if (profile.data?.onboardingCompleted) return <Navigate to="/dashboard" replace />;

  const finish = async () => {
    try {
      const saved = await mutation.mutateAsync({ persona, careerGoal });
      queryClient.setQueryData(["profile"], saved);
      navigate(destinationFor(careerGoal, location.state?.from), { replace: true });
    } catch {
      // The mutation error is rendered inline while the user's choices remain selected.
    }
  };

  return (
    <main className="onboarding-page">
      <header className="onboarding-brand"><span className="brand"><AppIcon name="ai" size={19} /> résumé</span><span>Setup takes about a minute</span></header>
      <section className="onboarding-card" aria-labelledby="onboarding-title">
        <div className="onboarding-progress" aria-label={`Step ${step + 1} of 2`}><span className="eyebrow">STEP {step + 1} OF 2</span><div><i className="complete" /><i className={step === 1 ? "complete" : ""} /></div></div>
        {step === 0 ? <><p className="eyebrow">MAKE IT YOURS</p><h1 id="onboarding-title">Where are you in your career?</h1><p className="muted">We’ll adjust examples and guidance to match your experience. You can change this later.</p><ChoiceList legend="Career stage" name="persona" options={personas} value={persona} onChange={setPersona} /></> : <><p className="eyebrow">YOUR NEXT MOVE</p><h1 id="onboarding-title">What would you like to accomplish first?</h1><p className="muted">Your answer only chooses the best starting point. Every tool remains available.</p><ChoiceList legend="Primary goal" name="careerGoal" options={goals} value={careerGoal} onChange={setCareerGoal} /></>}
        {mutation.error && <p className="form-error" role="alert">{mutation.error.status === 403 ? "We couldn’t save your setup because the server rejected the browser request. Refresh once and try again." : mutation.error.message}</p>}
        <div className="onboarding-actions">
          {step === 1 && <Button type="button" variant="ghost" onClick={() => setStep(0)}>Back</Button>}
          {step === 0 ? <Button type="button" disabled={!persona} onClick={() => setStep(1)}>Continue</Button> : <Button type="button" disabled={!careerGoal || mutation.isPending} onClick={finish}>{mutation.isPending ? "Saving your choices…" : "Finish setup"}</Button>}
        </div>
      </section>
      <p className="onboarding-assurance">Your answers personalize guidance—they never limit what you can create.</p>
    </main>
  );
};
