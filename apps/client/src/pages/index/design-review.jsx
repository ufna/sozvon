import { runInAction } from "mobx";
import React, { useEffect, useState } from "react";

import Brand from "@/components/brand.jsx";
import Icon from "@/components/icon.jsx";
import { RoomData } from "@/data/room-data.js";
import root from "@/data/root-data.js";
import { UserData } from "@/data/user-data.js";
import { applyPalette, getPalette } from "@/utils/palette.js";

import styles from "./design-review.module.css";
import { Conference, MenuPage, setDesignController } from "./page.jsx";

const views = [ [ "home", "Главная" ], [ "lobby", "Вход" ], [ "call", "Комната" ], [ "mobile", "Мобильный" ], [ "brand", "Логотип" ] ];
const validViews = views.map(([ id ]) => id);

function prepareRoom(entered) {
	const requestedPeople = Number(new URLSearchParams(location.search).get("people"));
	const people = Number.isInteger(requestedPeople) && requestedPeople >= 1 && requestedPeople <= 4 ? requestedPeople : 4;
	const room = new RoomData();
	room.deserialize({
		roomId: "design-preview", state: "connected", entered,
		myIdentity: "preview-anna", hasCamera: true, hasScreencast: true, canSwapCamera: true,
		microphone: entered, camera: false,
		users: [
			{ identity: "preview-anna", name: root.settings.displayName || "Анна Морозова", main: true, connected: true, microphone: entered },
			{ identity: "preview-misha", name: "Миша Волков", connected: true, microphone: true, speaking: true },
			{ identity: "preview-katya", name: "Катя Белова", connected: true, microphone: false },
			{ identity: "preview-dan", name: "Даня Лебедев", connected: true, microphone: true },
		].slice(0, people),
		messages: [
			{ identity: "preview-misha", text: "Всем привет! Рад вас видеть 👋", timestamp: new Date(2026, 9, 26, 14, 30).getTime() },
			{ identity: "preview-katya", text: "Привет! Сейчас включу микрофон.", timestamp: new Date(2026, 9, 26, 14, 30).getTime() },
			{ identity: "preview-anna", text: "Давайте обсудим новые идеи. У меня как раз есть пара!", timestamp: new Date(2026, 9, 26, 14, 31).getTime() },
		],
	});
	runInAction(() => {
		root.room = room;
		if (entered && new URLSearchParams(location.search).get("layout") === "expanded") room.maximized = [ "preview-misha", "personality" ];
	});
	function toggle(field) {
		runInAction(() => {
			room[field] = !room[field]; room.users[0][field] = room[field]; room.usersTrigger++;
		});
	}
	const noop = async() => {};
	return {
		room: null,
		toggleMicrophone: () => toggle("microphone"),
		toggleCamera: () => toggle("camera"),
		toggleScreencast: () => toggle("screencast"),
		publishMicrophone: async() => {
			if (!room.microphone) toggle("microphone");
		},
		publishCamera: async() => {
			if (!room.camera) toggle("camera");
		},
		sendMessage: (text) => runInAction(() => {
			room.messages.push({ identity: room.myIdentity, text, timestamp: Date.now() }); room.messagesTrigger++;
		}),
		sendName: noop, setVideoHint: noop, swapCamera: noop,
		getDevices: async() => ({ microphone: [], camera: [], speaker: [] }),
		switchMicrophoneDevice: noop, switchCameraDevice: noop, switchSpeakerDevice: noop,
		switchMicrophonePreset: noop, switchCameraPreset: noop, switchScreencastPreset: noop,
		applyBackgroundBlur: noop, updateIncomingVideo: noop,
	};
}

function LogoGallery() {
	return <div className={styles.gallery}>
		<div className={styles.gallery_header}><Brand /></div>
		<div className={styles.logo_canvas}><img src="/brand/v2/zov-mark.svg" width="128" height="128" alt="sozvon" /></div>
		<p>sozvon · Zov</p>
		<div className={styles.downloads}><a href="/brand/v2/zov-mark.svg" download>SVG ↓</a><a href="/brand/v2/zov-mark.png" download>PNG ↓</a></div>
	</div>;
}

function MobileReview({ palette }) {
	const [ screen, setScreen ] = useState(() => new URLSearchParams(location.search).get("screen") === "lobby" ? "lobby" : "call");
	const people = new URLSearchParams(location.search).get("people") || "4";
	return <div className={styles.mobile_review}>
		<div className={styles.mobile_screens} role="group" aria-label="Экран на телефоне"><button aria-pressed={screen === "lobby"} onClick={() => setScreen("lobby")}>Вход</button><button aria-pressed={screen === "call"} onClick={() => setScreen("call")}>Комната</button></div>
		<div className={styles.mobile_device}><iframe key={screen} title="Мобильный интерфейс" src={`/design?embed=1&view=${screen}&theme=${palette}&people=${encodeURIComponent(people)}`} /></div>
	</div>;
}

export default function DesignReview() {
	const embedded = new URLSearchParams(location.search).has("embed");
	const [ palette, setPalette ] = useState(getPalette);
	useEffect(() => {
		applyPalette(palette);
	}, [ palette ]);
	const [ view, setView ] = useState(() => {
		const query = new URLSearchParams(location.search).get("view");
		return validViews.includes(query) ? query : "home";
	});
	useEffect(() => {
		const originalLanguage = root.settings.language;
		const originalTitle = document.title;
		document.title = "sozvon";
		runInAction(() => {
			root.settings.language = "ru";
		});
		return () => {
			runInAction(() => {
				root.settings.language = originalLanguage; document.title = originalTitle;
			});
		};
	}, []);
	useEffect(() => {
		if (view === "call" || view === "lobby") setDesignController(prepareRoom(view === "call"));
		return () => {
			setDesignController(null); runInAction(() => {
				root.room = null;
			});
		};
	}, [ view ]);
	useEffect(() => {
		function onPop() {
			const query = new URLSearchParams(location.search).get("view");
			setView(validViews.includes(query) ? query : "home");
			setPalette(getPalette());
		}
		window.addEventListener("popstate", onPop);
		return () => window.removeEventListener("popstate", onPop);
	}, []);
	function navigate(id) {
		setView(id);
		const params = new URLSearchParams(location.search);
		params.set("view", id);
		history.pushState(null, "", `/design?${params}`);
	}
	return <div className={styles.review}>
		{!embedded && <header className={styles.review_bar}><nav aria-label="Экраны редизайна">{views.map(([ id, title ]) => <button key={id} aria-current={view === id ? "page" : undefined} onClick={() => navigate(id)}>{title}{id === "brand" && <span className={styles.counter}>3</span>}</button>)}</nav></header>}
		<div className={`${styles.stage} ${embedded ? styles.stage_embedded : ""}`}>
			{view === "home" && <MenuPage onCreatePreview={() => navigate("lobby")} onReturnPreview={new URLSearchParams(location.search).has("return") ? () => navigate("lobby") : undefined} />}
			{(view === "call" || view === "lobby") && <Conference key={view} preview />}
			{view === "brand" && <LogoGallery palette={palette} />}
			{view === "mobile" && <MobileReview palette={palette} />}
		</div>
		{(view === "call" || view === "lobby") && <span className={styles.demo_note} title="Камера и звук имитируются">Демо</span>}
	</div>;
}
