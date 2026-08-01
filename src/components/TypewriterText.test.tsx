// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import TypewriterText from "./TypewriterText";

const renderText = (text: string, animate = true) =>
  render(<TypewriterText text={text} animate={animate} intervalMs={10}>{(visible) => <span>{visible}</span>}</TypewriterText>);

describe("TypewriterText", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test("reveals new text progressively and completes", () => {
    renderText("Study smarter");
    expect(screen.queryByText("Study smarter")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(20));
    expect(document.body.textContent).toBe("St");

    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByText("Study smarter")).toBeInTheDocument();
  });

  test("shows the full text immediately when animation is disabled", () => {
    renderText("Complete answer", false);
    expect(screen.getByText("Complete answer")).toBeInTheDocument();
  });

  test("respects reduced-motion preferences", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    renderText("Accessible answer");
    expect(screen.getByText("Accessible answer")).toBeInTheDocument();
  });

  test("cancels the timer when unmounted", () => {
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const { unmount } = renderText("A longer response");
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
