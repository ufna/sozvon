import assert from "node:assert/strict";
import test from "node:test";
import { runtimeConfig } from "./config.mjs";
const secrets = { live: "a".repeat(64), signaling: "b".repeat(64) };
test("localhost routes browser API and SFU through one origin", () => {
 const c = runtimeConfig({}, secrets);
 assert.equal(c.apiEnv.LIVEKIT_URL, "ws://localhost:8080/livekit");
 assert.equal(c.livekit.rtc.node_ip, "127.0.0.1");
 assert.equal(c.livekit.rtc.use_external_ip, false);
 assert.ok(c.caddy.includes("handle_path /api/*"));
});
test("public HTTPS and explicit media IP are independent of image build", () => {
 const c = runtimeConfig({ PUBLIC_URL: "https://calls.example.com", PUBLIC_IP: "203.0.113.10" }, secrets);
 assert.equal(c.apiEnv.LIVEKIT_URL, "wss://calls.example.com/livekit");
 assert.equal(c.apiEnv.ALLOWED_ORIGINS, "https://calls.example.com");
 assert.equal(c.livekit.rtc.node_ip, "203.0.113.10");
 assert.ok(c.caddy.includes("calls.example.com {"));
});
test("invalid origins, credentials and conflicting ports fail closed", () => {
 for (const url of ["http://calls.example.com", "https://user:pass@example.com", "https://example.com/path", "https://example.com/?token=x", "https://example.com:9999"]) assert.throws(() => runtimeConfig({ PUBLIC_URL: url }, secrets));
 assert.throws(() => runtimeConfig({ RTC_TCP_PORT: "8080" }, secrets));
 assert.throws(() => runtimeConfig({ PUBLIC_IP: "not-an-ip" }, secrets));
 assert.throws(() => runtimeConfig({}, { ...secrets, signaling: secrets.live }));
});
