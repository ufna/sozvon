export const PALETTES = [
	{ id: "studio", name: "Объёмный графит", color: "#ff9a00" },
	{ id: "graphite", name: "Графит / оранжевый", color: "#ff9a00" },
	{ id: "mono", name: "Монохром", color: "#f5f7fa" },
	{ id: "blue", name: "Графит / синий", color: "#4d98ff" },
];

export function getPalette() {
	const query = new URLSearchParams(location.search).get("theme");
	return PALETTES.some((palette) => palette.id === query) ? query : "studio";
}

export function applyPalette(id) {
	document.documentElement.dataset.palette = id;
}
