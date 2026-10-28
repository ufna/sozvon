# sozvon Telegram bot

Optional grammY bot on Node 24. Russian invitations use Созвон! at
`sozvon.now`; English invitations use Go Voice! at `govoice.now`. The localized
commands are `/sozvon` and `/govoice`; both are accepted in every locale. Enable inline mode through BotFather.

Run `npm ci --ignore-scripts`, copy `.env.example` to `.env`, set BOT_TOKEN and,
for self-hosting, SITE_URL (your client HTTP(S) origin for both languages), then run `npm run dev`.
Starting the bot updates its Telegram profile and commands, then starts polling.
Do not run a second instance with a production token. Tests and syntax checks
(`npm test`, `npm run lint`) work without tokens and send no messages.
Keep tokens and rollout in private ops. Docker build context is this directory.
Inline results use the client favicon, preserving the shared sozvon logo.
