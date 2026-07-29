import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { FormField } from "../../../components/FormField";
import { Input } from "../../../components/Input";
import { Select } from "../../../components/Select";
import { SectionListSkeleton } from "../../../components/Skeleton";
import { Textarea } from "../../../components/Textarea";
import {
  createSection,
  deleteSection,
  listSections,
  reorderSections,
  updateSection,
} from "../api/resumeApi";

const fields = {
  EDUCATION: [
    ["institution", "Institution"],
    ["degree", "Degree"],
    ["startYear", "Start year", "number"],
    ["endYear", "End year", "number"],
  ],
  EXPERIENCE: [
    ["employer", "Employer"],
    ["role", "Role"],
    ["startDate", "Start date"],
    ["endDate", "End date"],
  ],
  PROJECT: [
    ["name", "Project name"],
    ["description", "Description", "textarea"],
  ],
  SKILL: [
    ["name", "Skill"],
    ["proficiencyLevel", "Proficiency"],
  ],
  CERTIFICATION: [
    ["name", "Certification"],
    ["issuedBy", "Issued by"],
  ],
};
const labels = {
  EDUCATION: "Education",
  EXPERIENCE: "Experience",
  PROJECT: "Project",
  SKILL: "Skill",
  CERTIFICATION: "Certification",
};
const empty = (type) => ({
  type,
  displayOrder: 0,
  ...Object.fromEntries(fields[type].map(([name]) => [name, ""])),
});
const title = (item) => item.institution || item.employer || item.name || labels[item.type];

export const TypedSectionsEditor = ({ resumeId, onSections }) => {
  const client = useQueryClient();
  const [draft, setDraft] = useState(empty("EXPERIENCE"));
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const query = useQuery({
    queryKey: ["resume-sections", resumeId],
    queryFn: () => listSections(resumeId),
    enabled: Boolean(resumeId),
  });
  const refresh = async () => {
    const result = await client.fetchQuery({
      queryKey: ["resume-sections", resumeId],
      queryFn: () => listSections(resumeId),
    });
    onSections?.(result);
    setEditing(null);
    setDraft(empty(draft.type));
  };
  const save = useMutation({
    mutationFn: (payload) =>
      editing
        ? updateSection({ resumeId, sectionId: editing.id, payload })
        : createSection({ resumeId, payload }),
    onSuccess: refresh,
    onError: (e) => setMessage(e.message),
  });
  const remove = useMutation({
    mutationFn: (sectionId) => deleteSection({ resumeId, sectionId }),
    onSuccess: refresh,
  });
  const reorder = useMutation({
    mutationFn: (ids) => reorderSections({ resumeId, sectionIds: ids }),
    onSuccess: refresh,
  });
  const edit = (item) => {
    setEditing(item);
    setDraft({ ...empty(item.type), ...item });
  };
  const move = (index, delta) => {
    const ids = query.data.map((item) => item.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids);
  };
  const submit = (event) => {
    event.preventDefault();
    setMessage("");
    save.mutate({ ...draft, displayOrder: editing?.displayOrder ?? query.data?.length ?? 0 });
  };
  if (!resumeId)
    return (
      <Card className="notice notice--info">
        <p>Save the resume header first, then add typed sections.</p>
      </Card>
    );
  return (
    <div className="typed-sections">
      <div className="typed-section-list">
        {query.isLoading ? (
          <SectionListSkeleton count={3} />
        ) : (
          (query.data ?? []).map((item, index) => (
            <Card key={item.id} className="typed-section-card">
              <div>
                <span className="status-pill">{labels[item.type]}</span>
                <h3>{title(item)}</h3>
                <p className="muted">
                  {item.degree ||
                    item.role ||
                    item.description ||
                    item.proficiencyLevel ||
                    item.issuedBy ||
                    "No additional details"}
                </p>
              </div>
              <div className="section-card-actions">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={index === 0 || reorder.isPending}
                  onClick={() => move(index, -1)}
                  aria-label={`Move ${title(item)} up`}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={index === query.data.length - 1 || reorder.isPending}
                  onClick={() => move(index, 1)}
                  aria-label={`Move ${title(item)} down`}
                >
                  ↓
                </Button>
                <Button type="button" variant="ghost" onClick={() => edit(item)}>
                  Edit
                </Button>
                <Button type="button" variant="ghost" onClick={() => remove.mutate(item.id)}>
                  Remove
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
      <Card className="typed-section-form">
        <h3>{editing ? `Edit ${labels[draft.type]}` : "Add a section"}</h3>
        <form onSubmit={submit}>
          <FormField id="sectionType" label="Section type">
            <Select
              id="sectionType"
              value={draft.type}
              disabled={Boolean(editing)}
              onChange={(e) => setDraft(empty(e.target.value))}
            >
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="form-grid">
            {fields[draft.type].map(([name, label, kind]) => (
              <FormField key={name} id={`section-${name}`} label={label}>
                {kind === "textarea" ? (
                  <Textarea
                    id={`section-${name}`}
                    rows="4"
                    value={draft[name] ?? ""}
                    onChange={(e) => setDraft({ ...draft, [name]: e.target.value })}
                  />
                ) : (
                  <Input
                    id={`section-${name}`}
                    type={kind || "text"}
                    value={draft[name] ?? ""}
                    onChange={(e) => setDraft({ ...draft, [name]: e.target.value })}
                  />
                )}
              </FormField>
            ))}
          </div>
          {message && (
            <p className="form-error" role="alert">
              {message}
            </p>
          )}
          <div className="form-actions">
            <Button disabled={save.isPending}>
              {save.isPending ? "Saving…" : editing ? "Update section" : "Add section"}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(null);
                  setDraft(empty(draft.type));
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};
