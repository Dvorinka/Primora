import { describe, expect, it } from "vitest";

import {
  dailySchedule,
  describeSchedule,
  everySchedule,
  hourlySchedule,
  readSchedule,
  scheduleError,
  weekdaySchedule,
  weeklySchedule,
} from "../schedule";

describe("schedule", () => {
  it("builds the same strings the scheduler accepts", () => {
    expect(everySchedule(15, "m")).toBe("@every 15m");
    expect(hourlySchedule(0)).toBe("@hourly");
    expect(hourlySchedule(15)).toBe("15 * * * *");
    expect(dailySchedule(3, 0)).toBe("0 3 * * *");
    expect(weekdaySchedule(9, 0)).toBe("0 9 * * 1-5");
    expect(weeklySchedule(1, 9, 30)).toBe("30 9 * * 1");
  });

  it("reads a known expression back into the picker", () => {
    expect(readSchedule("@every 15m")).toEqual({ mode: "interval", every: 15, unit: "m" });
    expect(readSchedule("*/15 * * * *")).toEqual({ mode: "interval", every: 15, unit: "m" });
    expect(readSchedule("@hourly")).toEqual({ mode: "hourly", minute: 0 });
    expect(readSchedule("0 3 * * *")).toEqual({ mode: "daily", hour: 3, minute: 0 });
    expect(readSchedule("0 9 * * 1-5")).toEqual({ mode: "weekdays", hour: 9, minute: 0 });
    expect(readSchedule("30 9 * * 1")).toEqual({ mode: "weekly", day: 1, hour: 9, minute: 30 });
    expect(readSchedule("0 0 1 * *").mode).toBe("custom");
  });

  it("describes the common cases and leaves the rest to the raw field", () => {
    expect(describeSchedule("0 3 * * *")).toBe("Every day at 03:00");
    expect(describeSchedule("@every 15m")).toBe("Every 15 minutes");
    expect(describeSchedule("@every 1h")).toBe("Every hour");
    expect(describeSchedule("0 9 * * 1")).toBe("Every Monday at 09:00");
    expect(describeSchedule("0 9 * * 1-5")).toBe("Weekdays at 09:00");
    expect(describeSchedule("@weekly")).toBe("Every Sunday at 00:00");
    expect(describeSchedule("nope")).toBe("");
    expect(scheduleError("nope")).toMatch(/invalid schedule/);
    expect(scheduleError("0 0 1 * *")).toBeUndefined();
    expect(scheduleError("@every 30s")).toBeUndefined();
    expect(scheduleError("")).toMatch(/required/);
  });
});
