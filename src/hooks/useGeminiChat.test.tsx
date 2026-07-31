// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useGeminiChat, type AiChat } from "./useGeminiChat";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  getSession: vi.fn(),
  insert: vi.fn(),
  from: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: mocks.invoke },
    auth: { getSession: mocks.getSession },
    from: mocks.from,
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    info: mocks.toastInfo,
    success: mocks.toastSuccess,
    warning: mocks.toastWarning,
  },
}));

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

const savedChat = (messages: unknown): AiChat =>
  ({
    id: "chat-1",
    title: "Saved calculus session",
    messages,
  }) as AiChat;

describe("useGeminiChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invoke.mockResolvedValue({
      data: { response: "A verified answer" },
      error: null,
    });
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });
    mocks.insert.mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ insert: mocks.insert });
  });

  test("ignores blank messages without invoking the provider", async () => {
    const { result } = renderHook(() => useGeminiChat(), {
      wrapper: createWrapper(),
    });

    await act(() => result.current.sendMessage("   "));

    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(result.current.messages).toEqual([]);
  });

  test("preserves the user message and appends a valid provider response", async () => {
    const { result } = renderHook(() => useGeminiChat(), {
      wrapper: createWrapper(),
    });

    await act(() =>
      result.current.sendMessage("Explain derivatives", "Calculus", []),
    );

    expect(mocks.invoke).toHaveBeenCalledWith("chat-with-gemini", {
      body: {
        message: "Explain derivatives",
        context: "Calculus",
        imageUrls: [],
      },
    });
    expect(result.current.messages.map(({ role, content }) => ({ role, content })))
      .toEqual([
        { role: "user", content: "Explain derivatives" },
        { role: "assistant", content: "A verified answer" },
      ]);
    expect(result.current.isLoading).toBe(false);
  });

  test("reports transport errors without fabricating an assistant message", async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: new Error("function unavailable"),
    });
    const { result } = renderHook(() => useGeminiChat(), {
      wrapper: createWrapper(),
    });

    await act(() => result.current.sendMessage("Help"));

    expect(mocks.toastError).toHaveBeenCalledWith(
      "Failed to get AI response",
    );
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe("user");
  });

  test("rejects malformed provider responses", async () => {
    mocks.invoke.mockResolvedValue({ data: { response: null }, error: null });
    const { result } = renderHook(() => useGeminiChat(), {
      wrapper: createWrapper(),
    });

    await act(() => result.current.sendMessage("Help"));

    expect(mocks.toastError).toHaveBeenCalledWith(
      "The AI provider returned an invalid response",
    );
    expect(result.current.messages).toHaveLength(1);
  });

  test("loads only structurally valid saved conversations", () => {
    const { result } = renderHook(() => useGeminiChat(), {
      wrapper: createWrapper(),
    });
    const validMessages = [
      {
        id: "message-1",
        role: "assistant",
        content: "Stored answer",
        timestamp: "2026-07-30T10:00:00.000Z",
      },
    ];

    act(() => result.current.loadChat(savedChat(validMessages)));
    expect(result.current.messages[0]).toMatchObject({
      id: "message-1",
      role: "assistant",
      content: "Stored answer",
    });
    expect(result.current.messages[0].timestamp).toBeInstanceOf(Date);
    expect(mocks.toastInfo).toHaveBeenCalled();

    act(() =>
      result.current.loadChat(
        savedChat([{ ...validMessages[0], role: "system" }]),
      ),
    );
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Could not load chat. Invalid format.",
    );
  });

  test("refuses to save an empty conversation", () => {
    const { result } = renderHook(() => useGeminiChat(), {
      wrapper: createWrapper(),
    });

    act(() => result.current.saveChat({ title: "Empty" }));

    expect(mocks.toastWarning).toHaveBeenCalledWith(
      "Cannot save an empty chat.",
    );
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  test("serializes timestamps when saving an authenticated conversation", async () => {
    const { result } = renderHook(() => useGeminiChat(), {
      wrapper: createWrapper(),
    });
    await act(() => result.current.sendMessage("Help"));

    act(() => result.current.saveChat({ title: "Calculus", assignment_id: "a-1" }));

    await waitFor(() => expect(mocks.insert).toHaveBeenCalledOnce());
    const inserted = mocks.insert.mock.calls[0][0];
    expect(inserted).toMatchObject({
      user_id: "user-1",
      title: "Calculus",
      assignment_id: "a-1",
    });
    expect(inserted.messages).toHaveLength(2);
    expect(inserted.messages[0].timestamp).toEqual(expect.any(String));
    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "Chat saved successfully!",
      ),
    );
  });
});
