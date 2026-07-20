import { useQuery } from "@tanstack/react-query";
import { AsyncState } from "../../../components/AsyncState";
import { Card } from "../../../components/Card";
import { ModulePage } from "../../../components/ModulePage";
import { useAuth } from "../../../context/AuthContext";
import { getProfile } from "../api/profileApi";
export const ProfilePanel = () => {
  const { session } = useAuth();
  const query = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  return (
    <ModulePage
      eyebrow="ACCOUNT"
      title="Profile"
      description="Information shared across your application documents."
    >
      <AsyncState isLoading={query.isLoading} error={query.error?.message} onRetry={query.refetch}>
        <Card>
          <dl className="detail-list">
            <div>
              <dt>Email</dt>
              <dd>{session?.email}</dd>
            </div>
            <div>
              <dt>Profile service</dt>
              <dd>{query.data}</dd>
            </div>
          </dl>
          <p className="muted">
            Profile editing will activate when the backend returns a structured profile contract.
          </p>
        </Card>
      </AsyncState>
    </ModulePage>
  );
};
