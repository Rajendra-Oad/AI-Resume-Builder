import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AsyncState } from "../../../components/AsyncState";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { FormField } from "../../../components/FormField";
import { Input } from "../../../components/Input";
import { ModulePage } from "../../../components/ModulePage";
import { Select } from "../../../components/Select";
import { FormSkeleton } from "../../../components/Skeleton";
import {
  completeOnboarding,
  deleteProfilePhoto,
  getProfile,
  getProfilePhoto,
  updateProfile,
  uploadProfilePhoto,
} from "../api/profileApi";

const displayValue = (value) => {
  const text = value == null ? "" : String(value).trim();
  return text || "Not provided";
};

const editableFields = (profile) => ({
  firstName: profile.firstName ?? "",
  lastName: profile.lastName ?? "",
  displayName: profile.displayName ?? "",
  phone: profile.phone ?? "",
  location: profile.location ?? "",
  persona: profile.persona ?? "PROFESSIONAL",
  careerGoal: profile.careerGoal ?? "IMPROVE_RESUME",
});

const ProfileForm = ({ profile }) => {
  const queryClient = useQueryClient();
  const [values, setValues] = useState(() => editableFields(profile));
  const [message, setMessage] = useState("");
  const photo = useQuery({
    queryKey: ["profile-photo"],
    queryFn: getProfilePhoto,
    enabled: Boolean(profile.photoUrl),
    select: (blob) => window.URL.createObjectURL(blob),
  });
  useEffect(
    () => () => {
      if (photo.data) window.URL.revokeObjectURL(photo.data);
    },
    [photo.data],
  );
  const photoMutation = useMutation({
    mutationFn: uploadProfilePhoto,
    onSuccess: async (saved) => {
      queryClient.setQueryData(["profile"], saved);
      await queryClient.invalidateQueries({ queryKey: ["profile-photo"] });
      setMessage("Profile photo updated.");
    },
    onError: (error) => setMessage(error.message),
  });
  const deletePhoto = useMutation({
    mutationFn: deleteProfilePhoto,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.removeQueries({ queryKey: ["profile-photo"] });
      setMessage("Profile photo removed.");
    },
  });
  const mutation = useMutation({
    mutationFn: async ({ persona, careerGoal, ...details }) => {
      await updateProfile(details);
      return completeOnboarding({ persona, careerGoal });
    },
  });

  const change = ({ target }) => {
    setValues((current) => ({ ...current, [target.name]: target.value }));
    setMessage("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    const saved = await mutation.mutateAsync({
      ...values,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
    });
    queryClient.setQueryData(["profile"], saved);
    setValues(editableFields(saved));
    setMessage("Profile updated successfully.");
  };

  return (
    <Card className="profile-card">
      <section className="profile-photo-editor" aria-labelledby="profile-photo-title">
        <div className="profile-avatar">
          {photo.data ? (
            <img src={photo.data} alt="Your profile" />
          ) : (
            <span>
              {(values.firstName[0] || "").toUpperCase()}
              {(values.lastName[0] || "").toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h2 id="profile-photo-title">Profile photo</h2>
          <p className="muted">JPEG, PNG, or WebP. Maximum 5 MB.</p>
          <div className="profile-photo-actions">
            <label className="button button--secondary">
              {photoMutation.isPending ? "Uploading…" : "Upload photo"}
              <Input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={photoMutation.isPending}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) photoMutation.mutate(file);
                  event.target.value = "";
                }}
              />
            </label>
            {profile.photoUrl && (
              <Button
                type="button"
                variant="ghost"
                disabled={deletePhoto.isPending}
                onClick={() => deletePhoto.mutate()}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </section>
      <form className="profile-form" onSubmit={submit}>
        <div className="profile-form__heading">
          <h2>Personal and career information</h2>
          <p className="muted">Update the details used across your resumes and recommendations.</p>
        </div>
        <div className="form-grid">
          <FormField id="firstName" label="First name">
            <Input
              id="firstName"
              name="firstName"
              value={values.firstName}
              onChange={change}
              maxLength={100}
              autoComplete="given-name"
              required
            />
          </FormField>
          <FormField id="lastName" label="Last name">
            <Input
              id="lastName"
              name="lastName"
              value={values.lastName}
              onChange={change}
              maxLength={100}
              autoComplete="family-name"
              required
            />
          </FormField>
          <FormField id="displayName" label="Display name" hint="Optional name shown in the app.">
            <Input
              id="displayName"
              name="displayName"
              value={values.displayName}
              onChange={change}
              maxLength={100}
              autoComplete="nickname"
            />
          </FormField>
          <FormField
            id="phone"
            label="Phone"
            hint="Use an Indian mobile number, for example +91 98765 43210."
          >
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={values.phone}
              onChange={change}
              maxLength={50}
              autoComplete="tel"
            />
          </FormField>
          <FormField id="location" label="Location">
            <Input
              id="location"
              name="location"
              value={values.location}
              onChange={change}
              maxLength={255}
              autoComplete="address-level2"
            />
          </FormField>
          <FormField id="persona" label="Career stage">
            <Select id="persona" name="persona" value={values.persona} onChange={change}>
              <option value="STUDENT">Student</option>
              <option value="FRESHER">Fresher</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="CAREER_SWITCHER">Career switcher</option>
            </Select>
          </FormField>
          <FormField id="careerGoal" label="Primary goal">
            <Select id="careerGoal" name="careerGoal" value={values.careerGoal} onChange={change}>
              <option value="FIRST_RESUME">Create my first resume</option>
              <option value="IMPROVE_RESUME">Improve my resume</option>
              <option value="TAILOR_FOR_JOB">Tailor for a specific job</option>
              <option value="EXPLORE_OPPORTUNITIES">Explore opportunities</option>
            </Select>
          </FormField>
        </div>

        {mutation.error && (
          <p className="form-error" role="alert">
            {mutation.error.message}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save profile"}
        </Button>
      </form>
      <section className="profile-account-details" aria-labelledby="account-details-title">
        <div className="profile-form__heading">
          <h2 id="account-details-title">Account details</h2>
          <p className="muted">Read-only information associated with your account.</p>
        </div>
        <dl className="detail-list">
          <div>
            <dt>Account ID</dt>
            <dd>{displayValue(profile.publicId)}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{displayValue(profile.email)}</dd>
          </div>
          <div>
            <dt>Account role</dt>
            <dd>{displayValue(profile.role)}</dd>
          </div>
        </dl>
      </section>
    </Card>
  );
};

export const ProfilePanel = () => {
  const query = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  return (
    <ModulePage
      eyebrow="ACCOUNT"
      title="Profile"
      description="Information shared across your application documents."
    >
      <AsyncState
        isLoading={query.isLoading}
        error={query.error?.message}
        onRetry={query.refetch}
        fallback={<FormSkeleton fields={7} className="profile-card" />}
      >
        {query.data ? (
          <ProfileForm key={query.data.publicId ?? query.data.email} profile={query.data} />
        ) : null}
      </AsyncState>
    </ModulePage>
  );
};
