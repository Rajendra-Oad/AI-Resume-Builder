import { useMemo, useState } from "react";

import { AsyncState } from "../../../components/AsyncState";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Input } from "../../../components/Input";
import { ModulePage } from "../../../components/ModulePage";
import { Select } from "../../../components/Select";
import { ListSkeleton } from "../../../components/Skeleton";
import { useAuditHistory } from "../hooks/useAuditHistory";
import { AuditDetailsModal } from "./AuditDetailsModal";
import { AuditTimeline, describeAuditEntry } from "./AuditTimeline";

const instant = (value, end = false) => value ? new Date(`${value}T${end ? "23:59:59.999" : "00:00:00"}`).getTime() : null;

export const AuditHistoryWorkspace = () => {
  const { history, page, setPage } = useAuditHistory();
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState(null);
  const items = useMemo(() => history.data?.items ?? [], [history.data?.items]);
  const actions = useMemo(() => [...new Set(items.map((item) => item.action))].sort(), [items]);
  const entities = useMemo(() => [...new Set(items.map((item) => item.entityType))].sort(), [items]);
  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase(); const start = instant(from); const end = instant(to, true);
    return items.filter((item) => {
      const created = new Date(item.createdAt).getTime();
      const text = `${item.action} ${item.entityType} ${describeAuditEntry(item)}`.toLocaleLowerCase();
      return (!needle || text.includes(needle)) && (!action || item.action === action) && (!entity || item.entityType === entity) && (start === null || created >= start) && (end === null || created <= end);
    }).sort((left, right) => (sort === "oldest" ? 1 : -1) * (new Date(left.createdAt) - new Date(right.createdAt)));
  }, [action, entity, from, items, search, sort, to]);
  const pagination = history.data?.pagination ?? {};
  const clear = () => { setSearch(""); setAction(""); setEntity(""); setFrom(""); setTo(""); setSort("newest"); };
  return <ModulePage eyebrow="ACCOUNT ACTIVITY" title="Personal audit history" description="Review security and workspace actions recorded for your account.">
    <AsyncState isLoading={history.isLoading} error={history.error?.message} onRetry={history.refetch} fallback={<ListSkeleton count={6} />}>
      <Card className="audit-history-card">
        <div className="notice notice--info audit-page-scope" role="note">Search, filters, and sorting apply to the currently loaded page. The backend does not yet support account-wide filtering.</div>
        <div className="audit-filters" aria-label="Filter personal activity">
          <label><span>Search this page</span><Input type="search" value={search} placeholder="Action, entity, or description" onChange={(event) => setSearch(event.target.value)} /></label>
          <label><span>Action</span><Select value={action} onChange={(event) => setAction(event.target.value)}><option value="">All actions</option>{actions.map((value) => <option key={value}>{value}</option>)}</Select></label>
          <label><span>Entity</span><Select value={entity} onChange={(event) => setEntity(event.target.value)}><option value="">All entities</option>{entities.map((value) => <option key={value}>{value}</option>)}</Select></label>
          <label><span>From</span><Input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></label>
          <label><span>To</span><Input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></label>
          <label><span>Sort</span><Select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></Select></label>
          <Button type="button" variant="secondary" onClick={clear}>Clear</Button>
        </div>
        <AuditTimeline entries={visible} hasHistory={items.length > 0} onSelect={setSelected} />
        <div className="audit-pagination" aria-label="Personal audit history pagination">
          <span>{pagination.totalElements ?? 0} total records</span><div>
            <Button variant="secondary" disabled={page <= 0 || history.isFetching} onClick={() => setPage(page - 1)}>Previous</Button>
            <span aria-live="polite">Page {page + 1} of {Math.max(1, pagination.totalPages ?? 0)}</span>
            <Button variant="secondary" disabled={page + 1 >= (pagination.totalPages ?? 0) || history.isFetching} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      </Card>
    </AsyncState>
    <AuditDetailsModal entry={selected} onClose={() => setSelected(null)} />
  </ModulePage>;
};
