// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import LandingPage from "./LandingPage";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  user: null as { id: string } | null,
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/components/UserMenu", () => ({ default: () => <button>User menu</button> }));
vi.mock("@/lib/router", () => ({
  Link: ({ children, to, ...props }: React.PropsWithChildren<{ to: string }>) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => mocks.navigate,
}));

describe("LandingPage authentication states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = null;
  });

  test("offers authentication actions to signed-out visitors", async () => {
    const user = userEvent.setup();
    const { container } = render(<LandingPage />);
    expect(container.querySelector("header")).toHaveClass(
      "app-page-header",
      "app-page-header--transparent",
    );
    expect(container.querySelector("header > div")).toHaveClass("app-page-header-content");
    expect(screen.getByRole("button", { name: "Log in" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Start studying for free" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/auth?mode=signup");
  });

  test("shows compact workspace actions without a welcome message", async () => {
    mocks.user = { id: "user-1" };
    const user = userEvent.setup();
    render(<LandingPage />);
    expect(screen.queryByText(/Welcome back/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Log in" })).not.toBeInTheDocument();
    const dashboardButton = screen.getByRole("button", { name: "Dashboard" });
    expect(dashboardButton.parentElement).toHaveClass("app-page-header-actions");
    expect(dashboardButton).toHaveClass("h-11", "px-4", "bg-violet-600");
    expect(dashboardButton.querySelector("svg")).toHaveClass("size-4");
    await user.click(dashboardButton);
    expect(mocks.navigate).toHaveBeenCalledWith("/dashboard");
    mocks.navigate.mockClear();
    await user.click(screen.getByRole("button", { name: "Open your dashboard" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/dashboard");
  });
});
