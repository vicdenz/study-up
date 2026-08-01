// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import UserMenu from "./UserMenu";

const { info, navigate, signOut, success } = vi.hoisted(() => ({
  info: vi.fn(),
  navigate: vi.fn(),
  signOut: vi.fn(),
  success: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info, success },
}));
vi.mock("@/lib/router", () => ({ useNavigate: () => navigate }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signOut } },
}));

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signOut.mockResolvedValue({ error: null });
  });

  test.each([
    ["Profile", "Profile management is coming soon"],
    ["Settings", "Settings are coming soon"],
  ])("gives explicit feedback for the unavailable %s screen", async (item, message) => {
    const user = userEvent.setup();
    render(<UserMenu />);

    await user.click(screen.getByRole("button", { name: "Open user menu" }));
    await user.click(screen.getByRole("menuitem", { name: item }));

    expect(info).toHaveBeenCalledWith(message);
    expect(navigate).not.toHaveBeenCalled();
  });

  test("signs out before navigating away", async () => {
    const user = userEvent.setup();
    render(<UserMenu />);

    await user.click(screen.getByRole("button", { name: "Open user menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Log out" }));

    expect(signOut).toHaveBeenCalledOnce();
    expect(success).toHaveBeenCalledWith("Successfully logged out");
    expect(navigate).toHaveBeenCalledWith("/auth");
  });
});
