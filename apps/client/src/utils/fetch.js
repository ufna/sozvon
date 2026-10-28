import appConfig from "@/config.js";
import { isEmpty, isValid } from "@/utils/utils.js";

const NON_SIMPLIFIED_HEADERS = new Set([
	"Content-Type".toLowerCase(),
	"skip_zrok_interstitial".toLowerCase(),
]);

function prepareUrl(url) {
	return url.replace(appConfig.serverUrl, "");
}

function encodeEnvelope({ headers, body }) {
	const now = Date.now();
	return JSON.stringify({
		v: 7,
		t: now,
		h: headers,
		b: body,
	});
}

export async function jsonFetch(url, data, { headers = {}, printToLog = true, simplify = false } = {}) {
	if (appConfig.devMode && printToLog) {
		console.log("<- Request: " + prepareUrl(url) + "\n", data);
	}

	return new Promise((resolve, reject) => {
		function _resolve(json) {
			if (appConfig.devMode && printToLog) {
				console.log("-> Response: " + prepareUrl(url) + "\n", json);
			}

			resolve({
				json: json,
				error: null,
			});
		}

		function _reject(e) {
			if (appConfig.devMode && printToLog) {
				console.error("-> Exception: " + prepareUrl(url) + "\n", e.message);
			}

			resolve({
				json: null,
				error: e,
			});
		}

		if (simplify) {
			headers["Content-Type"] = "text/plain";

			const realHeaders = {};
			const simplifiedHeaders = {};

			for (let key in headers) {
				const value = headers[key];
				key = key.toLowerCase();
				if (NON_SIMPLIFIED_HEADERS.has(key)) {
					realHeaders[key] = value;
				} else {
					simplifiedHeaders[key] = value;
				}
			}

			fetch(url, {
				method: "POST",
				headers: realHeaders,
				body: encodeEnvelope({ headers: simplifiedHeaders, body: data }),
			}).then((response) => {
				if (isValid(response)) {
					response.json().then(_resolve).catch(_reject);
				} else {
					_reject(new Error("Empty response"));
				}
			}).catch(_reject);
		} else {
			headers["Content-Type"] = "application/json";

			fetch(url, {
				method: "POST",
				headers: headers,
				body: JSON.stringify(data),
			}).then((response) => {
				if (isValid(response)) {
					response.json().then(_resolve).catch(_reject);
				} else {
					_reject(new Error("Empty response"));
				}
			}).catch(_reject);
		}
	});
}

export async function serverFetch(url, data, { headers = {}, printToLog = true, simplify = false } = {}) {
	//headers["X-Game-Locale"] = locale();
	//headers["X-Game-Version"] = appConfig.version;

	const { json, error } = await jsonFetch(appConfig.serverUrl + url, data, { headers, printToLog, simplify });
	if (error) {
		const message = error.message;
		return { Code: -1, Status: message, Message: message, Data: {} };
	}

	if (!isValid(json)) {
		return { Code: -1, Status: "Wrong format", Message: "Empty json", Data: {} };
	}

	if (isEmpty(json.Code)) {
		return { Code: -1, Status: "Wrong format", Message: "Empty code", Data: {} };
	}

	return json;
}