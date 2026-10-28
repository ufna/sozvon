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
