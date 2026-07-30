// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import AddCourseDialog from "./AddCourseDialog";

const openDialog = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Add Course" }));
};

describe("AddCourseDialog", () => {
  test("requires both a course name and code", async () => {
    render(<AddCourseDialog onAddCourse={vi.fn()} isCreating={false} />);
    await openDialog();

    const submit = screen.getByRole("button", { name: "Create Course" });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Course Name"), "Physics");
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Course Code"), "PHYS 301");
    expect(submit).toBeEnabled();
  });

  test("trims values, submits the selected defaults, and closes on success", async () => {
    const onAddCourse = vi.fn().mockResolvedValue({ id: "course-1" });
    render(<AddCourseDialog onAddCourse={onAddCourse} isCreating={false} />);
    await openDialog();

    await userEvent.type(screen.getByLabelText("Course Name"), "  Physics  ");
    await userEvent.type(screen.getByLabelText("Course Code"), "  PHYS 301  ");
    await userEvent.type(
      screen.getByLabelText("Description (Optional)"),
      "  Mechanics  ",
    );
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "Green" }));
    await userEvent.click(screen.getByRole("button", { name: "Create Course" }));

    await waitFor(() =>
      expect(onAddCourse).toHaveBeenCalledWith({
        name: "Physics",
        code: "PHYS 301",
        description: "Mechanics",
        color: "bg-green-500",
      }),
    );
    expect(
      screen.queryByRole("heading", { name: "Add New Course" }),
    ).not.toBeInTheDocument();
  });

  test("keeps user input available when creation fails", async () => {
    const onAddCourse = vi.fn().mockRejectedValue(new Error("offline"));
    render(<AddCourseDialog onAddCourse={onAddCourse} isCreating={false} />);
    await openDialog();

    await userEvent.type(screen.getByLabelText("Course Name"), "Physics");
    await userEvent.type(screen.getByLabelText("Course Code"), "PHYS 301");
    await userEvent.click(screen.getByRole("button", { name: "Create Course" }));

    await waitFor(() => expect(onAddCourse).toHaveBeenCalledOnce());
    expect(screen.getByLabelText("Course Name")).toHaveValue("Physics");
    expect(screen.getByRole("heading", { name: "Add New Course" })).toBeVisible();
  });

  test("prevents duplicate submissions while a mutation is pending", async () => {
    render(<AddCourseDialog onAddCourse={vi.fn()} isCreating />);
    await openDialog();
    await userEvent.type(screen.getByLabelText("Course Name"), "Physics");
    await userEvent.type(screen.getByLabelText("Course Code"), "PHYS 301");

    expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
  });
});
