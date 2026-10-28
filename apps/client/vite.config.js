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
			name: "govoice-preview-html",
			async writeBundle({ dir }) {
				const html = await readFile(path.join(dir, "index.html"), "utf8");
				const preview = html.replaceAll("sozvon", "Go Voice")
					.replaceAll("https://Go Voice.now", "https://govoice.now")
					.replaceAll("og-Go Voice", "og-govoice")
					.replaceAll("Видеозвонки без регистрации.", "Video calls. No sign-up.")
					.replace("lang=\"ru\"", "lang=\"en\"").replace("ru_RU", "en_US")
					.replaceAll("og-govoice.png?v=graphite-4", "og-govoice.png?v=govoice-1");
				await writeFile(path.join(dir, "index-govoice.html"), preview);
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
