import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
	testDir: "./tests", timeout: 45_000, fullyParallel: false,
	use: { baseURL: process.env.TEST_URL || "http://127.0.0.1:4000", trace: "retain-on-failure", serviceWorkers: "block" },
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { args: [ "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required" ] } } },
		{ name: "webkit", use: { ...devices["Desktop Safari"] } },
	],
	webServer: process.env.TEST_URL ? undefined : { command: "npm run preview -- --port 4000", url: "http://127.0.0.1:4000", reuseExistingServer: !process.env.CI },
});
