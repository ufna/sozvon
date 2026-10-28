import jwt from "jsonwebtoken";
import { WebSocketServer } from "ws";

import { isValidId } from "../router/room.js";

export function attachSignaling(server, config, options = {}) {
	const rooms = new Map();
	const counts = new Map();
	const maxConnections = options.maxConnections || 512;
	const maxConnectionsPerIp = options.maxConnectionsPerIp || 16;
	const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024, perMessageDeflate: false });
	const upgrade = (req, socket, head) => {
		const reject = (status) => {
			socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
		};
		if (req.url !== "/signaling") return reject("404 Not Found");
		if (req.headers.origin && !config.allowedOrigins.includes(req.headers.origin) && !(config.devMode && (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/).test(req.headers.origin))) return reject("403 Forbidden");
		// Only the local reverse proxy is trusted to supply a client address.
		const address = req.socket.remoteAddress;
		const local = [ "127.0.0.1", "::1", "::ffff:127.0.0.1" ].includes(address);
		const forwarded = req.headers["x-real-ip"];
		const ip = local && typeof forwarded === "string" ? forwarded : address;
		if (wss.clients.size >= maxConnections || (counts.get(ip) || 0) >= maxConnectionsPerIp) return reject("429 Too Many Requests");
		counts.set(ip, (counts.get(ip) || 0) + 1);
		let released = false;
		const release = () => {
			if (released) return; released = true; const n = (counts.get(ip) || 1) - 1; if (n) counts.set(ip, n); else counts.delete(ip);
		};
		socket.once("close", release);
		wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws));
	};
	server.on("upgrade", upgrade);
	wss.on("connection", (ws) => {
		let roomId, identity, expiry;
		let windowAt = Date.now(), messages = 0;
		ws.alive = true;
		const joinTimeout = setTimeout(() => ws.close(4001, "Authentication timeout"), options.joinTimeoutMs || 10_000);
		joinTimeout.unref();
		const broadcast = (message) => {
			for (const [ id, peer ] of rooms.get(roomId) || []) if (id !== identity && peer.readyState === 1) peer.send(JSON.stringify(message));
		};
		ws.on("pong", () => {
			ws.alive = true;
		});
		ws.on("message", (raw, binary) => {
			if (Date.now() - windowAt > 1000) {
				windowAt = Date.now(); messages = 0;
			}
			if (++messages > 60) return ws.close(4008, "Message rate exceeded");
			if (binary) return ws.close(4002, "JSON messages required");
			let msg;
			try {
				msg = JSON.parse(raw.toString());
			} catch {
				return ws.close(4002, "Invalid JSON");
			}
			if (!msg || typeof msg !== "object") return ws.close(4002, "Invalid message");
			if (!identity) {
				if (msg.type !== "join" || typeof msg.token !== "string") return ws.close(4001, "Join required");
				let payload;
				try {
					payload = jwt.verify(msg.token, config.signalingSecret, { algorithms: [ "HS256" ], issuer: "voice-server", audience: "voice-signaling" });
				} catch {
					return ws.close(4003, "Invalid token");
				}
				if (!isValidId(payload.roomId) || !isValidId(payload.identity) || !Number.isFinite(payload.exp)) return ws.close(4003, "Invalid token payload");
				roomId = payload.roomId; identity = payload.identity;
				let room = rooms.get(roomId);
				if (!room) {
					room = new Map(); rooms.set(roomId, room);
				}
				if (!room.has(identity) && room.size >= 50) return ws.close(4008, "Room is full");
				const previous = room.get(identity);
				const peers = [ ...room.keys() ].filter((id) => id !== identity);
				room.set(identity, ws);
				if (previous) previous.close(4009, "Connection replaced");
				clearTimeout(joinTimeout);
				expiry = setTimeout(() => ws.close(4003, "Token expired"), Math.min(2 ** 31 - 1, Math.max(1, payload.exp * 1000 - Date.now()))); expiry.unref();
				ws.send(JSON.stringify({ type: "peers", peers }));
				broadcast({ type: "peer-joined", identity });
				return;
			}
			if (msg.type === "join") return ws.close(4002, "Already joined");
			if (msg.type !== "signal" || !isValidId(msg.target)) return ws.close(4002, "Invalid signal");
			const target = rooms.get(roomId)?.get(msg.target);
			if (target?.readyState === 1) target.send(JSON.stringify({ type: "signal", from: identity, data: msg.data }));
		});
		ws.on("close", () => {
			clearTimeout(joinTimeout); clearTimeout(expiry);
			const room = rooms.get(roomId);
			if (!room || room.get(identity) !== ws) return;
			room.delete(identity); broadcast({ type: "peer-left", identity });
			if (!room.size) rooms.delete(roomId);
		});
		ws.on("error", () => {});
	});
	const heartbeat = setInterval(() => {
		for (const ws of wss.clients) {
			if (!ws.alive) ws.terminate(); else {
				ws.alive = false; ws.ping();
			}
		}
	}, 30_000); heartbeat.unref();
	return { close() {
		clearInterval(heartbeat); server.off("upgrade", upgrade); for (const ws of wss.clients) ws.close(1001, "Server restarting"); wss.close();
	} };
}
