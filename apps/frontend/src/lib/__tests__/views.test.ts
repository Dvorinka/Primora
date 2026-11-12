import { describe, expect, it } from "vitest";

import { shellNav } from "../../components/AppShell";
import { parseView, VIEWS, viewHash } from "../views";

describe("parseView", () => {
  it("reads a hash, with or without a slash", () => {
    expect(parseView("#telemetry")).toBe("telemetry");
    expect(parseView("#/storage")).toBe("storage");
    expect(parseView("#functions?tab=runs")).toBe("functions");
  });

  it("falls back to overview for an empty or unknown hash", () => {
    expect(parseView("")).toBe("dashboard");
    expect(parseView("#")).toBe("dashboard");
    expect(parseView("#nope")).toBe("dashboard");
  });
});

describe("viewHash", () => {
  it("omits the hash for overview and names every other view", () => {
    expect(viewHash("dashboard")).toBe("");
    expect(viewHash("audit")).toBe("#audit");
  });
});

describe("shellNav", () => {
  it("includes every view exactly once", () => {
    const ids = shellNav.map((entry) => entry.id);
    expect([...ids].sort()).toEqual([...VIEWS].sort());
    expect(new Set(ids).size).toBe(ids.length);
  });
});
