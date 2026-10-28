import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { runtimeConfig } from "./config.mjs";

mkdirSync("/data", { recursive: true, mode: 0o700 });
let secrets;
try {
 secrets = JSON.parse(readFileSync("/data/secrets.json", "utf8"));
} catch (error) {
 if (error.code !== "ENOENT") throw error;
 secrets = { live: randomBytes(32).toString("hex"), signaling: randomBytes(32).toString("hex") };
 writeFileSync("/data/secrets.json", JSON.stringify(secrets) + "\n", { flag: "wx", mode: 0o600 });
}
const config = runtimeConfig(process.env, secrets);
writeFileSync("/data/livekit.yaml", JSON.stringify(config.livekit), { mode: 0o600 });
writeFileSync("/data/Caddyfile", config.caddy, { mode: 0o600 });
const children = [];
let stopping = false, exitCode = 0, timer;
function stop(code) {
 if (stopping) return;
 stopping = true; exitCode = code;
 for (const child of children) if (child.exitCode === null) child.kill("SIGTERM");
 timer = setTimeout(() => {
  for (const child of children) if (child.exitCode === null) child.kill("SIGKILL");
 }, 30_000);
 timer.unref();
}
function start(command, args, env = {}) {
 const child = spawn(command, args, { stdio: "inherit", env: { ...process.env, ...env } });
 children.push(child);
 child.on("error", (error) => { console.error("Component startup failed:", error.message); stop(1); });
 child.on("exit", (code) => {
  if (!stopping) stop(code || 1);
  if (children.every((p) => p.exitCode !== null || p.signalCode !== null)) {
   clearTimeout(timer); process.exit(exitCode);
  }
 });
}
process.once("SIGTERM", () => stop(0));
process.once("SIGINT", () => stop(0));
start("/usr/local/bin/livekit-server", ["--config", "/data/livekit.yaml"]);
start(process.execPath, ["/app/docker/www.mjs"], { ...config.apiEnv, PUBLIC_URL: config.origin });
start("/usr/bin/caddy", ["run", "--config", "/data/Caddyfile", "--adapter", "caddyfile"], { XDG_DATA_HOME: "/data/caddy", XDG_CONFIG_HOME: "/data/caddy-config" });
console.log(`sozvon starting at ${config.origin}; configuration and certificates persist in /data`);
