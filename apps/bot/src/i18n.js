import dotenv from "dotenv";

dotenv.config({ quiet: true });
const site = new URL(process.env.SITE_URL || "https://sozvon.now");
if (![ "http:", "https:" ].includes(site.protocol) || site.username || site.password || site.pathname !== "/" || site.search || site.hash) {
 throw new Error("SITE_URL must be an HTTP(S) origin without credentials");
}
const siteUrl = site.origin;
const siteHost = site.host;

export const locales = {
	ru: {
		siteUrl: `${siteUrl}`,
		inlineTitle: (topic) => topic ? `Созвон: ${topic}` : "sozvon",
		inlineDescription: "Начать созвон прямо сейчас",
		messageHeader: (topic) => topic ? `🎙 <b>Созвон: ${topic}</b>` : "🎙 <b>sozvon</b>",
		messageBody: (url) => `Присоединяйся к голосовому звонку прямо <a href="${url}">сейчас</a>!`,
		buttonLabel: "🎙 Подключиться",
		profileDescription:
			"Мгновенные голосовые звонки — без регистрации, без аккаунтов, полностью анонимно.\n\n" +
			"Поделись приглашением в любом чате одним касанием.\n\n" +
			`🌐 ${siteHost}`,
		startText: (username) =>
			"Привет! 👋\n\n" +
			"Два способа начать созвон:\n\n" +
			`📲 <b>Инлайн</b> — напиши <code>@${username}</code> в любом чате, выбери результат — приглашение отправлено.\n\n` +
			"🔗 <b>Здесь</b> — /sozvon создаст ссылку прямо в этом чате, чтобы разослать самому.\n\n" +
			`🌐 <a href=\"${siteUrl}\">${siteHost}</a>`,
		helpText: (username) =>
			"<b>Помощь</b>\n\n" +
			`📲 <b>Инлайн</b> — <code>@${username}</code> в любом чате\n` +
			"🔗 <b>Команда</b> — /sozvon создаст ссылку здесь\n\n" +
			`🌐 <a href=\"${siteUrl}\">${siteHost}</a>`,
		aboutText: (username) =>
			"👋 Привет! Я бот <b>sozvon</b>.\n\n" +
			"Предлагаю бесплатные приватные звонки для тебя и твоих друзей — в любой момент. " +
			"Можно шарить экран, стримить доту — всё тянет!\n\n" +
			`📲 Напиши <code>@${username}</code> в любом чате и выбери результат — звонок готов!\n` +
			`🤖 <a href="https://t.me/${username}">Открыть бота</a>\n\n` +
			`🌐 <a href=\"${siteUrl}\">${siteHost}</a>`,
		inlineAboutTitle: "О боте",
		inlineAboutDescription: "Бесплатные приватные звонки, шаринг экрана и стриминг",
	},
	en: {
		siteUrl: `${siteUrl}`,
		inlineTitle: (topic) => topic ? `sozvon: ${topic}` : "sozvon!",
		inlineDescription: "Start a voice call right now",
		messageHeader: (topic) => topic ? `🎙 <b>sozvon: ${topic}</b>` : "🎙 <b>sozvon!</b>",
		messageBody: (url) => `Join the voice call right <a href="${url}">now</a>!`,
		buttonLabel: "🎙 sozvon!",
		profileDescription:
			"Instant voice calls — no sign-up, no accounts, fully anonymous.\n\n" +
			"Share a call invite in any chat with a single tap.\n\n" +
			`🌐 ${siteHost}`,
		startText: (username) =>
			"Hey! 👋\n\n" +
			"Two ways to start a call:\n\n" +
			`📲 <b>Inline</b> — type <code>@${username}</code> in any chat, pick the result — invite sent.\n\n` +
			"🔗 <b>Here</b> — /sozvon creates a link right here for you to share.\n\n" +
			`🌐 <a href=\"${siteUrl}\">${siteHost}</a>`,
		helpText: (username) =>
			"<b>Help</b>\n\n" +
			`📲 <b>Inline</b> — <code>@${username}</code> in any chat\n` +
			"🔗 <b>Command</b> — /sozvon creates a link here\n\n" +
			`🌐 <a href=\"${siteUrl}\">${siteHost}</a>`,
		aboutText: (username) =>
			"👋 Hey! I'm the <b>sozvon</b> bot.\n\n" +
			"Free private calls for you and your friends — anytime. " +
			"Screen sharing, streaming games — it handles everything!\n\n" +
			`📲 Type <code>@${username}</code> in any chat and pick the result — call is ready!\n` +
			`🤖 <a href="https://t.me/${username}">Open the bot</a>\n\n` +
			`🌐 <a href=\"${siteUrl}\">${siteHost}</a>`,
		inlineAboutTitle: "About the bot",
		inlineAboutDescription: "Free private calls, screen sharing and streaming",
	},
};

export function getLocale(languageCode) {
	if (languageCode && languageCode.startsWith("ru")) {
		return locales.ru;
	}
	return locales.en;
}
