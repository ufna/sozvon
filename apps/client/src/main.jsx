import "./index.css";
import "./fonts.css";

import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import { appConfig } from "./config.js";
import root from "./data/root-data.js";
import { BRAND_NAMES, getIdentity } from "./utils/brand.js";
import { applyPalette, getPalette } from "./utils/palette.js";

root.settings.load();
document.title = `${BRAND_NAMES[getIdentity()]} ${appConfig.version}`;
applyPalette(getPalette());

if ("serviceWorker" in navigator) {
	navigator.serviceWorker.register("/sw.js?v=" + encodeURIComponent(appConfig.version));
}

createRoot(document.getElementById("root")).render(
	<App/>,
);
