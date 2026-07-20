import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("renders its accessible label", () => {
    render(<Button>Save resume</Button>);
    expect(screen.getByRole("button", { name: "Save resume" })).toBeInTheDocument();
  });
});
