// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import ProfileSettings from "./ProfileSettings";

const { errorToast, profile, successToast, updateProfile, updateUser, user } = vi.hoisted(() => ({
  errorToast: vi.fn(),
  profile: { first_name: "Ada", last_name: "Lovelace", email: "ada@example.com" },
  successToast: vi.fn(),
  updateProfile: vi.fn(),
  updateUser: vi.fn(),
  user: { email: "ada@example.com" },
}));

vi.mock("@/components/Navigation", () => ({ default: () => <nav>Navigation</nav> }));
vi.mock("@/components/UserMenu", () => ({ default: () => <button>User menu</button> }));
vi.mock("sonner", () => ({ toast: { error: errorToast, success: successToast } }));
vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    profile,
    user,
    isLoading: false,
    isUpdating: false,
    updateProfile,
  }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { updateUser } } }));

describe("ProfileSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateProfile.mockResolvedValue({});
    updateUser.mockResolvedValue({ error: null });
  });

  test("loads and saves the combined profile fields", async () => {
    const user = userEvent.setup();
    render(<ProfileSettings />);
    const firstName = screen.getByLabelText("First name");
    expect(firstName).toHaveValue("Ada");
    expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
    await user.clear(firstName);
    await user.type(firstName, "Grace");
    await user.click(screen.getByRole("button", { name: "Save profile" }));
    expect(updateProfile).toHaveBeenCalledWith({ first_name: "Grace", last_name: "Lovelace" });
    expect(successToast).toHaveBeenCalledWith("Profile updated");
  });

  test("rejects mismatched passwords without calling Supabase", async () => {
    const user = userEvent.setup();
    render(<ProfileSettings />);
    await user.type(screen.getByLabelText("New password"), "correct-horse");
    await user.type(screen.getByLabelText("Confirm new password"), "different-pass");
    await user.click(screen.getByRole("button", { name: "Update password" }));
    expect(errorToast).toHaveBeenCalledWith("Passwords do not match");
    expect(updateUser).not.toHaveBeenCalled();
  });

  test("updates a valid password and clears both fields", async () => {
    const user = userEvent.setup();
    render(<ProfileSettings />);
    const password = screen.getByLabelText("New password");
    const confirmation = screen.getByLabelText("Confirm new password");
    await user.type(password, "correct-horse");
    await user.type(confirmation, "correct-horse");
    await user.click(screen.getByRole("button", { name: "Update password" }));
    expect(updateUser).toHaveBeenCalledWith({ password: "correct-horse" });
    expect(successToast).toHaveBeenCalledWith("Password updated");
    expect(password).toHaveValue("");
    expect(confirmation).toHaveValue("");
  });

  test("keeps the password available when Supabase rejects the update", async () => {
    updateUser.mockResolvedValue({ error: { message: "Recent sign-in required" } });
    const user = userEvent.setup();
    render(<ProfileSettings />);
    const password = screen.getByLabelText("New password");
    await user.type(password, "correct-horse");
    await user.type(screen.getByLabelText("Confirm new password"), "correct-horse");
    await user.click(screen.getByRole("button", { name: "Update password" }));
    expect(errorToast).toHaveBeenCalledWith("Recent sign-in required");
    expect(password).toHaveValue("correct-horse");
  });
});
