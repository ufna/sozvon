import assert from "node:assert/strict";
import test from "node:test";
import { getLocale, locales } from "../src/i18n.js";
test("all Telegram locales use the single sozvon site", () => {
 assert.equal(getLocale("ru").siteUrl, "https://sozvon.now");
 assert.equal(getLocale("en").siteUrl, "https://sozvon.now");
 assert.equal(getLocale(undefined).siteUrl, "https://sozvon.now");
 for (const locale of Object.values(locales)) {
  assert.ok(locale.messageBody("https://example.test/room").includes("https://example.test/room"));
 }
});

test("a self-hosted bot uses its configured site in every locale and invitation", async () => {
 const { execFileSync } = await import("node:child_process");
 const script = `
  import assert from 'node:assert/strict';
  import { locales } from './src/i18n.js';
  for (const locale of Object.values(locales)) {
   assert.equal(locale.siteUrl, 'http://localhost:4000');
   assert.ok(locale.startText('test_bot').includes('http://localhost:4000'));
   assert.ok(locale.aboutText('test_bot').includes('http://localhost:4000'));
   assert.ok(!locale.helpText('test_bot').includes('sozvon.now'));
  }
 `;
 execFileSync(process.execPath, ["--input-type=module", "-e", script], {
  cwd: new URL("../", import.meta.url),
  env: { ...process.env, SITE_URL: "http://localhost:4000/" },
 });
});
