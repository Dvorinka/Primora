import { describe, expect, it } from "vitest";

import { errorMessage } from "../api";

describe("errorMessage", () => {
  it("prefers the server's reason over the HTTP status text", () => {
    const apiError = {
      message: "Bad Request",
      body: { error: { message: "webhook url must be https (http allowed only for private/self-hosted targets)" } },
    };
    expect(errorMessage(apiError)).toBe(
      "webhook url must be https (http allowed only for private/self-hosted targets)",
    );
  });

  it("falls back to error.message when no body reason exists", () => {
    expect(errorMessage(new Error("network down"))).toBe("network down");
  });

  it("uses the fallback for non-error values", () => {
    expect(errorMessage(null, "Nope")).toBe("Nope");
    expect(errorMessage(undefined)).toBe("Request failed");
    expect(errorMessage("string failure")).toBe("Request failed");
  });

  it("ignores empty body and message strings", () => {
    expect(errorMessage({ message: "", body: { error: { message: "" } } }, "Empty")).toBe("Empty");
  });
});
