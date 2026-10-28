import http from "node:http";

import app from "../src/app.js";
import config from "../src/config.js";
import { attachSignaling } from "../src/services/service-signaling.js";

const server = http.createServer({ requestTimeout: 15_000, headersTimeout: 10_000 }, app);
const signaling = attachSignaling(server, config);
server.listen(config.port, config.bind, () => console.info(`Voice API listening on ${config.bind}:${config.port}`));
let stopping = false;
function shutdown() {
	if (stopping) return;
	stopping = true;
	signaling.close();
	server.close(() => process.exit(0));
	server.closeIdleConnections();
	setTimeout(() => process.exit(1), 10_000).unref();
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
