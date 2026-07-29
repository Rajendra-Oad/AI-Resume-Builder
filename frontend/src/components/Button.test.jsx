import { render, screen } from "@testing-library/react";

import { Button } from "./Button";

describe("Button", () => {
  it("renders its accessible label", () => {
    render(<Button>Save resume</Button>);
    expect(screen.getByRole("button", { name: "Save resume" })).toBeInTheDocument();
  });

  it("uses the primary style for an unknown variant", () => {
    render(<Button variant="unknown">Save resume</Button>);
    expect(screen.getByRole("button", { name: "Save resume" })).toHaveClass("button--primary");
  });
});
