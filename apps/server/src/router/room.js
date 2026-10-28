import crypto from "node:crypto";

import express from "express";
import jwt from "jsonwebtoken";
import { AccessToken, TrackSource } from "livekit-server-sdk";
import { v4 } from "uuid";

import appConfig from "../config.js";
import { isValid } from "../utils/utils.js";

const router = express.Router();

router.post("/room/create", (req, res) => {
	res.json({
		room: v4(),
	});
});

router.post("/room/token/livekit/:room", async(req, res) => {
	const { room } = req.params;
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
		socket: `wss://${appConfig.host}`,
		token: await accessToken.toJwt(),
	});
});

router.post("/room/token/p2p/:room", (req, res) => {
	const { room } = req.params;
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