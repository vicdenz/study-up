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

  test("shows the signed-in identity", async () => {
    await openMenu();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  test.each([
    ["Profile & settings", "/settings"],
    ["View home", "/"],
  ])("navigates from %s", async (item, path) => {
    const user = await openMenu();
    await user.click(screen.getByRole("menuitem", { name: item }));
    expect(navigate).toHaveBeenCalledWith(path);
  });

  test("signs out before navigating away", async () => {
    const user = await openMenu();
    await user.click(screen.getByRole("menuitem", { name: "Log out" }));
    expect(signOut).toHaveBeenCalledOnce();
    expect(success).toHaveBeenCalledWith("Successfully logged out");
    expect(navigate).toHaveBeenCalledWith("/auth");
  });

  test("keeps the user in place and explains a sign-out failure", async () => {
    signOut.mockResolvedValue({ error: { message: "Session expired" } });
    const user = await openMenu();
    await user.click(screen.getByRole("menuitem", { name: "Log out" }));
    expect(error).toHaveBeenCalledWith("Session expired");
    expect(navigate).not.toHaveBeenCalled();
  });
});
