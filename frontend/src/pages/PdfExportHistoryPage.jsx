import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { AsyncState } from "../components/AsyncState";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { ModulePage } from "../components/ModulePage";
import { notify } from "../components/NotificationProvider";
import { Select } from "../components/Select";
import { TableSkeleton } from "../components/Skeleton";
import { Table } from "../components/Table";
import {
  downloadResumePdf,
  getResume,
  listPdfExports,
} from "../features/resume/api/resumeApi";
import {
  formatBytes,
  formatDateTime,
  PdfExportDetailsModal,
} from "../features/resume/components/PdfExportDetailsModal";

const PAGE_SIZE = 10;
const shortHash = (value) => value?.length > 18 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
const dateValue = (value) => new Date(value).getTime();

export const PdfExportHistoryPage = () => {
  const { resumeId } = useParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sort, setSort] = useState("date-desc");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const resume = useQuery({ queryKey: ["resume", resumeId], queryFn: () => getResume(resumeId) });
  const exportsQuery = useQuery({
    queryKey: ["pdf-exports", resumeId],
    queryFn: () => listPdfExports(resumeId),
  });

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;
    const title = resume.data?.title ?? "";
    return [...(exportsQuery.data ?? [])]
      .filter((item) => {
        const exportedAt = dateValue(item.createdAt);
        const matchesSearch = !needle || item.fileName.toLocaleLowerCase().includes(needle) || title.toLocaleLowerCase().includes(needle);
        return matchesSearch && (start === null || exportedAt >= start) && (end === null || exportedAt <= end);
      })
      .sort((left, right) => {
        if (sort === "date-asc") return dateValue(left.createdAt) - dateValue(right.createdAt);
        if (sort === "size-desc") return right.byteSize - left.byteSize;
        if (sort === "size-asc") return left.byteSize - right.byteSize;
        if (sort === "resume-asc") return title.localeCompare(title) || dateValue(right.createdAt) - dateValue(left.createdAt);
        return dateValue(right.createdAt) - dateValue(left.createdAt);
      });
  }, [endDate, exportsQuery.data, resume.data?.title, search, sort, startDate]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const updateFilter = (setter) => (event) => { setter(event.target.value); setPage(0); };
  const clearFilters = () => { setSearch(""); setStartDate(""); setEndDate(""); setSort("date-desc"); setPage(0); };

  const generate = async () => {
    setIsGenerating(true);
    try {
      await downloadResumePdf(resumeId, resume.data?.title);
      await queryClient.invalidateQueries({ queryKey: ["pdf-exports", resumeId] });
      notify.export({ message: "A new PDF was generated and added to this history." });
    } catch (error) {
      notify.error({ message: error.message || "The PDF could not be generated." });
    } finally {
      setIsGenerating(false);
    }
  };

  const columns = [
    { key: "resume", label: "Resume", render: () => resume.data?.title || "Untitled resume" },
    { key: "createdAt", label: "Export date", render: (item) => formatDateTime(item.createdAt) },
    { key: "fileName", label: "File name" },
    { key: "byteSize", label: "File size", render: (item) => formatBytes(item.byteSize) },
    { key: "sha256", label: "SHA-256", render: (item) => <code title={item.sha256}>{shortHash(item.sha256)}</code> },
    { key: "actions", label: "Actions", render: (item) => <Button type="button" variant="ghost" aria-label={`View details for ${item.fileName}`} onClick={() => setSelected(item)}>Details</Button> },
  ];

  const error = resume.error || exportsQuery.error;
  const noHistory = (exportsQuery.data?.length ?? 0) === 0;
  return (
    <ModulePage
      eyebrow="PDF EXPORTS"
      title={resume.data?.title ? `${resume.data.title} export history` : "PDF export history"}
      description="Review the PDFs generated for this resume. Historical files are not stored for re-download."
    >
      <div className="pdf-export-actions">
        <Link to={`/resumes/${resumeId}/preview`}><Button variant="ghost">Back to preview</Button></Link>
        <Button disabled={!resume.data || isGenerating} onClick={generate}>
          {isGenerating ? "Generating…" : "Generate new PDF"}
        </Button>
      </div>
      <AsyncState
        isLoading={resume.isLoading || exportsQuery.isLoading}
        error={error?.message}
        onRetry={() => { resume.refetch(); exportsQuery.refetch(); }}
        fallback={<TableSkeleton rows={6} columns={6} />}
      >
        <Card className="pdf-export-history-card">
          <div className="pdf-export-filters" aria-label="Filter PDF export history">
            <label><span>Search</span><Input type="search" value={search} placeholder="Resume or file name" onChange={updateFilter(setSearch)} /></label>
            <label><span>From</span><Input type="date" value={startDate} max={endDate || undefined} onChange={updateFilter(setStartDate)} /></label>
            <label><span>To</span><Input type="date" value={endDate} min={startDate || undefined} onChange={updateFilter(setEndDate)} /></label>
            <label><span>Sort</span><Select value={sort} onChange={updateFilter(setSort)} aria-label="Sort PDF exports">
              <option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option>
              <option value="resume-asc">Resume title</option><option value="size-desc">Largest first</option><option value="size-asc">Smallest first</option>
            </Select></label>
            <Button type="button" variant="secondary" onClick={clearFilters}>Clear</Button>
          </div>
          <Table
            columns={columns}
            rows={rows}
            emptyMessage={noHistory ? "No PDFs have been exported for this resume yet." : "No exports match your search or filters."}
          />
          <div className="pdf-export-pagination" aria-label="PDF export history pagination">
            <span>{filtered.length} matching {filtered.length === 1 ? "export" : "exports"}</span>
            <div>
              <Button variant="secondary" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</Button>
              <span aria-live="polite">Page {currentPage + 1} of {pageCount}</span>
              <Button variant="secondary" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>Next</Button>
            </div>
          </div>
        </Card>
      </AsyncState>
      <PdfExportDetailsModal exportItem={selected} resumeTitle={resume.data?.title || "Untitled resume"} onClose={() => setSelected(null)} />
    </ModulePage>
  );
};
