export const BRAND_NAMES = { sozvon: "sozvon" };

export function getLogo() {
	return "zov";
}

export function getIdentity() {
	return "sozvon";
}

export function logoPath(logo, identity) {
	return `/brand/v2/${logo}-${identity ? `${identity}-lockup` : "mark"}.svg`;
}
