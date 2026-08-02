import { useMemo, useState } from "react";

import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Select } from "../../../components/Select";
import { Table } from "../../../components/Table";

const date = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
const money = (payment) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: payment.currency }).format(payment.amount);

export const PaymentHistory = ({ page, payments, onPageChange, onSelect }) => {
  const [sort, setSort] = useState("newest");
  const rows = useMemo(() => [...payments.items].sort((left, right) => {
    const direction = sort === "oldest" ? 1 : -1;
    return direction * (new Date(left.occurredAt) - new Date(right.occurredAt));
  }), [payments.items, sort]);
  const pagination = payments.pagination ?? { totalPages: 0, totalElements: 0 };
  const columns = [
    { key: "occurredAt", label: "Date", render: (item) => date(item.occurredAt) },
    { key: "provider", label: "Provider" },
    { key: "reference", label: "Reference" },
    { key: "amount", label: "Amount", render: money },
    { key: "status", label: "Status", render: (item) => <span className="billing-status billing-status--info">{item.status}</span> },
    { key: "details", label: "Actions", render: (item) => <Button variant="ghost" onClick={() => onSelect(item)} aria-label={`View transaction ${item.id}`}>Details</Button> },
  ];
  return (
    <Card className="billing-payments-card" data-reveal>
      <div className="billing-card-heading">
        <div><p className="eyebrow">PAYMENTS</p><h2>Payment history</h2></div>
        <Select aria-label="Sort payments" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </Select>
      </div>
      <Table columns={columns} rows={rows} emptyMessage="No payments have been recorded." />
      <div className="billing-pagination" aria-label="Payment history pagination">
        <span>{pagination.totalElements ?? 0} total payments</span>
        <div>
          <Button variant="secondary" disabled={page <= 0} onClick={() => onPageChange(page - 1)}>Previous</Button>
          <span aria-live="polite">Page {page + 1} of {Math.max(1, pagination.totalPages ?? 0)}</span>
          <Button variant="secondary" disabled={page + 1 >= (pagination.totalPages ?? 0)} onClick={() => onPageChange(page + 1)}>Next</Button>
        </div>
      </div>
    </Card>
  );
};
