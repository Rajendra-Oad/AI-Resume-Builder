import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBilling } from "../hooks/useBilling";
import { BillingWorkspace } from "./BillingWorkspace";

vi.mock("../hooks/useBilling", () => ({ useBilling: vi.fn() }));

const query = (data) => ({ data, isLoading: false, error: null, refetch: vi.fn() });
const payment = {
  id: 41,
  subscriptionId: 8,
  plan: "PREMIUM",
  provider: "STRIPE",
  reference: "****1234",
  amount: 12.5,
  currency: "USD",
  status: "SUCCEEDED",
  occurredAt: "2026-07-20T10:00:00Z",
};

const state = () => ({
  plans: query([
    { code: "FREE", displayName: "Free", paid: false, selfServiceAvailable: true },
    { code: "PREMIUM", displayName: "Premium", paid: true, selfServiceAvailable: false },
    { code: "PRO", displayName: "Pro", paid: true, selfServiceAvailable: false },
  ]),
  current: query({ id: 8, plan: "PREMIUM", status: "ACTIVE", startsAt: "2026-07-01T00:00:00Z", endsAt: null }),
  entitlement: query({ plan: "PREMIUM", active: true, premium: true }),
  history: query({ items: [{ id: 8, plan: "PREMIUM", status: "ACTIVE", startsAt: "2026-07-01T00:00:00Z" }], pagination: { totalElements: 1 } }),
  payments: query({ items: [payment], pagination: { page: 0, totalPages: 1, totalElements: 1 } }),
  paymentPage: 0,
  setPaymentPage: vi.fn(),
  cancel: { mutateAsync: vi.fn(), isPending: false },
});

describe("BillingWorkspace", () => {
  beforeEach(() => useBilling.mockReturnValue(state()));

  it("renders server-backed plan and payment information", () => {
    render(<MemoryRouter><BillingWorkspace /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Subscription & billing" })).toBeInTheDocument();
    expect(screen.getByText("****1234")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Downgrade to Free" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Contact support" })).toBeDisabled();
  });

  it("opens accessible transaction and cancellation dialogs", () => {
    render(<MemoryRouter><BillingWorkspace /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "View transaction 41" }));
    expect(screen.getByRole("dialog", { name: "Transaction details" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel subscription" }));
    expect(screen.getByRole("alertdialog", { name: "Cancel your subscription?" })).toBeInTheDocument();
  });

  it("has no automated accessibility violations", async () => {
    const { container } = render(<MemoryRouter><BillingWorkspace /></MemoryRouter>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
