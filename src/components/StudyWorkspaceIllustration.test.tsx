// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import StudyWorkspaceIllustration from "./StudyWorkspaceIllustration";

describe("StudyWorkspaceIllustration", () => {
  test("describes the complete visual with one accessible image label", () => {
    render(<StudyWorkspaceIllustration />);

    expect(
      screen.getByRole("img", {
        name: "Books and course notes coming together inside a StudyUp learning workspace",
      }),
    ).toBeVisible();
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  test("keeps detailed peripheral material out of the accessibility tree", () => {
    render(<StudyWorkspaceIllustration />);

    for (const label of ["Lecture notes", "Assignments", "Study library"]) {
      expect(screen.getByText(label).closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });
});
