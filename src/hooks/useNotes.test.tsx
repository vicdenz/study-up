// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useNotes } from "./useNotes";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  order: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    functions: { invoke: vi.fn() },
    from: mocks.from,
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

const note = {
  id: "note-1",
  user_id: "user-1",
  course_id: null,
  title: "Optional summary",
  content: "A note remains valid before an AI summary exists.",
  tags: ["regression"],
  created_at: "2026-07-30T10:00:00.000Z",
  updated_at: "2026-07-30T10:00:00.000Z",
};

describe("useNotes summary loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.order.mockResolvedValue({ data: [note], error: null });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.from.mockImplementation((table: string) => {
      if (table === "notes") {
        return {
          select: vi.fn(() => ({ order: mocks.order })),
        };
      }

      if (table === "note_summaries") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: mocks.maybeSingle })),
          })),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
  });

  test("treats a missing AI summary as an expected optional relation", async () => {
    const { result } = renderHook(() => useNotes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.notes).toEqual([{ ...note, summary: undefined }]);
    expect(mocks.maybeSingle).toHaveBeenCalledOnce();
  });

  test("attaches an existing AI summary to its note", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { summary: "A concise saved summary." },
      error: null,
    });
    const { result } = renderHook(() => useNotes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.notes).toHaveLength(1));

    expect(result.current.notes[0].summary).toBe("A concise saved summary.");
  });

  test("surfaces failures from the primary notes query", async () => {
    const queryError = new Error("notes unavailable");
    mocks.order.mockResolvedValue({ data: null, error: queryError });
    const { result } = renderHook(() => useNotes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.error).toBe(queryError));

    expect(result.current.notes).toEqual([]);
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });
});
