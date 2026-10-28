import { randomUUID } from "node:crypto";

import express from "express";
import jwt from "jsonwebtoken";
import { AccessToken, TrackSource } from "livekit-server-sdk";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isValidId = (value) => typeof value === "string" && UUID_RE.test(value);

export function createRoomRouter(config) {
	const router = express.Router();
	router.post("/room/create", (req, res) => res.json({ room: randomUUID() }));
	const validate = (req, res, next) => {
		if (!isValidId(req.params.room)) return res.status(400).json({ error: "Invalid room ID" });
		if (req.body.identity !== undefined && !isValidId(req.body.identity)) return res.status(400).json({ error: "Invalid identity" });
		next();
	};
	router.post("/room/token/livekit/:room", validate, async(req, res, next) => {
		try {
			const identity = req.body.identity || randomUUID();
			const token = new AccessToken(config.liveKit.key, config.liveKit.secret, { identity, ttl: "1h" });
			token.addGrant({ room: req.params.room, roomJoin: true, canPublish: true, canSubscribe: true,
				canPublishData: true, canUpdateOwnMetadata: true,
				canPublishSources: [ TrackSource.MICROPHONE, TrackSource.CAMERA, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO ] });
			res.json({ identity, socket: config.liveKit.publicSocket, token: await token.toJwt() });
		} catch (error) {
			next(error);
		}
	});
	router.post("/room/token/p2p/:room", validate, (req, res) => {
		const identity = req.body.identity || randomUUID();
		const token = jwt.sign({ identity, roomId: req.params.room }, config.signalingSecret, { algorithm: "HS256", expiresIn: "1h", issuer: "voice-server", audience: "voice-signaling" });
		res.json({ identity, token });
	});
	return router;
}
