import compression from "compression";
import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { RoomServiceClient } from "livekit-server-sdk";
import morgan from "morgan";

import appConfig from "./config.js";
import { createRoomRouter } from "./router/room.js";

export function createApp(config = appConfig, { readiness } = {}) {
	const app = express();
	app.disable("x-powered-by");
	app.set("trust proxy", "loopback");
	app.use(helmet());
	app.use(morgan("short", { skip: (req) => req.path === "/healthz" || req.path === "/readyz" }));
	app.use(cors({ origin: (origin, callback) => {
		if (!origin || config.allowedOrigins.includes(origin) || (config.devMode && (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/).test(origin))) callback(null, true);
		else callback(Object.assign(new Error("Origin is not allowed"), { status: 403 }));
	} }));
	app.use(compression());
	app.use(express.json({ limit: "64kb" }));
	const client = new RoomServiceClient(config.liveKit.serverUrl, config.liveKit.key, config.liveKit.secret);
	let checkedAt = 0;
	let ready = false;
	const check = readiness || (async() => {
		if (Date.now() - checkedAt > 2000) {
			await Promise.race([ client.listRooms(), new Promise((_, reject) => {
				const t = setTimeout(() => reject(new Error("SFU timeout")), 3000); t.unref();
			}) ]);
			checkedAt = Date.now(); ready = true;
		}
		return ready;
	});
	app.get("/healthz", (req, res) => res.json({ status: "ok", version: config.version }));
	app.get("/readyz", async(req, res) => {
		try {
			if (!await check()) throw new Error("Not ready"); res.json({ status: "ready" });
		} catch {
			ready = false; checkedAt = 0; res.status(503).json({ status: "unavailable" });
		}
	});
	app.use("/room", rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));
	app.use(createRoomRouter(config));
	app.use((error, req, res, next) => {
		if (res.headersSent) return next(error);
		const status = error.status || 500;
		if (status >= 500) console.error("API request failed", error.message);
		res.status(status).json({ error: status >= 500 ? "Request failed" : error.message });
	});
	return app;
}
export default createApp();
