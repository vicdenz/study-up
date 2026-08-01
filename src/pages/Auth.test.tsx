// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import Auth from "./Auth";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  navigate: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
    },
  },
}));

vi.mock("@/lib/router", () => ({
  Link: ({ children, to, ...props }: React.PropsWithChildren<{ to: string }>) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => mocks.navigate,
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

const fillCredentials = async (
  email = "  Student@Example.COM ",
  password = "safe-password",
) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  return user;
};

describe("Auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    mocks.signUp.mockResolvedValue({ error: null });
  });

  test("redirects an existing session away from the authentication page", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });

    render(<Auth />);

    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith("/dashboard"),
    );
  });

  test("normalizes the email and navigates after a successful sign-in", async () => {
    render(<Auth />);
    const user = await fillCredentials();

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() =>
      expect(mocks.signInWithPassword).toHaveBeenCalledWith({
        email: "student@example.com",
        password: "safe-password",
      }),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Successfully logged in!");
    expect(mocks.navigate).toHaveBeenCalledWith("/dashboard");
  });

  test("does not navigate when Supabase rejects credentials", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    render(<Auth />);
    const user = await fillCredentials("student@example.com");

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Invalid email or password. Please check your credentials.",
      ),
    );
    expect(mocks.navigate).not.toHaveBeenCalledWith("/dashboard");
    expect(screen.getByRole("button", { name: "Sign In" })).toBeEnabled();
  });

  test("sends profile metadata and a safe redirect during sign-up", async () => {
    render(<Auth />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.type(screen.getByLabelText("First Name"), "Reya");
    await user.type(screen.getByLabelText("Last Name"), "Saluja");
    await user.type(screen.getByLabelText("Email"), "Owner@Example.com");
    await user.type(screen.getByLabelText("Password"), "safe-password");

    await user.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() =>
      expect(mocks.signUp).toHaveBeenCalledWith({
        email: "owner@example.com",
        password: "safe-password",
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: "Reya",
            last_name: "Saluja",
          },
        },
      }),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Account created successfully! Please check your email to confirm your account.",
    );
    expect(
      screen.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
  });

  test("recovers the form after an unexpected authentication failure", async () => {
    mocks.signInWithPassword.mockRejectedValue(new Error("network down"));
    render(<Auth />);
    const user = await fillCredentials("student@example.com");

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "An unexpected error occurred. Please try again.",
      ),
    );
    expect(screen.getByRole("button", { name: "Sign In" })).toBeEnabled();
  });
});
