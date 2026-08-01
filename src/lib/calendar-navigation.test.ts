import { describe, expect, test } from "vitest";
import {
  isCalendarArrowKey,
  nextCalendarCell,
  type CalendarArrowKey,
} from "./calendar-navigation";

describe("calendar keyboard navigation", () => {
  test.each([
    ["ArrowUp", { day: 3, hour: 11 }, { day: 3, hour: 10 }],
    ["ArrowDown", { day: 3, hour: 11 }, { day: 3, hour: 12 }],
    ["ArrowLeft", { day: 3, hour: 11 }, { day: 2, hour: 11 }],
    ["ArrowRight", { day: 3, hour: 11 }, { day: 4, hour: 11 }],
  ] as const)("moves %s to the adjacent cell", (key, start, expected) => {
    expect(nextCalendarCell(start, key)).toEqual(expected);
  });

  test.each([
    ["ArrowUp", { day: 2, hour: 0 }, { day: 2, hour: 0 }],
    ["ArrowDown", { day: 2, hour: 23 }, { day: 2, hour: 23 }],
    ["ArrowLeft", { day: 0, hour: 8 }, { day: 0, hour: 8 }],
    ["ArrowRight", { day: 6, hour: 8 }, { day: 6, hour: 8 }],
  ] as const)("keeps %s within the weekly grid", (key, start, expected) => {
    expect(nextCalendarCell(start, key)).toEqual(expected);
  });

  test.each([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
  ] satisfies CalendarArrowKey[])("recognizes %s as navigation", (key) => {
    expect(isCalendarArrowKey(key)).toBe(true);
  });

  test.each(["Enter", " ", "Escape", "Tab", "Home"])(
    "does not treat %s as an arrow key",
    (key) => {
      expect(isCalendarArrowKey(key)).toBe(false);
    },
  );

  test("does not mutate the source cell", () => {
    const source = { day: 2, hour: 9 };

    nextCalendarCell(source, "ArrowRight");

    expect(source).toEqual({ day: 2, hour: 9 });
  });
});
