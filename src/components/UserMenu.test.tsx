// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import UserMenu from "./UserMenu";

const { error, navigate, signOut, success } = vi.hoisted(() => ({
  error: vi.fn(),
  navigate: vi.fn(),
  signOut: vi.fn(),
  success: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { error, success } }));
vi.mock("@/lib/router", () => ({ useNavigate: () => navigate }));
vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    profile: { first_name: "Ada", last_name: "Lovelace", avatar_url: null },
    user: { email: "ada@example.com" },
  }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signOut } } }));

const openMenu = async () => {
  const user = userEvent.setup();
  render(<UserMenu />);
  await user.click(screen.getByRole("button", { name: "Open user menu" }));
  return user;
};

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signOut.mockResolvedValue({ error: null });
  });

  test("shows exactly the profile and logout actions", async () => {
    const user = userEvent.setup();
    render(<UserMenu />);
    const trigger = screen.getByRole("button", { name: "Open user menu" });
    expect(trigger).toHaveClass("h-11", "w-11");
    await user.click(trigger);
    expect(screen.getByText("AL")).toHaveClass("text-base");
    expect(screen.getAllByRole("menuitem")).toHaveLength(2);
    expect(screen.getByRole("menuitem", { name: "Profile & settings" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Log out" })).toBeVisible();
    expect(screen.queryByRole("menuitem", { name: "View home" })).not.toBeInTheDocument();
  });

  test("opens profile and settings", async () => {
    const user = await openMenu();
    await user.click(screen.getByRole("menuitem", { name: "Profile & settings" }));
    expect(navigate).toHaveBeenCalledWith("/settings");
  });

  test("signs out before navigating to auth", async () => {
    const user = await openMenu();
    await user.click(screen.getByRole("menuitem", { name: "Log out" }));
    expect(signOut).toHaveBeenCalledOnce();
    expect(success).toHaveBeenCalledWith("Successfully logged out");
    expect(navigate).toHaveBeenCalledWith("/auth");
  });

  test("reports a sign-out failure without navigating", async () => {
    signOut.mockResolvedValue({ error: { message: "Session expired" } });
    const user = await openMenu();
    await user.click(screen.getByRole("menuitem", { name: "Log out" }));
    expect(error).toHaveBeenCalledWith("Session expired");
    expect(navigate).not.toHaveBeenCalled();
  });
});
