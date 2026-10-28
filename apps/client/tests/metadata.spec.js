import { expect, test } from "@playwright/test";

test.use({ javaScriptEnabled: false });

function pngSize(body) {
	expect(body.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
	return [ body.readUInt32BE(16), body.readUInt32BE(20) ];
}

for (const [ key, name, domain, html, language ] of [
	[ "sozvon", "sozvon", "sozvon.now", "/index.html", "ru" ],
	[ "govoice", "Go Voice", "govoice.now", "/index-govoice.html", "en" ],
]) {
	test(`${name} exposes its link preview and install identity without JavaScript`, async({ page, request }) => {
		await page.goto(html);
		await expect(page).toHaveTitle(name);
		await expect(page.locator("html")).toHaveAttribute("lang", language);
		await expect(page.locator("meta[property=\"og:title\"]")).toHaveAttribute("content", name);
		await expect(page.locator("meta[property=\"og:site_name\"]")).toHaveAttribute("content", name);
		await expect(page.locator("meta[name=\"twitter:title\"]")).toHaveAttribute("content", name);
		const imageVersion = key === "govoice" ? "govoice-1" : "graphite-4";
		const image = await page.locator("meta[property=\"og:image\"]").getAttribute("content");
		expect(image).toBe(`https://${domain}/og-${key}.png?v=${imageVersion}`);
		await expect(page.locator("meta[name=\"twitter:image\"]")).toHaveAttribute("content", image);
		await expect(page.locator("meta[property=\"og:image:width\"]")).toHaveAttribute("content", "1200");
		await expect(page.locator("meta[property=\"og:image:height\"]")).toHaveAttribute("content", "630");
		const url = new URL(image);
		const preview = await request.get(url.pathname + url.search);
		expect(preview.ok()).toBe(true);
		expect(pngSize(await preview.body())).toEqual([ 1200, 630 ]);
		const manifestURL = await page.locator("link[rel=manifest]").getAttribute("href");
		const manifest = await (await request.get(manifestURL)).json();
		expect(manifest.name).toBe("sozvon");
		expect(manifest.short_name).toBe("sozvon");
		expect(manifest.lang).toBe("ru");
		expect(manifest.theme_color).toBe("#101010");
		expect(manifest.start_url).toBe("/");
		expect(manifest.icons).toHaveLength(4);
		for (const icon of manifest.icons) {
			const response = await request.get(icon.src);
			expect(response.ok()).toBe(true);
			expect(pngSize(await response.body())).toEqual(icon.sizes.split("x").map(Number));
		}
	});
}

test("browser and Apple icon fallbacks contain actual image files", async({ page, request }) => {
	await page.goto("/index.html");
	const apple = await page.locator("link[rel=apple-touch-icon]").getAttribute("href");
	expect(pngSize(await (await request.get(apple)).body())).toEqual([ 180, 180 ]);
	const png = await page.locator("link[rel=icon][type=\"image/png\"]").getAttribute("href");
	expect(pngSize(await (await request.get(png)).body())).toEqual([ 64, 64 ]);
	const ico = await request.get("/favicon.ico?v=graphite-3");
	expect((await ico.body()).subarray(0, 6).toString("hex")).toBe("000001000300");
});
