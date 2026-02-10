import crypto from "node:crypto";

import express from "express";
import jwt from "jsonwebtoken";
import { AccessToken, TrackSource } from "livekit-server-sdk";
import { v4 } from "uuid";

import appConfig from "../config.js";
import { isValid } from "../utils/utils.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidRoomId(value) {
	return typeof value === "string" && UUID_RE.test(value);
}

const router = express.Router();

router.post("/room/create", (req, res) => {
	res.json({
		room: v4(),
	});
});

router.post("/room/token/livekit/:room", async(req, res) => {
	const { room } = req.params;

	if (!isValidRoomId(room)) {
		return res.status(400).json({ error: "Invalid room ID" });
	}

	let { identity } = req.body;

	if (!isValid(identity)) {
		identity = v4();
	}

	const accessToken = new AccessToken(appConfig.liveKit.key, appConfig.liveKit.secret, { identity: identity });
	accessToken.addGrant({
		room: room,
		roomJoin: true,
		canPublish: true,
		canSubscribe: true,
		canPublishSources: [
			TrackSource.MICROPHONE,
			TrackSource.CAMERA,
			TrackSource.SCREEN_SHARE,
			TrackSource.SCREEN_SHARE_AUDIO,
		],
	});

	res.json({
		identity: identity,
		socket: appConfig.devMode ? `ws://${appConfig.host}:${appConfig.liveKit.port}` : `wss://${appConfig.host}`,
		token: await accessToken.toJwt(),
	});
});

router.post("/room/token/p2p/:room", (req, res) => {
	const { room } = req.params;

	if (!isValidRoomId(room)) {
		return res.status(400).json({ error: "Invalid room ID" });
	}

	let { identity } = req.body;

	if (!isValid(identity)) {
		identity = v4();
	}

	const token = jwt.sign(
		{ identity, roomId: room },
		appConfig.signalingSecret,
		{ expiresIn: "24h" },
	);

	res.json({ identity, token });
});

export default router;