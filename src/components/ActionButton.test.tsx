// @vitest-environment jsdom

import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { Plus } from "lucide-react";
import { describe, expect, test, vi } from "vitest";
import ActionButton from "./ActionButton";

describe("ActionButton", () => {
  test("uses the standard button treatment with a consistently sized icon", () => {
    render(<ActionButton icon={Plus}>Add Course</ActionButton>);
    const button = screen.getByRole("button", { name: "Add Course" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("h-11", "px-4", "bg-violet-600", "gap-2");
    expect(button.querySelector("svg")).toHaveClass("size-4");
  });

  test("preserves standard Button variants and interaction props", () => {
    const onClick = vi.fn();
    render(
      <ActionButton icon={Plus} variant="outline" size="sm" disabled onClick={onClick}>
        Add item
      </ActionButton>,
    );
    const button = screen.getByRole("button", { name: "Add item" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("h-10", "border", "bg-white/80");
    expect(onClick).not.toHaveBeenCalled();
  });

  test("forwards its ref for dialog triggers and focus management", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<ActionButton ref={ref} icon={Plus}>Add item</ActionButton>);
    expect(ref.current).toBe(screen.getByRole("button", { name: "Add item" }));
  });

  test("allows an explicit submit type for form actions", () => {
    render(<ActionButton icon={Plus} type="submit">Create</ActionButton>);
    expect(screen.getByRole("button", { name: "Create" })).toHaveAttribute("type", "submit");
  });
});
