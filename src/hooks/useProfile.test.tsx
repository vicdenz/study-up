// @vitest-environment jsdom

import { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AuthContext } from "./useAuth";
import { useProfile } from "./useProfile";

const mocks = vi.hoisted(() => {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.single = vi.fn();
  return { builder, from: vi.fn(() => builder) };
});

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));

const user = { id: "user-1", email: "ada@example.com" } as never;
const createWrapper = (authenticated = true) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ user: authenticated ? user : null, loading: false }}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );
};

describe("useProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.builder.select.mockImplementation(() => mocks.builder);
    mocks.builder.update.mockImplementation(() => mocks.builder);
    mocks.builder.eq.mockImplementation(() => mocks.builder);
  });

  test("does not query profile data without an authenticated user", () => {
    const { result } = renderHook(() => useProfile(), { wrapper: createWrapper(false) });
    expect(result.current.profile).toBeUndefined();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  test("loads and updates the authenticated profile cache", async () => {
    const initialProfile = { first_name: "Ada", last_name: "Lovelace", email: "ada@example.com", avatar_url: null };
    const updatedProfile = { ...initialProfile, first_name: "Grace" };
    mocks.builder.single.mockResolvedValueOnce({ data: initialProfile, error: null }).mockResolvedValueOnce({ data: updatedProfile, error: null });

    const { result } = renderHook(() => useProfile(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.profile).toEqual(initialProfile));

    await act(async () => {
      await result.current.updateProfile({ first_name: "Grace", last_name: "Lovelace" });
    });

    expect(mocks.builder.update).toHaveBeenCalledWith(expect.objectContaining({ first_name: "Grace", last_name: "Lovelace" }));
    expect(mocks.builder.eq).toHaveBeenLastCalledWith("id", "user-1");
    await waitFor(() => expect(result.current.profile).toEqual(updatedProfile));
  });
});
