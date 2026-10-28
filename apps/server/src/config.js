import dotenv from "dotenv";

dotenv.config({ quiet: true });

export function createConfig(env = process.env) {
	const devMode = env.DEV_MODE === "true";
	const required = (name) => {
		const value = env[name];
		if (!value || value.length < 32) throw new Error(`${name} must contain at least 32 characters`);
		return value;
	};
	const integer = (name, fallback) => {
		const value = Number(env[name] || fallback);
		if (!Number.isSafeInteger(value) || value < 1 || value > 65535) throw new Error(`Invalid ${name}`);
		return value;
	};
	const host = env.HOST || "localhost";
	const liveKitServerUrl = env.LIVEKIT_SERVER_URL || "http://127.0.0.1:7880";
	const publicSocket = env.LIVEKIT_URL || `${devMode ? "ws" : "wss"}://${host}${devMode ? ":7880" : ""}`;
	for (const [ value, protocols ] of [ [ liveKitServerUrl, [ "http:", "https:" ] ], [ publicSocket, [ "ws:", "wss:" ] ] ]) {
		const url = new URL(value);
		if (!protocols.includes(url.protocol) || url.username || url.password) throw new Error("Invalid LiveKit URL");
	}
	if (!devMode && !publicSocket.startsWith("wss://")) throw new Error("Production LiveKit URL must use wss");
	return {
		devMode, host, version: env.VERSION || "local",
		bind: env.BIND_ADDRESS || "127.0.0.1", port: integer("PORT", 4001),
		allowedOrigins: (env.ALLOWED_ORIGINS || "https://sozvon.now,https://sozvon.app,https://govoice.now").split(",").map((s) => s.trim()),
		signalingSecret: required("SIGNALING_SECRET"),
		liveKit: { key: env.LIVE_KEY || "devkey", secret: required("LIVE_SECRET"), serverUrl: liveKitServerUrl, publicSocket },
	};
}

export const appConfig = createConfig();
export default appConfig;
