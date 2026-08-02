// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import PageHeader from "./PageHeader";

describe("PageHeader", () => {
  test("provides the shared page-header structure", () => {
    const { container } = render(<PageHeader>Dashboard</PageHeader>);
    expect(container.querySelector("header")).toHaveClass("app-page-header");
    expect(container.querySelector("header > div")).toHaveClass("app-page-header-content");
    expect(screen.getByText("Dashboard")).toBeVisible();
  });

  test("renders actions in the standardized action group", () => {
    render(<PageHeader actions={<button>Save</button>}>AI Tutor</PageHeader>);
    expect(screen.getByRole("button", { name: "Save" }).parentElement).toHaveClass(
      "app-page-header-actions",
    );
  });

  test("supports the transparent landing treatment without changing its structure", () => {
    const { container } = render(<PageHeader transparent>StudyUp</PageHeader>);
    expect(container.querySelector("header")).toHaveClass(
      "app-page-header",
      "app-page-header--transparent",
    );
    expect(container.querySelector("header > div")).toHaveClass("app-page-header-content");
  });
});
