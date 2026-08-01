// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import LandingPage from "./LandingPage";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  profile: { first_name: "Ada" } as { first_name?: string } | null,
  user: null as { id: string } | null,
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/hooks/useProfile", () => ({ useProfile: () => ({ profile: mocks.profile }) }));
vi.mock("@/components/UserMenu", () => ({ default: () => <button>User menu</button> }));
vi.mock("@/lib/router", () => ({
  Link: ({ children, to, ...props }: React.PropsWithChildren<{ to: string }>) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => mocks.navigate,
}));

describe("LandingPage authentication states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = null;
    mocks.profile = { first_name: "Ada" };
  });

  test("offers authentication actions to signed-out visitors", async () => {
    const user = userEvent.setup();
    render(<LandingPage />);
    expect(screen.getByRole("button", { name: "Log in" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Start studying for free" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/auth");
  });

  test("shows identity and workspace actions to signed-in visitors", async () => {
    mocks.user = { id: "user-1" };
    const user = userEvent.setup();
    render(<LandingPage />);
    expect(screen.getByText("Welcome back, Ada")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Log in" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open your dashboard" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/dashboard");
  });
});
