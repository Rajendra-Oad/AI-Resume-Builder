import { Button } from "../../../components/Button";
import { Modal } from "../../../components/Modal";

const timestamp = (value) =>
  value ? new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "short" }).format(new Date(value)) : "—";
const money = (payment) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: payment.currency }).format(payment.amount);

export const PaymentDetailsModal = ({ payment, onClose }) => (
  <Modal isOpen={Boolean(payment)} onClose={onClose} title="Transaction details">
    {payment && (
      <>
        <dl className="billing-transaction-details">
          <div><dt>Transaction</dt><dd>#{payment.id}</dd></div>
          <div><dt>Subscription</dt><dd>#{payment.subscriptionId}</dd></div>
          <div><dt>Plan</dt><dd>{payment.plan}</dd></div>
          <div><dt>Date</dt><dd>{timestamp(payment.occurredAt)}</dd></div>
          <div><dt>Provider</dt><dd>{payment.provider}</dd></div>
          <div><dt>Reference</dt><dd>{payment.reference}</dd></div>
          <div><dt>Amount</dt><dd>{money(payment)}</dd></div>
          <div><dt>Status</dt><dd>{payment.status}</dd></div>
        </dl>
        <p className="muted billing-reference-note">Payment references are masked by the server for security.</p>
        <div className="dialog-actions"><Button onClick={onClose}>Done</Button></div>
      </>
    )}
  </Modal>
);
