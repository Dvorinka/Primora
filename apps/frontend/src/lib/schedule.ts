// Friendly layer over the scheduler's grammar: 5-field cron and
// robfig descriptors (@hourly, @every 30m). The stored value stays
// that string, so the API, CLI, and agents keep speaking cron.

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export type ScheduleShape =
  | { mode: "interval"; every: number; unit: "m" | "h" }
  | { mode: "hourly"; minute: number }
  | { mode: "daily"; hour: number; minute: number }
  | { mode: "weekdays"; hour: number; minute: number }
  | { mode: "weekly"; day: number; hour: number; minute: number }
  | { mode: "custom" };

export const SCHEDULE_DEFAULTS = {
  interval: "@every 15m",
  hourly: "@hourly",
  daily: "0 3 * * *",
  weekdays: "0 9 * * 1-5",
  weekly: "0 9 * * 1",
} as const;

function clock(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function inRange(value: number, max: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= max;
}

function everyLabel(every: number, unit: "m" | "h"): string {
  if (unit === "h") return every === 1 ? "Every hour" : `Every ${every} hours`;
  return every === 1 ? "Every minute" : `Every ${every} minutes`;
}

export function everySchedule(every: number, unit: "m" | "h"): string {
  return `@every ${every}${unit}`;
}

export function hourlySchedule(minute: number): string {
  return minute === 0 ? "@hourly" : `${minute} * * * *`;
}

export function dailySchedule(hour: number, minute: number): string {
  return `${minute} ${hour} * * *`;
}

export function weekdaySchedule(hour: number, minute: number): string {
  return `${minute} ${hour} * * 1-5`;
}

export function weeklySchedule(day: number, hour: number, minute: number): string {
  return `${minute} ${hour} * * ${day}`;
}

export function readSchedule(expr: string): ScheduleShape {
  const value = expr.trim();
  const every = /^@every\s+(\d+)(m|h)$/i.exec(value);
  if (every) {
    const n = Number(every[1]);
    if (n >= 1) return { mode: "interval", every: n, unit: every[2].toLowerCase() as "m" | "h" };
  }
  if (value.toLowerCase() === "@hourly") return { mode: "hourly", minute: 0 };
  if (value.toLowerCase() === "@daily" || value.toLowerCase() === "@midnight") {
    return { mode: "daily", hour: 0, minute: 0 };
  }
  if (value.toLowerCase() === "@weekly") return { mode: "weekly", day: 0, hour: 0, minute: 0 };

  const parts = value.split(/\s+/);
  if (parts.length !== 5) return { mode: "custom" };
  const [min, hour, dom, month, dow] = parts;
  if (dom !== "*" || month !== "*") return { mode: "custom" };

  const step = /^\*\/(\d+)$/.exec(min);
  if (step && hour === "*" && dow === "*") {
    const n = Number(step[1]);
    if (n >= 1) return { mode: "interval", every: n, unit: "m" };
  }

  if (!/^\d{1,2}$/.test(min)) return { mode: "custom" };
  const minute = Number(min);
  if (!inRange(minute, 59)) return { mode: "custom" };
  if (hour === "*" && dow === "*") return { mode: "hourly", minute };

  if (!/^\d{1,2}$/.test(hour)) return { mode: "custom" };
  const h = Number(hour);
  if (!inRange(h, 23)) return { mode: "custom" };
  if (dow === "*") return { mode: "daily", hour: h, minute };
  if (dow === "1-5") return { mode: "weekdays", hour: h, minute };
  if (/^[0-6]$/.test(dow)) return { mode: "weekly", day: Number(dow), hour: h, minute };
  return { mode: "custom" };
}

export function describeSchedule(expr: string): string {
  const shape = readSchedule(expr);
  switch (shape.mode) {
    case "interval":
      return everyLabel(shape.every, shape.unit);
    case "hourly":
      return shape.minute === 0 ? "Every hour" : `Every hour at minute ${shape.minute}`;
    case "daily":
      return `Every day at ${clock(shape.hour, shape.minute)}`;
    case "weekdays":
      return `Weekdays at ${clock(shape.hour, shape.minute)}`;
    case "weekly":
      return `Every ${DAYS[shape.day]} at ${clock(shape.hour, shape.minute)}`;
    default:
      return "";
  }
}

/** Loose gate for the manual field. The server still parses with robfig. */
export function scheduleError(expr: string): string | undefined {
  const value = expr.trim();
  if (!value) return "Schedule is required";
  if (readSchedule(value).mode !== "custom") return undefined;
  if (/^@(yearly|annually|monthly|weekly|daily|midnight|hourly)$/i.test(value)) return undefined;
  if (/^@every\s+\d+(s|m|h)$/i.test(value)) return undefined;
  const parts = value.split(/\s+/);
  if (parts.length === 5 && parts.every((part) => /^[\d*,\-/]+$/.test(part))) return undefined;
  return `invalid schedule "${value}". Pick a repeat above, or type a cron expression like "0 3 * * *"`;
}
