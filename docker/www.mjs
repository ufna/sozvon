import { readFileSync } from "node:fs";
import path from "node:path";
import express from "express";
import app from "../src/app.js";

const root = "/app/public";
const origin = new URL(process.env.PUBLIC_URL).origin;
const html = readFileSync(path.join(root, "index.html"), "utf8").replaceAll("https://sozvon.now", origin);
// The API retains its existing policy. The SPA needs media/inline styles and
// external avatar URLs, as in the separate nginx client distribution.
app.use((req, res, next) => { res.removeHeader("Content-Security-Policy"); next(); });
app.use(express.static(root, { index: false, setHeaders(res, file) {
 res.setHeader("Cache-Control", file.endsWith("sw.js") ? "no-store" : "public, max-age=3600");
} }));
app.get("*", (req, res) => {
 if (path.extname(req.path) || /^\/(room|signaling)(\/|$)/.test(req.path)) return res.sendStatus(404);
 res.type("html").set("Cache-Control", "no-store").send(html);
});
await import("../bin/www.js");
