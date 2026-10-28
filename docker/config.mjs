import { isIP } from "node:net";

export function runtimeConfig(env, secrets) {
 const url = new URL(env.PUBLIC_URL || "http://localhost:8080");
 const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
 if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("PUBLIC_URL must be an HTTP(S) origin without credentials or a path");
 if (!local && url.protocol !== "https:") throw new Error("A public server needs an HTTPS PUBLIC_URL for camera and microphone access");
 if (url.protocol === "https:" && url.port && url.port !== "443") throw new Error("Public HTTPS uses external port 443");
 if (env.PUBLIC_IP && !isIP(env.PUBLIC_IP)) throw new Error("PUBLIC_IP must be a literal IP address");
 const port = (name, fallback) => {
  const n = Number(env[name] || fallback);
  if (!Number.isSafeInteger(n) || n < 1024 || n > 65535) throw new Error(`Invalid ${name}`);
  return n;
 };
 if (!/^[a-f0-9]{64}$/.test(secrets.live) || !/^[a-f0-9]{64}$/.test(secrets.signaling) || secrets.live === secrets.signaling) throw new Error("Invalid persisted credentials; refusing to replace them");
 const tcp = port("RTC_TCP_PORT", 7881), udp = port("RTC_UDP_PORT", 7882);
 if ([4001, 7880, 8080, 8443].some((p) => p === tcp || p === udp)) throw new Error("RTC ports conflict with internal listeners");
 const socket = url.origin.replace(/^http/, "ws") + "/livekit";
 const apiEnv = { DEV_MODE: String(url.protocol === "http:"), BIND_ADDRESS: "127.0.0.1", PORT: "4001", ALLOWED_ORIGINS: url.origin, LIVE_KEY: "sozvon", LIVE_SECRET: secrets.live, SIGNALING_SECRET: secrets.signaling, LIVEKIT_SERVER_URL: "http://127.0.0.1:7880", LIVEKIT_URL: socket };
 const livekit = {
  port: 7880, bind_addresses: ["0.0.0.0"],
  rtc: { tcp_port: tcp, udp_port: udp, use_external_ip: !local && !env.PUBLIC_IP },
  keys: { sozvon: secrets.live },
 };
 if (local || env.PUBLIC_IP) livekit.rtc.node_ip = env.PUBLIC_IP || "127.0.0.1";
 const address = url.protocol === "https:" ? url.hostname : "http://:8080";
 const caddy = `{
 admin off
 servers {
  protocols h1 h2
 }
 http_port 8080
 https_port 8443
 storage file_system /data/caddy
}
${address} {
 handle_path /api/* {
  reverse_proxy 127.0.0.1:4001
 }
 handle_path /livekit/* {
  reverse_proxy 127.0.0.1:7880
 }
 handle {
  reverse_proxy 127.0.0.1:4001
 }
}
`;
 return { origin: url.origin, apiEnv, livekit, caddy };
}
