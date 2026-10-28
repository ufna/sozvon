import { readFile, writeFile } from "node:fs/promises";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/

export default defineConfig({
	server: {
		host: "127.0.0.1",
		port: 4000,
		strictPort: true,
	},
	css: {
		modules: {
			generateScopedName: process.env.NODE_ENV === "development" ? "[name]_[local]_[hash:base64:7]" : "[hash:base64:7]",
		},
	},
	plugins: [
		react(),
		tailwindcss(),
		{
			name: "brand-html",
			async writeBundle({ dir }) {
				const html = await readFile(path.join(dir, "index.html"), "utf8");
				const govoice = html.replaceAll("Sozvon", "GoVoice")
					.replaceAll("sozvon.now", "govoice.now")
					.replaceAll("og-sozvon", "og-govoice")
					.replaceAll("Видеозвонки без регистрации.", "Video calls. No sign-up.")
					.replace("lang=\"ru\"", "lang=\"en\"")
					.replace("ru_RU", "en_US")
					.replace("/manifest.json", "/manifest-govoice.json");
				await writeFile(path.join(dir, "index-govoice.html"), govoice);
			},
		},
	],
	resolve: {
		alias: {
			"@": path.resolve(import.meta.dirname, "src"),
		},
	},
	define: {
		global: "globalThis",
		"process.env.SERVER_URL": JSON.stringify(process.env.SERVER_URL || ""),
		"process.env.SERVER_WS_URL": JSON.stringify(process.env.SERVER_WS_URL || ""),
		"process.env.DEV_MODE": JSON.stringify(process.env.DEV_MODE || ""),
		"process.env.ICE_SERVERS": JSON.stringify(process.env.ICE_SERVERS || ""),
		"process.env.VERSION": JSON.stringify(process.env.VERSION || ""),
	},
});
