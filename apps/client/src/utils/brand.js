export const BRAND_NAMES = { sozvon: "Sozvon", govoice: "GoVoice" };

export function getLogo() {
	const saved = localStorage.getItem("sozvon.logo");
	return [ "zov", "most", "dialog" ].includes(saved) ? saved : "zov";
}

export function getIdentity() {
	if (location.pathname === "/design") {
		const saved = localStorage.getItem("govoice.identity");
		if (Object.hasOwn(BRAND_NAMES, saved)) return saved;
	}
	const hostname = location.hostname.toLowerCase().replace(/\.$/, "");
	return hostname === "govoice.now" || hostname.endsWith(".govoice.now") ? "govoice" : "sozvon";
}

export function logoPath(logo, identity) {
	return `/brand/v2/${logo}-${identity ? `${identity}-lockup` : "mark"}.svg`;
}
