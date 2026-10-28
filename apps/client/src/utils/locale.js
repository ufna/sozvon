import { runInAction } from "mobx";

import ar from "@/assets/ar.json";
import de from "@/assets/de.json";
import en from "@/assets/en.json";
import es from "@/assets/es.json";
import fr from "@/assets/fr.json";
import ja from "@/assets/ja.json";
import ko from "@/assets/ko.json";
import pt from "@/assets/pt.json";
import ru from "@/assets/ru.json";
import zh from "@/assets/zh.json";
import root from "@/data/root-data.js";

const translations = { en, ru, zh, es, fr, de, pt, ja, ko, ar };

const SUPPORTED_LOCALES = Object.keys(translations);

function detectLocale() {
	const lang = (navigator.language || "").slice(0, 2).toLowerCase();
	if (SUPPORTED_LOCALES.includes(lang)) return lang;
	return "en";
}

export function getLocale() {
	const saved = root.settings.language;
	if (SUPPORTED_LOCALES.includes(saved)) return saved;
	return detectLocale();
}

export function setLocale(code) {
	runInAction(() => {
		root.settings.language = code;
		root.settings.save();
	});
}

export function t(key) {
	const locale = getLocale();
	return translations[locale]?.[key] || translations.en[key] || key;
}
