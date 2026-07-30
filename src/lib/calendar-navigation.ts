export type CalendarArrowKey =
  | "ArrowUp"
  | "ArrowDown"
  | "ArrowLeft"
  | "ArrowRight";

export interface CalendarCell {
  day: number;
  hour: number;
}

export const nextCalendarCell = (
  current: CalendarCell,
  key: CalendarArrowKey,
): CalendarCell => {
  switch (key) {
    case "ArrowUp":
      return { day: current.day, hour: Math.max(0, current.hour - 1) };
    case "ArrowDown":
      return { day: current.day, hour: Math.min(23, current.hour + 1) };
    case "ArrowLeft":
      return { day: Math.max(0, current.day - 1), hour: current.hour };
    case "ArrowRight":
      return { day: Math.min(6, current.day + 1), hour: current.hour };
  }
};

export const isCalendarArrowKey = (key: string): key is CalendarArrowKey =>
  ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key);
