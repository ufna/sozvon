import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

test("production TURN/TLS connects with direct ICE disabled", async({ browser, browserName }) => {
	test.skip(!process.env.TEST_TURN || browserName !== "chromium", "Requires the deployed TURN/TLS endpoint");
	const context = await browser.newContext({ permissions: [ "microphone", "camera" ] });
	await context.addInitScript(() => {
		const Original = window.RTCPeerConnection;
		const relayOnly = (config) => ({
			...config, iceTransportPolicy: "relay",
			iceServers: config?.iceServers?.flatMap((server) => {
				const urls = [ server.urls ].flat().filter((url) => url.startsWith("turns:") && url.includes(":443"));
				return urls.length ? [ { ...server, urls } ] : [];
			}),
		});
		window.__voiceConnections = [];
		window.__voiceIceErrors = [];
		window.__voiceCandidates = [];
		window.RTCPeerConnection = class extends Original {
			constructor(config, constraints) {
				super(relayOnly(config), constraints); window.__voiceConnections.push(this);
				this.addEventListener("icecandidateerror", (event) => window.__voiceIceErrors.push({ code: event.errorCode, text: event.errorText, url: event.url }));
				this.addEventListener("icecandidate", ({ candidate }) => {
					if (candidate) window.__voiceCandidates.push({ type: candidate.type, protocol: candidate.protocol, relayProtocol: candidate.relayProtocol });
				});
			}
			setConfiguration(config) {
				return super.setConfiguration(relayOnly(config));
			}
		};
	});
	const page = await context.newPage();
	try {
		await page.goto("/" + randomUUID());
		const join = page.getByRole("button", { name: /Join|Присоединиться|Войти/ });
		await join.click({ timeout: 20000 });
		await expect(join).not.toBeVisible({ timeout: 30000 });
		await expect(page.locator("button[data-shortcut=C]")).toBeVisible({ timeout: 30000 });
		await page.locator("button[data-shortcut=Space]").click();
		await expect(page.locator("button[data-shortcut=Space]")).toHaveAttribute("aria-pressed", "true");
		await expect.poll(() => page.evaluate(async() => {
			const candidates = [];
			for (const pc of window.__voiceConnections) {
				const stats = await pc.getStats();
				for (const report of stats.values()) if (report.type === "candidate-pair" && report.state === "succeeded" && report.nominated) {
					const local = stats.get(report.localCandidateId); if (local) candidates.push(local.candidateType);
				}
			}
			return candidates;
		}), { timeout: 30000 }).toContain("relay");
		expect(await page.evaluate(() => window.__voiceCandidates.some((candidate) => candidate.type === "relay" && candidate.relayProtocol === "tls"))).toBe(true);
	} catch (error) {
		console.log(JSON.stringify(await page.evaluate(() => ({
			errors: window.__voiceIceErrors,
			candidates: window.__voiceCandidates,
			connections: window.__voiceConnections.map((pc) => ({ state: pc.connectionState, policy: pc.getConfiguration().iceTransportPolicy, servers: pc.getConfiguration().iceServers?.map((server) => server.urls) })),
		}))));
		throw error;
	} finally {
		await context.close();
	}
});
