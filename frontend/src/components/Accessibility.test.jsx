import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

import { FormField } from "./FormField";
import { Input } from "./Input";
import { Modal } from "./Modal";

describe("component accessibility", () => {
  it("has no automated accessibility violations in a form dialog", async () => {
    const { container } = render(
      <Modal isOpen onClose={vi.fn()} title="Edit profile">
        <FormField id="display-name" label="Display name" hint="Shown on your resume">
          <Input id="display-name" />
        </FormField>
        <button type="button">Save</button>
      </Modal>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
