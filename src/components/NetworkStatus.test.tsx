// @vitest-environment jsdom

import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import NetworkStatus from "./NetworkStatus";

const setOnline = (online: boolean) => {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: online,
  });
  act(() => {
    window.dispatchEvent(new Event(online ? "online" : "offline"));
  });
};

describe("NetworkStatus", () => {
  beforeEach(() => setOnline(true));

  test("does not obscure the application while online", () => {
    render(<NetworkStatus />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("announces loss of connectivity", async () => {
    render(<NetworkStatus />);

    setOnline(false);

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "You are offline. Unsaved changes may not be available until you reconnect.",
      ),
    );
  });

  test("removes the warning after connectivity returns", async () => {
    setOnline(false);
    render(<NetworkStatus />);
    expect(screen.getByRole("status")).toBeInTheDocument();

    setOnline(true);

    await waitFor(() =>
      expect(screen.queryByRole("status")).not.toBeInTheDocument(),
    );
  });

  test("unsubscribes safely when removed", () => {
    const view = render(<NetworkStatus />);
    view.unmount();

    expect(() => setOnline(false)).not.toThrow();
  });
});
