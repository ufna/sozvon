import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import http from "node:http";
import test from "node:test";

import jwt from "jsonwebtoken";
import { WebSocket } from "ws";

process.env.LIVE_SECRET = "L".repeat(64);
process.env.SIGNALING_SECRET = "S".repeat(64);
const { createConfig } = await import("../src/config.js");
const { createApp } = await import("../src/app.js");
const { attachSignaling } = await import("../src/services/service-signaling.js");
const config = createConfig({ LIVE_SECRET: process.env.LIVE_SECRET, SIGNALING_SECRET: process.env.SIGNALING_SECRET, HOST: "rtc.example.test" });

async function fixture(t, options = {}) {
	const server = http.createServer(createApp(config, { readiness: async() => options.ready !== false }));
	const signaling = attachSignaling(server, config, options);
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	t.after(async() => {
		signaling.close(); server.closeAllConnections(); await new Promise((resolve) => server.close(resolve));
	});
	return { url: `http://127.0.0.1:${server.address().port}`, ws: `ws://127.0.0.1:${server.address().port}/signaling` };
}
async function post(url, body = {}) {
	return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
function signed(roomId, identity, options = {}) {
	return jwt.sign({ roomId, identity }, config.signalingSecret, { algorithm: "HS256", issuer: "voice-server", audience: "voice-signaling", expiresIn: "1h", ...options });
}
async function connect(url) {
	const ws = new WebSocket(url); await once(ws, "open"); return ws;
}
function join(ws, room, id) {
	const next = once(ws, "message"); ws.send(JSON.stringify({ type: "join", token: signed(room, id) })); return next.then(([ data ]) => JSON.parse(data));
}

test("production fails closed without independent secret configuration", () => {
	assert.throws(() => createConfig({}), /SIGNALING_SECRET/);
	assert.throws(() => createConfig({ SIGNALING_SECRET: "s".repeat(64), LIVE_SECRET: "short" }), /LIVE_SECRET/);
	assert.throws(() => createConfig({ SIGNALING_SECRET: "s".repeat(64), LIVE_SECRET: "l".repeat(64), LIVEKIT_URL: "ws://public.example" }), /wss/);
});
test("health and readiness reflect SFU availability", async(t) => {
	const f = await fixture(t, { ready: false });
	assert.equal((await fetch(f.url + "/healthz")).status, 200);
	assert.equal((await fetch(f.url + "/readyz")).status, 503);
});
test("tokens are scoped, IDs validated and errors stay JSON", async(t) => {
	const f = await fixture(t); const room = randomUUID();
	assert.equal((await post(f.url + "/room/token/livekit/not-a-uuid")).status, 400);
	assert.equal((await post(f.url + "/room/token/livekit/" + room, { identity: {} })).status, 400);
	const r = await post(f.url + "/room/token/livekit/" + room); assert.equal(r.status, 200);
	const token = jwt.decode((await r.json()).token);
	assert.equal(token.video.room, room); assert.equal(token.video.roomJoin, true); assert.equal(token.video.roomAdmin, undefined);
	assert.ok(token.exp - token.nbf <= 3600);
	const p2p = await (await post(f.url + "/room/token/p2p/" + room)).json();
	assert.equal(jwt.verify(p2p.token, config.signalingSecret, { issuer: "voice-server", audience: "voice-signaling" }).roomId, room);
	const cors = await fetch(f.url + "/room/create", { method: "POST", headers: { Origin: "https://evil.example" } }); assert.equal(cors.status, 403);
	const huge = await post(f.url + "/room/create", { value: "x".repeat(70_000) }); assert.equal(huge.status, 413);
});
test("signaling authenticates promptly, rejects malformed input and repeated join", async(t) => {
	const f = await fixture(t, { joinTimeoutMs: 30 });
	const idle = await connect(f.ws); assert.equal((await once(idle, "close"))[0], 4001);
	const malformed = await connect(f.ws); const closed = once(malformed, "close"); malformed.send("null"); assert.equal((await closed)[0], 4002);
	const peer = await connect(f.ws); const room = randomUUID(), id = randomUUID(); await join(peer, room, id);
	const rejoin = once(peer, "close"); peer.send(JSON.stringify({ type: "join", token: signed(room, id) })); assert.equal((await rejoin)[0], 4002);
});
test("duplicate identity cleanup preserves the replacement connection", async(t) => {
	const f = await fixture(t); const room = randomUUID(), a = randomUUID(), b = randomUUID();
	const old = await connect(f.ws); await join(old, room, a);
	const replacement = await connect(f.ws); const replaced = once(old, "close"); await join(replacement, room, a); assert.equal((await replaced)[0], 4009);
	const sender = await connect(f.ws); const peers = await join(sender, room, b); assert.deepEqual(peers.peers, [ a ]);
	const received = new Promise((resolve) => {
		const onMessage = (raw) => {
			if (JSON.parse(raw).type === "signal") {
				replacement.off("message", onMessage); resolve([ raw ]);
			}
		}; replacement.on("message", onMessage);
	}); sender.send(JSON.stringify({ type: "signal", target: a, data: { candidate: "fixture" } }));
	assert.equal(JSON.parse((await received)[0]).from, b);
	replacement.terminate(); sender.terminate();
});
