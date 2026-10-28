import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

for (const mode of [ "sfu", "p2p" ]) {
	test(`${mode}: audio, video, screen share, chat, reload and return to meeting`, async({ browser, browserName }) => {
		test.setTimeout(90000);
		test.skip(!process.env.TEST_MEDIA || mode === "p2p" && !process.env.TEST_P2P, "Requires a meeting server supporting this mode");
		const a = await browser.newContext({ permissions: browserName === "chromium" ? [ "microphone", "camera" ] : [] });
		const b = await browser.newContext({ permissions: browserName === "chromium" ? [ "microphone", "camera" ] : [] });
		const first = await a.newPage(), second = await b.newPage();
		const errors = []; for (const page of [ first, second ]) page.on("pageerror", (e) => errors.push(e.message));
		const path = (mode === "p2p" ? "/p2p/" : "/") + randomUUID();
		if (browserName === "chromium") for (const context of [ a, b ]) await context.addInitScript(() => {
			navigator.mediaDevices.getDisplayMedia = () => navigator.mediaDevices.getUserMedia({ video: true, audio: false });
		});
		try {
			for (const page of [ first, second ]) {
				await page.goto(path);
				const join = page.getByRole("button", { name: /Join|Присоединиться|Войти/ });
				await join.locator("..").getByRole("button", { name: /Settings|Настройки/, exact: true }).click(); await expect(page.getByRole("dialog")).toBeVisible();
				await page.getByRole("dialog").getByRole("button", { name: /Close|Закрыть/, exact: true }).click();
				await join.click();
				await expect(join).not.toBeVisible();
			}
			for (const page of [ first, second ]) {
				await expect(page.locator("button[data-shortcut=C]")).toBeVisible({ timeout: 20000 });
				if (browserName === "chromium") {
					await page.locator("button[data-shortcut=Space]").click();
					await expect(page.locator("button[data-shortcut=Space]")).toHaveAttribute("aria-pressed", "true");
					await page.locator("button[data-shortcut=V]").click();
					await expect(page.locator("button[data-shortcut=V]")).toHaveAttribute("aria-pressed", "true");
				}
			}
			if (browserName === "chromium") {
				await expect.poll(() => second.locator("video").evaluateAll((videos) => videos.filter((v) => v.srcObject && v.readyState >= 2 && v.videoWidth > 0).length), { timeout: 20000 }).toBe(2);
				await expect.poll(() => second.locator("audio").evaluateAll((tracks) => tracks.filter((v) => v.srcObject && v.readyState >= 2).length), { timeout: 20000 }).toBeGreaterThan(0);
			}
			if (browserName === "chromium") {
				await first.locator("button[data-shortcut=V]").click();
				await expect.poll(() => second.locator("video").evaluateAll((videos) => videos.filter((v) => v.srcObject && v.readyState >= 2 && v.videoWidth > 0).length), { timeout: 20000 }).toBe(1);
				await first.locator("button[data-shortcut=V]").click();
				await expect(first.locator("button[data-shortcut=V]")).toHaveAttribute("aria-pressed", "true");
				await first.locator("button[data-shortcut=Space]").click();
				await expect(first.locator("button[data-shortcut=Space]")).toHaveAttribute("aria-pressed", "false");
				await expect.poll(() => second.locator("audio").count(), { timeout: 20000 }).toBe(0);
				await first.locator("button[data-shortcut=Space]").click();
				await expect(first.locator("button[data-shortcut=Space]")).toHaveAttribute("aria-pressed", "true");
				await first.locator("button[data-shortcut=S]").click();
				await expect(first.locator("button[data-shortcut=S]")).toHaveAttribute("aria-pressed", "true");
				await expect.poll(() => second.locator("video").evaluateAll((videos) => videos.filter((v) => v.srcObject && v.readyState >= 2 && v.videoWidth > 0).length), { timeout: 20000 }).toBe(3);
				await first.locator("button[data-shortcut=S]").click();
				await expect(first.locator("button[data-shortcut=S]")).toHaveAttribute("aria-pressed", "false");
				await expect.poll(() => second.locator("video").evaluateAll((videos) => videos.filter((v) => v.srcObject && v.readyState >= 2 && v.videoWidth > 0).length), { timeout: 20000 }).toBe(2);
				const volume = first.getByRole("group", { name: /Meeting controls|Управление встречей/, exact: true }).getByRole("button", { name: /Volume|Громкость/, exact: true });
				await volume.click();
				const slider = first.getByRole("slider", { name: /Volume|Громкость/, exact: true });
				await slider.press("Home");
				await expect.poll(() => first.locator("audio").evaluateAll((tracks) => tracks.length > 0 && tracks.every((track) => track.volume === 0))).toBe(true);
				await slider.press("End");
				await volume.click();
			}
			await first.getByRole("button", { name: /edit name|изменить имя/i }).first().click();
			await first.getByRole("textbox").fill("Voice Test");
			await first.getByRole("textbox").press("Enter");
			await expect(second.getByText("Voice Test", { exact: true }).first()).toBeVisible();
			for (const page of [ first, second ]) await page.locator("button[data-shortcut=C]").click();
			await first.locator("textarea").fill("voice integration message"); await first.locator("textarea").press("Enter");
			await expect(second.getByText("voice integration message", { exact: true })).toBeVisible();
			await second.reload(); await second.getByRole("button", { name: /Join|Присоединиться|Войти/ }).click();
			await expect(second.getByRole("button", { name: /Join|Присоединиться|Войти/ })).not.toBeVisible();
			await expect(second.locator("button[data-shortcut=C]")).toBeVisible({ timeout: 20000 });
			if (browserName === "chromium") {
				for (const shortcut of [ "Space", "V" ]) {
					const button = second.locator(`button[data-shortcut=${shortcut}]`);
					if (await button.getAttribute("aria-pressed") !== "true") await button.click();
					await expect(button).toHaveAttribute("aria-pressed", "true");
				}
			}
			await first.evaluate(() => {
				const last = JSON.parse(localStorage.getItem("lastRoom"));
				last.ts = Date.now() - 60 * 60 * 1000;
				localStorage.setItem("lastRoom", JSON.stringify(last));
			});
			await first.getByRole("button", { name: /Leave|Покинуть/, exact: true }).click();
			await first.getByRole("button", { name: /Return to meeting|Вернуться во встречу/, exact: true }).click();
			await expect(first.getByRole("button", { name: /Join|Присоединиться|Войти/ })).toBeVisible();
			expect(new URL(first.url()).pathname).toBe(path);
			await first.getByRole("button", { name: /Join|Присоединиться|Войти/ }).click();
			await expect(first.getByRole("button", { name: /Join|Присоединиться|Войти/ })).not.toBeVisible();
			await expect(first.getByRole("button", { name: /edit name|изменить имя/i }).first()).toContainText("Voice Test");
			if (browserName === "chromium") {
				for (const shortcut of [ "Space", "V" ]) {
					const button = first.locator(`button[data-shortcut=${shortcut}]`);
					if (await button.getAttribute("aria-pressed") !== "true") await button.click();
					await expect(button).toHaveAttribute("aria-pressed", "true");
				}
				await expect.poll(() => second.locator("video").evaluateAll((videos) => videos.filter((v) => v.srcObject && v.readyState >= 2 && v.videoWidth > 0).length), { timeout: 20000 }).toBe(2);
				await expect.poll(() => second.locator("audio").evaluateAll((tracks) => tracks.filter((track) => track.srcObject && track.readyState >= 2).length), { timeout: 20000 }).toBeGreaterThan(0);
			}
			expect(errors).toEqual([]);
		} finally {
			await a.close(); await b.close();
		}
	});
}
