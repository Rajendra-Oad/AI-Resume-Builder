import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Table } from "./Table";

describe("Table", () => {
  it("renders semantic headings and rows", () => {
    render(<Table columns={[{ key: "name", label: "Name" }]} rows={[{ id: 1, name: "Resume" }]} />);
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Resume" })).toBeInTheDocument();
  });
});
