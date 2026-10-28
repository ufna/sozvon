export const appConfig = {
	devMode: asBoolean(process.env.DEV_MODE || "true"),
	serverUrl: process.env.SERVER_URL || "http://localhost:4001/",
	serverWsUrl: websocketBase(process.env.SERVER_WS_URL || "ws://localhost:4001/"),

	iceServers: JSON.parse(process.env.ICE_SERVERS || "[{ \"urls\": [\"stun:stun.l.google.com:19302\", \"stun:stun1.l.google.com:19302\", \"stun:stun.stunprotocol.org:3478\"] }]"),

	version: process.env.VERSION || "local",
};

function asNumber(value) {
	if (!Number.isNaN(value)) {
		return Number(value);
	}

	throw new Error("Wrong value type: " + value + " is not a number");
}

function asBoolean(value) {
	if (value === "true" || value === true) {
		return true;
	} else if (value === "false" || value === false) {
		return false;
	}

	throw new Error("Wrong value type: " + value + " is not a boolean");
}

export default appConfig;
function websocketBase(base) {
	const url = new URL(base, window.location.href);
	if (url.protocol === "http:") url.protocol = "ws:";
	if (url.protocol === "https:") url.protocol = "wss:";
	return url.href;
}
