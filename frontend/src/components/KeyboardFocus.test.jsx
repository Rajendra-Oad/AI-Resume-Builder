import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { Dropdown } from "./Dropdown";
import { Modal } from "./Modal";
import { RouteFocusManager } from "./RouteFocusManager";

describe("keyboard and focus behavior", () => {
  it("traps focus in a modal, closes on Escape, and restores trigger focus", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <><button>Open editor</button><Modal isOpen={false} onClose={onClose} title="Editor" /></>,
    );
    screen.getByRole("button", { name: "Open editor" }).focus();
    rerender(<><button>Open editor</button><Modal isOpen onClose={onClose} title="Editor"><button>Cancel</button><button>Save</button></Modal></>);
    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
    rerender(<><button>Open editor</button><Modal isOpen={false} onClose={onClose} title="Editor" /></>);
    expect(screen.getByRole("button", { name: "Open editor" })).toHaveFocus();
  });

  it("opens and operates a dropdown without a pointer", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Dropdown label="Actions" items={[{ label: "Duplicate", onSelect }]} />);
    await user.tab();
    await user.keyboard("{Enter}");
    const item = screen.getByRole("menuitem", { name: "Duplicate" });
    await user.click(item);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("moves focus to the page heading after navigation", async () => {
    const user = userEvent.setup();
    const First = () => { const navigate = useNavigate(); return <main><h1>First</h1><button onClick={() => navigate("/second")}>Next</button></main>; };
    render(<MemoryRouter initialEntries={["/"]}><RouteFocusManager /><Routes><Route path="/" element={<First />} /><Route path="/second" element={<main><h1>Second</h1></main>} /></Routes></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Second" })).toHaveFocus();
    expect(screen.getByRole("heading", { name: "Second" })).toHaveClass("route-focus-heading");
  });
});
