import assert from "node:assert/strict";
import test from "node:test";
import { updateProfileField } from "../src/profile.js";

test("rate-limited profile updates retry without blocking bot startup", async () => {
 let calls = 0, retry, delay, unref = false;
 await updateProfileField(async () => {
  if (++calls === 1) throw { error_code: 429, parameters: { retry_after: 64730 } };
 }, {
  schedule: (fn, ms) => { retry = fn; delay = ms; return { unref() { unref = true; } }; },
  warn: () => {},
 });
 assert.equal(calls, 1);
 assert.equal(delay, 64731000);
 assert.equal(unref, true);
 await retry();
 assert.equal(calls, 2);
});
