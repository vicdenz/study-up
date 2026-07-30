import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins conditional class names", () => {
    expect(cn("button", { hidden: false, active: true })).toBe(
      "button active",
    );
  });

  it("resolves conflicting Tailwind utilities using the last value", () => {
    expect(cn("px-2 text-sm", "px-4", ["text-lg"])).toBe("px-4 text-lg");
  });
});
