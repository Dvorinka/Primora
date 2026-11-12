import { Show, createMemo } from "solid-js";

import {
  SCHEDULE_DEFAULTS,
  dailySchedule,
  describeSchedule,
  everySchedule,
  hourlySchedule,
  readSchedule,
  weekdaySchedule,
  weeklySchedule,
  type ScheduleShape,
} from "../lib/schedule";

const MODES = [
  ["interval", "Every"],
  ["hourly", "Hourly"],
  ["daily", "Daily"],
  ["weekdays", "Weekdays"],
  ["weekly", "Weekly"],
] as const;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function timeValue(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function dayValue(picked: ScheduleShape): string {
  return picked.mode === "weekly" ? String(picked.day) : "1";
}

function parseTime(value: string): { hour: number; minute: number } | undefined {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return undefined;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

interface ScheduleFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function ScheduleField(props: ScheduleFieldProps) {
  const shape = createMemo(() => readSchedule(props.value));
  const summary = createMemo(() => describeSchedule(props.value));

  function selectMode(mode: Exclude<ScheduleShape["mode"], "custom">) {
    if (shape().mode === mode) return;
    props.onChange(SCHEDULE_DEFAULTS[mode]);
  }

  const interval = () => {
    const current = shape();
    return current.mode === "interval" ? current : undefined;
  };
  const hourly = () => {
    const current = shape();
    return current.mode === "hourly" ? current : undefined;
  };
  const atTime = () => {
    const current = shape();
    if (current.mode === "daily" || current.mode === "weekdays" || current.mode === "weekly") return current;
    return undefined;
  };

  function writeTime(value: string, picked: ScheduleShape) {
    const time = parseTime(value);
    if (!time) return;
    if (picked.mode === "daily") props.onChange(dailySchedule(time.hour, time.minute));
    else if (picked.mode === "weekdays") props.onChange(weekdaySchedule(time.hour, time.minute));
    else if (picked.mode === "weekly") props.onChange(weeklySchedule(picked.day, time.hour, time.minute));
  }

  return (
    <div class="space-y-2">
      <span class="label" id="schedule-how-often">How often</span>
      <div class="flex flex-wrap gap-2" role="group" aria-labelledby="schedule-how-often">
        {MODES.map(([mode, label]) => (
          <button
            type="button"
            class={`btn btn-sm ${shape().mode === mode ? "btn-primary" : "btn-secondary"}`}
            aria-pressed={shape().mode === mode}
            onClick={() => selectMode(mode)}
          >
            {label}
          </button>
        ))}
      </div>

      <Show when={interval()}>
        {(current) => (
          <div class="flex flex-wrap items-center gap-2">
            <label class="label" for="schedule-every" style="margin:0">Repeat every</label>
            <input
              id="schedule-every"
              class="input input-sm"
              type="number"
              min={1}
              style="width:5rem"
              value={current().every}
              onInput={(e) => {
                const every = Number(e.currentTarget.value);
                if (!Number.isInteger(every) || every < 1) return;
                props.onChange(everySchedule(every, current().unit));
              }}
            />
            <select
              class="input input-sm"
              aria-label="Interval unit"
              style="width:8rem"
              value={current().unit}
              onChange={(e) => {
                const unit = e.currentTarget.value === "h" ? "h" : "m";
                props.onChange(everySchedule(current().every, unit));
              }}
            >
              <option value="m">minutes</option>
              <option value="h">hours</option>
            </select>
          </div>
        )}
      </Show>

      <Show when={hourly()}>
        {(current) => (
          <div class="flex flex-wrap items-center gap-2">
            <label class="label" for="schedule-minute" style="margin:0">At minute</label>
            <input
              id="schedule-minute"
              class="input input-sm"
              type="number"
              min={0}
              max={59}
              style="width:5rem"
              value={current().minute}
              onInput={(e) => {
                const minute = Number(e.currentTarget.value);
                if (!Number.isInteger(minute) || minute < 0 || minute > 59) return;
                props.onChange(hourlySchedule(minute));
              }}
            />
          </div>
        )}
      </Show>

      <Show when={atTime()}>
        {(current) => (
          <div class="flex flex-wrap items-center gap-2">
            <Show when={current().mode === "weekly"}>
              <label class="label" for="schedule-day" style="margin:0">On</label>
              <select
                id="schedule-day"
                class="input input-sm"
                style="width:9rem"
                value={dayValue(current())}
                onChange={(e) => {
                  const picked = current();
                  if (picked.mode !== "weekly") return;
                  props.onChange(weeklySchedule(Number(e.currentTarget.value), picked.hour, picked.minute));
                }}
              >
                {DAYS.map((day, index) => (
                  <option value={index}>{day}</option>
                ))}
              </select>
            </Show>
            <label class="label" for="schedule-time" style="margin:0">At</label>
            <input
              id="schedule-time"
              class="input input-sm"
              type="time"
              value={timeValue(current().hour, current().minute)}
              onChange={(e) => writeTime(e.currentTarget.value, current())}
              onInput={(e) => writeTime(e.currentTarget.value, current())}
            />
          </div>
        )}
      </Show>

      <div>
        <label class="label" for="schedule-cron">Cron expression</label>
        <input
          id="schedule-cron"
          class="input font-mono"
          data-testid="schedule-cron"
          value={props.value}
          required
          spellcheck={false}
          placeholder="0 3 * * *  or  @every 15m"
          onInput={(e) => props.onChange(e.currentTarget.value)}
        />
        <p class="label-hint">
          {summary() || "Pick a repeat above, or type a 5-field cron or a descriptor such as @every 30m."}
        </p>
      </div>
    </div>
  );
}
