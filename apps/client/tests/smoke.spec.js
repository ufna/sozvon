import { expect, test } from "@playwright/test";

test("home renders and toggles P2P with keyboard and pointer", async({ page }, testInfo) => {
	const errors = []; page.on("pageerror", (error) => errors.push(error.message));
	await page.goto("/");
	await expect(page).toHaveTitle(`sozvon ${process.env.VERSION || "local"}`);
	await expect(page.getByRole("button", { name: /Create meeting|Создать/ })).toBeVisible();
	await expect(page.locator("body")).toHaveCSS("background-color", "rgb(16, 16, 16)");
	const toggle = page.getByRole("switch", { name: "P2P" });
	await expect(toggle).toHaveAttribute("aria-checked", "false");
	await toggle.click(); await expect(toggle).toHaveAttribute("aria-checked", "true");
	await toggle.press("Space"); await expect(toggle).toHaveAttribute("aria-checked", "false");
	await page.screenshot({ path: testInfo.outputPath("home.png"), fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(page.getByRole("button").first()).toBeVisible();
	await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
	expect(errors).toEqual([]);
});
