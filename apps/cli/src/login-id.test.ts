import assert from "node:assert/strict";
import test from "node:test";

import { APP_RE } from "./login-id.ts";

test("app id is a stable name, not a url or a port", () => {
  for (const app of ["primora", "MyApp", "stripe.dashboard", "a", "a".repeat(64)]) {
    assert.equal(APP_RE.test(app), true, app);
  }
  for (const app of ["", "http://localhost:3000", "localhost:3000", "has space", "-x", "a".repeat(65)]) {
    assert.equal(APP_RE.test(app), false, app);
  }
});
