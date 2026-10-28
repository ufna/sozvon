import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../apps/client/package.json", import.meta.url));
const { chromium } = require("@playwright/test");
const output = fileURLToPath(new URL("../docs/assets/readme/", import.meta.url));
const origin = process.env.SCREENSHOT_URL || "http://127.0.0.1:4400";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname)) {
 throw new Error("README captures must use a local preview, never a live meeting");
}
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
try {
 const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce", locale: "en-US" });
 await context.route("**/*", (route) => {
  const url = new URL(route.request().url());
  if (url.hostname === "api.dicebear.com") {
   const seed = url.searchParams.get("seed") || "preview-anna";
   const variants = {
    "preview-anna": ["#ff9a00", "AM"], "preview-misha": ["#77b9a2", "MV"],
    "preview-katya": ["#b29cdb", "KB"], "preview-dan": ["#6ca6cf", "DL"],
   };
   const [color, initials] = variants[seed] || variants["preview-anna"];
   return route.fulfill({ contentType: "image/svg+xml", body: `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><circle cx="80" cy="80" r="78" fill="${color}" fill-opacity=".12"/><circle cx="80" cy="80" r="62" fill="${color}" fill-opacity=".08"/><text x="80" y="96" text-anchor="middle" font-family="sans-serif" font-weight="600" font-size="44" fill="${color}">${initials}</text></svg>` });
  }
  if (url.origin === new URL(origin).origin || ["data:", "blob:"].includes(url.protocol)) return route.continue();
  return route.abort();
 });
 const page = await context.newPage();
 const errors = [];
 page.on("pageerror", (error) => errors.push(error.message));
 async function open(view, size) {
  await page.setViewportSize(size || { width: 1440, height: 900 });
  await page.goto(`${origin}/design?embed=1&theme=studio&lang=en&view=${view}`);
  await page.locator(view === "home" ? ".brand" : "button[data-shortcut=Space]").first().waitFor();
  await page.evaluate(async() => {
   await document.fonts.ready;
   await Promise.all(Array.from(document.images, (image) => image.decode().catch(() => {})));
  });
 }
 async function save(name) {
  const visibleText = await page.locator("body").innerText();
  if (/[А-Яа-яЁё]/u.test(visibleText)) throw new Error(`Non-English text in ${name}`);
  const png = await page.screenshot({ animations: "disabled" });
  const webp = execFileSync("python3", ["-c", "import sys; from PIL import Image; Image.open(sys.stdin.buffer).convert('RGB').save(sys.stdout.buffer, 'WEBP', quality=88, method=6)"], { input: png });
  writeFileSync(output + name + ".webp", webp);
  console.log(`${name}.webp (${webp.length} bytes)`);
 }
 await open("call");
 await save("meeting");
 await open("home");
 await save("home");
 await open("lobby");
 await save("lobby");
 await open("call");
 await page.getByRole("button", { name: "Settings", exact: true }).click();
 await page.getByRole("dialog").waitFor();
 await save("settings");
 await open("call", { width: 390, height: 844 });
 await save("mobile");
 await open("lobby", { width: 390, height: 844 });
 await save("mobile-lobby");
 if (errors.length) throw new Error(errors.join("\n"));
} finally {
 await browser.close();
}
