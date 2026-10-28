import React from "react";

const paths = {
	chevronDown: <path d="m6 9 6 6 6-6" />,
	edit: <><path d="m16 3 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14l-1 7Z" /></>,
	arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
	video: <><rect x="3" y="5" width="12" height="14" rx="3" /><path d="m15 9 6-3v12l-6-3" /></>,
	videoOff: <><path d="M15 9V7a2 2 0 0 0-2-2H9M3 5v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2M15 9l6-3v12l-3-1.5M3 3l18 18" /></>,
	screen: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M12 17v4M8 21h8" /></>,
	volume: <><path d="m11 4-5 4H3v8h3l5 4V4ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></>,
	volumeOff: <><path d="m11 4-5 4H3v8h3l5 4V4ZM16 9l5 6M16 15l5-6" /></>,
	phoneDown: <><path d="M4 15a2 2 0 0 1-2-2l.5-2.5C3.8 7.2 20.2 7.2 21.5 10.5L22 13a2 2 0 0 1-2 2l-3-1v-3a18 18 0 0 0-10 0v3l-3 1Z" /></>,
	more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
	link: <><path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(1 0) scale(.9)" /></>,
	shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6l8-3Z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
	mic: <><rect x="9" y="2" width="6" height="13" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" /></>,
	micOff: <><path d="M9 9v3a3 3 0 0 0 5 2M9 5a3 3 0 0 1 6 0v4M5 10v2a7 7 0 0 0 12 5M19 10v2M12 19v3M8 22h8M3 3l18 18" /></>,
	chat: <path d="M20 14a4 4 0 0 1-4 4H9l-6 3V7a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4v7Z" />,
	close: <path d="m6 6 12 12M6 18 18 6" />,
	plus: <path d="M12 5v14M5 12h14" />,
	check: <path d="m5 12 4 4L19 6" />,
	settings: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" /><circle cx="15" cy="17" r="3" /></>,
	users: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M21 21v-2a6 6 0 0 0-4-5" /></>,
};

export default function Icon({ name, size = 20 }) {
	return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.arrow}</svg>;
}
