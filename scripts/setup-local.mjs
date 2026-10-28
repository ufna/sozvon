import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const paths = ["apps/server/.env", ".local/livekit.yaml"];
if (paths.some((p) => existsSync(root + p))) throw new Error("Local configuration already exists; keep both files and edit them together.");
mkdirSync(root + ".local", { recursive: true, mode: 0o700 });
const liveSecret = randomBytes(32).toString("hex");
const signalingSecret = randomBytes(32).toString("hex");
writeFileSync(root + paths[0], `DEV_MODE=true
LIVE_KEY=localkey
LIVE_SECRET=${liveSecret}
SIGNALING_SECRET=${signalingSecret}
LIVEKIT_SERVER_URL=http://127.0.0.1:7880
LIVEKIT_URL=ws://localhost:7880
ALLOWED_ORIGINS=http://localhost:4000,http://127.0.0.1:4000
`, { mode: 0o600 });
writeFileSync(root + paths[1], `port: 7880
bind_addresses: [127.0.0.1]
rtc:
  node_ip: 127.0.0.1
  tcp_port: 7881
  udp_port: 7882
  use_external_ip: false
keys:
  localkey: ${liveSecret}
`, { mode: 0o644 });
console.log("Local configuration generated. Start the SFU, API and client as described in README.md.");
