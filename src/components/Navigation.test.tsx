// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import Navigation from "./Navigation";

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), pathname: "/courses" }));

vi.mock("@/hooks/useProfile", () => ({ useProfile: () => ({ profile: { first_name: "Ada" } }) }));
vi.mock("@/lib/router", () => ({
  Link: ({ children, to, ...props }: React.PropsWithChildren<{ to: string }>) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ pathname: mocks.pathname }),
  useNavigate: () => mocks.navigate,
}));

describe("Navigation", () => {
  beforeEach(() => vi.clearAllMocks());

  test("exposes a branded home link and distinct workspace destinations", () => {
    render(<Navigation />);
    expect(screen.getAllByRole("link", { name: "StudyUp home" })[0]).toHaveAttribute("href", "/");
    expect(screen.getByText("Ada's library")).toBeVisible();
    for (const label of ["Dashboard", "Courses", "Planner", "Notebook", "Upload", "AI Tutor"]) {
      expect(screen.getByRole("button", { name: label })).toBeVisible();
    }
    expect(screen.getByRole("button", { name: "Courses" })).toHaveAttribute("aria-current", "page");
  });

  test.each([
    ["AI Tutor", "/ai-tutor"],
    ["Profile & settings", "/settings"],
    ["View home", "/"],
  ])("navigates from %s", async (label, destination) => {
    const user = userEvent.setup();
    render(<Navigation />);
    await user.click(screen.getByRole("button", { name: label }));
    expect(mocks.navigate).toHaveBeenCalledWith(destination);
  });
});
