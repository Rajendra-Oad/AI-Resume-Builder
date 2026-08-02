import { Button } from "../../../components/Button";

const formatAction = (value = "Activity") => value.toLocaleLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toLocaleUpperCase());
const formatTime = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const startOfToday = () => { const now = new Date(); now.setHours(0, 0, 0, 0); return now; };
const groupName = (value) => {
  const date = new Date(value); const today = startOfToday();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const week = new Date(today); week.setDate(today.getDate() - 7);
  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= week) return "Last 7 Days";
  return "Older";
};

export const describeAuditEntry = (entry) => `${formatAction(entry.action)} ${entry.entityType} #${entry.entityId}`;

export const AuditTimeline = ({ entries, hasHistory, onSelect }) => {
  const groups = entries.reduce((all, entry) => {
    const name = groupName(entry.createdAt);
    if (!all.has(name)) all.set(name, []);
    all.get(name).push(entry);
    return all;
  }, new Map());
  if (!entries.length) return <div className="empty-state empty-state--compact"><h3>{hasHistory ? "No matching activity" : "No activity yet"}</h3><p>{hasHistory ? "Adjust the filters to review other records on this page." : "Security and resume activity will appear here when it is recorded."}</p></div>;
  return <div className="audit-timeline">{[...groups].map(([name, items]) => <section key={name} aria-labelledby={`audit-${name.replaceAll(" ", "-").toLocaleLowerCase()}`}>
    <h2 id={`audit-${name.replaceAll(" ", "-").toLocaleLowerCase()}`}>{name}</h2>
    <ol>{items.map((entry) => <li key={entry.id}>
      <span className="audit-timeline__marker" aria-hidden="true" />
      <div className="audit-timeline__content"><strong>{formatAction(entry.action)}</strong><p>{describeAuditEntry(entry)}</p><span>{entry.entityType} · #{entry.entityId}{entry.ipAddress ? ` · ${entry.ipAddress}` : ""}</span><time dateTime={entry.createdAt}>{formatTime(entry.createdAt)}</time></div>
      <Button type="button" variant="ghost" aria-label={`View details for ${describeAuditEntry(entry)}`} onClick={() => onSelect(entry)}>Details</Button>
    </li>)}</ol>
  </section>)}</div>;
};
