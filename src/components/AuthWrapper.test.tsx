// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import AuthWrapper from "./AuthWrapper";

const mocks = vi.hoisted(() => ({
  clear: vi.fn(),
  getSession: vi.fn(),
  navigate: vi.fn(),
  pathname: "/",
  unsubscribe: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ clear: mocks.clear }) }));
vi.mock("@/lib/router", () => ({
  useLocation: () => ({ pathname: mocks.pathname }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: {
    getSession: mocks.getSession,
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: mocks.unsubscribe } } })),
  } },
}));

describe("AuthWrapper routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = "/";
    mocks.getSession.mockResolvedValue({ data: { session: null } });
  });

  test("keeps the public landing page available when signed out", async () => {
    render(<AuthWrapper><p>Public home</p></AuthWrapper>);
    expect(await screen.findByText("Public home")).toBeVisible();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  test("keeps the landing page available when signed in", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
    render(<AuthWrapper><p>Signed-in home</p></AuthWrapper>);
    expect(await screen.findByText("Signed-in home")).toBeVisible();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  test("protects private routes from signed-out visitors", async () => {
    mocks.pathname = "/dashboard";
    render(<AuthWrapper><p>Private dashboard</p></AuthWrapper>);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/auth", { replace: true }));
    expect(screen.queryByText("Private dashboard")).not.toBeInTheDocument();
  });

  test("redirects signed-in visitors away from authentication", async () => {
    mocks.pathname = "/auth";
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
    render(<AuthWrapper><p>Authentication</p></AuthWrapper>);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/dashboard", { replace: true }));
    expect(screen.queryByText("Authentication")).not.toBeInTheDocument();
  });
});
