import { useQuery } from "@tanstack/react-query";
import { AsyncState } from "../../../components/AsyncState";
import { Card } from "../../../components/Card";
import { ModulePage } from "../../../components/ModulePage";
import { getProfile } from "../api/profileApi";

const displayValue = (value) => {
  const text = value == null ? "" : String(value).trim();
  return text || "Not provided";
};

export const ProfilePanel = () => {
  const query = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const profile = query.data;
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");

  return (
    <ModulePage
      eyebrow="ACCOUNT"
      title="Profile"
      description="Information shared across your application documents."
    >
      <AsyncState isLoading={query.isLoading} error={query.error?.message} onRetry={query.refetch}>
        <Card>
          <h2>Account details</h2>
          <dl className="detail-list">
            <div>
              <dt>Account ID</dt>
              <dd>{displayValue(profile?.id)}</dd>
            </div>
            <div>
              <dt>Name</dt>
              <dd>{displayValue(fullName)}</dd>
            </div>
            <div>
              <dt>Display name</dt>
              <dd>{displayValue(profile?.displayName)}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{displayValue(profile?.email)}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{displayValue(profile?.role)}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{displayValue(profile?.phone)}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{displayValue(profile?.location)}</dd>
            </div>
          </dl>
        </Card>
      </AsyncState>
    </ModulePage>
  );
};
