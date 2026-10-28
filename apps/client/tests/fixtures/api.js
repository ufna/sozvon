// Isolated CI token issuer for exercising the browser against a real SFU.
import { randomUUID } from "node:crypto";
import http from "node:http";

import { AccessToken } from "livekit-server-sdk";
const secret = "test-secret-for-isolated-integration-validation-20261023";
const server = http.createServer(async(req, res) => {
	res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:4000");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");
	res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
	res.setHeader("Content-Type", "application/json");
	if (req.method === "OPTIONS") {
		res.writeHead(204); res.end(); return;
	}
	if (req.url === "/room/create") {
		res.end(JSON.stringify({ room: randomUUID() })); return;
	}
	const match = (/^\/room\/token\/livekit\/([a-f0-9-]+)$/).exec(req.url);
	if (!match) {
		res.writeHead(404); res.end("{}"); return;
	}
	let text = ""; for await (const chunk of req) {
		text += chunk; if (text.length > 4096) {
			req.destroy(); return;
		}
	}
	try {
		const identity = JSON.parse(text || "{}").identity || randomUUID();
		const token = new AccessToken("testkey", secret, { identity, ttl: "10m" });
		token.addGrant({ roomJoin: true, room: match[1], canPublish: true, canSubscribe: true, canPublishData: true, canUpdateOwnMetadata: true });
		res.end(JSON.stringify({ identity, socket: "ws://127.0.0.1:17880", token: await token.toJwt() }));
	} catch {
		res.writeHead(400); res.end("{}");
	}
});
server.listen(14001, "127.0.0.1");
process.once("SIGTERM", () => server.close());
