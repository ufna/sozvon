import { Bot, InlineKeyboard } from "grammy";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

import { config } from "./config.js";
import { getLocale, locales } from "./i18n.js";
import { updateProfileField } from "./profile.js";

const bot = new Bot(config.botToken);

// Inline mode: user types @botname [topic] in any chat
bot.on("inline_query", async (ctx) => {
	const query = ctx.inlineQuery.query.trim();
	const locale = getLocale(ctx.from.language_code);
	console.log("[inline] query received");

	const topic = escapeHtml(query);
	const roomId = randomUUID();
	const roomUrl = `${locale.siteUrl}/${roomId}`;

	const { username } = ctx.me;

	try {
		await ctx.answerInlineQuery(
			[
				{
					type: "article",
					id: roomId,
					title: locale.inlineTitle(topic),
					description: locale.inlineDescription,
					thumbnail_url: `${locale.siteUrl}/favicon.png?v=2`,
					thumbnail_width: 256,
					thumbnail_height: 256,
					input_message_content: {
						message_text: `${locale.messageHeader(topic)}\n\n${locale.messageBody(roomUrl)}`,
						parse_mode: "HTML",
					},
					reply_markup: new InlineKeyboard().url(locale.buttonLabel, roomUrl),
				},
				{
					type: "article",
					id: "about",
					title: locale.inlineAboutTitle,
					description: locale.inlineAboutDescription,
					thumbnail_url: `${locale.siteUrl}/favicon.png?v=2`,
					thumbnail_width: 256,
					thumbnail_height: 256,
					input_message_content: {
						message_text: locale.aboutText(username),
						parse_mode: "HTML",
					},
				},
			],
			{ cache_time: 0 },
		);
		console.log(`[inline] answered ok, roomId=${roomId}`);
	} catch (e) {
		console.error("[inline] answerInlineQuery error:", e.message);
	}
});

bot.command("start", (ctx) => {
	const locale = getLocale(ctx.from.language_code);
	ctx.reply(locale.startText(ctx.me.username), { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
});

bot.command("help", (ctx) => {
	const locale = getLocale(ctx.from.language_code);
	ctx.reply(locale.helpText(ctx.me.username), { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
});

bot.command("about", (ctx) => {
	const locale = getLocale(ctx.from.language_code);
	ctx.reply(locale.aboutText(ctx.me.username), { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
});

// Both commands create a room using the sender's localized service.
bot.command("sozvon", (ctx) => createRoom(ctx, getLocale(ctx.from.language_code)));

// English command alias.
bot.command("govoice", (ctx) => createRoom(ctx, getLocale(ctx.from.language_code)));

async function createRoom(ctx, locale) {
	const roomId = randomUUID();
	const roomUrl = `${locale.siteUrl}/${roomId}`;
	console.log("[room] created");
	await ctx.reply(
		`${locale.messageHeader("")}\n\n${locale.messageBody(roomUrl)}`,
		{
			parse_mode: "HTML",
			reply_markup: new InlineKeyboard().url(locale.buttonLabel, roomUrl),
			link_preview_options: { is_disabled: true },
		},
	);
}

bot.catch((err) => {
	console.error("Bot error:", err);
});

async function setupProfile(api) {
	const { username } = await api.getMe();
	const call = updateProfileField;
	for (const [language_code, name] of [["ru", "Созвон!"], ["en", "Go Voice!"], [undefined, "Go Voice!"]]) {
		await call(async () => {
			const options = language_code ? { language_code } : {};
			if ((await api.getMyName(options)).name !== name) await api.setMyName(name, options);
		});
	}

	await call(() => api.setMyShortDescription("Голосовые звонки прямо из любого чата", { language_code: "ru" }));
	await call(() => api.setMyShortDescription("Voice calls right from any chat", { language_code: "en" }));
	await call(() => api.setMyShortDescription("Voice calls right from any chat"));

	await call(() => api.setMyDescription(locales.ru.profileDescription, { language_code: "ru" }));
	await call(() => api.setMyDescription(locales.en.profileDescription, { language_code: "en" }));
	await call(() => api.setMyDescription(locales.en.profileDescription));

	await call(() => api.setMyCommands(
		[
			{ command: "sozvon", description: "Создать созвон и получить ссылку" },
			{ command: "about", description: "О боте" },
			{ command: "start", description: "Начало работы" },
			{ command: "help", description: "Помощь" },
		],
		{ language_code: "ru" },
	));
	const enCommands = [
		{ command: "govoice", description: "Create a call and get a link" },
		{ command: "about", description: "About the bot" },
		{ command: "start", description: "Get started" },
		{ command: "help", description: "Help" },
	];
	await call(() => api.setMyCommands(enCommands, { language_code: "en" }));
	await call(() => api.setMyCommands(enCommands));

	console.log(`Bot profile setup complete (@${username}); rate-limited updates retry in the background`);
}

async function start() {
	try {
		await setupProfile(bot.api);
		await bot.start({ onStart: () => { writeFileSync("/tmp/voice-bot-ready", "ready"); console.log("Bot polling ready"); } });
	} catch (err) {
		if (err.error_code === 409) {
			console.warn("409 conflict — another instance is polling, retrying in 35s...");
			await new Promise((r) => setTimeout(r, 35_000));
			return start();
		}
		throw err;
	}
}

process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());
start().catch((error) => { console.error("Bot startup failed:", error.message); process.exitCode = 1; });

function escapeHtml(text) {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}
