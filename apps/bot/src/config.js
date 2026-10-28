import dotenv from "dotenv";

dotenv.config({ quiet: true });

if (!process.env.BOT_TOKEN) {
	throw new Error("BOT_TOKEN is required");
}

export const config = {
	botToken: process.env.BOT_TOKEN,
};
