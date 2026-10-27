
import "@fortawesome/fontawesome-free/css/all.css";

import { BackgroundBlur, supportsBackgroundProcessors } from "@livekit/track-processors";
import { ConnectionState, LocalVideoTrack, Track } from "livekit-client";
import { runInAction } from "mobx";
import React, { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";

import Brand from "@/components/brand.jsx";
import Icon from "@/components/icon.jsx";
import SettingsPopup from "@/components/popups/settings-popup.jsx";
import appConfig from "@/config.js";
import { BACKGROUND_BLUR_RADIUS } from "@/constants.js";
import { LiveKitRoomController } from "@/controllers/livekit-room-controller.js";
import { P2PRoomController } from "@/controllers/p2p-room-controller.js";
import root from "@/data/root-data.js";
import { copyText } from "@/utils/clipboard.js";
import { useData } from "@/utils/data-hook.js";
import { jsonFetch } from "@/utils/fetch.js";
import { getLocale, t } from "@/utils/locale.js";
import { generateRoboName } from "@/utils/user-generator.js";
import { cn, isEmpty, isValid } from "@/utils/utils.js";

import styles from "./page.module.css";

let controller = null;
const DesignReview = lazy(() => import("./design-review.jsx"));

function homePath(preview) {
	if (!preview) return "/";
	const params = new URLSearchParams(location.search);
	params.delete("view");
	return `/design?${params}`;
}

export function setDesignController(value) {
	controller = value;
}

const USER_MODE = {
	default: "default",
	minimized: "minimized",
	maximized: "maximized",
};

const USER_VIDEO_MODE = {
	camera: "camera",
	screencast: "screencast",
};

const USER_CHANNEL = {
	personality: "personality",
	screencast: "screencast",
};

function ConferenceDefaultLayout({ users, onEnterTheater, preview = false }) {
	const array = [];
	users.filter((user) => user.connected).forEach((user) => {
		if (!user.screencast) {
			array.push(<ConferenceUser preview={preview} key={user.identity} data={user} mode={USER_MODE.default} channel={USER_CHANNEL.personality} onEnterTheater={onEnterTheater} />);
		} else {
			if (user.camera) {
				array.push(<ConferenceUser preview={preview} key={user.identity} data={user} mode={USER_MODE.default} channel={USER_CHANNEL.personality} onEnterTheater={onEnterTheater} />);
				array.push(<ConferenceUser preview={preview} key={user.identity + "-screencast"} data={user} mode={USER_MODE.default} channel={USER_CHANNEL.screencast} onEnterTheater={onEnterTheater} />);
			} else {
				array.push(<ConferenceUser preview={preview} key={user.identity + "-screencast"} data={user} mode={USER_MODE.default} channel={USER_CHANNEL.screencast} forceMicrophone={true} onEnterTheater={onEnterTheater} />);
			}
		}
	});


	const hasVideo = useData(() => users.some((user) => user.connected && (user.camera || user.screencast)), [ users ]);
	const [ layout, setLayout ] = useState(null);
	const ref = useRef(null);

	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;

		function update() {
			if (el.clientWidth === 0 || el.clientHeight === 0) return;
			const mobile = window.matchMedia("(max-width: 640px)").matches;
			const ratio = mobile ? 3 / 4 : hasVideo ? 16 / 9 : 4 / 3;
			setLayout(computeGrid(el.clientWidth, el.clientHeight, array.length, ratio, mobile ? 8 : 12));
		}

		update();
		const observer = new ResizeObserver(update);
		observer.observe(el);
		return () => observer.disconnect();
	}, [ array.length, hasVideo ]);

	return <div className={styles.conference_layout_default} ref={ref}>
		<div className={styles.conference_grid} role="group" aria-label={t("conference.participants")} style={layout ? { "--cols": layout.columns, "--tile-width": `${layout.width}px`, "--tile-height": `${layout.height}px` } : undefined}>
			{array}
		</div>
	</div>;
}

function computeGrid(containerWidth, containerHeight, count, ratio, gap) {
	let best = { columns: 1, width: 0, height: 0 };
	let bestArea = -1;
	let bestRows = Infinity;
	for (let columns = 1; columns <= Math.max(1, count); columns++) {
		const rows = Math.ceil(count / columns);
		const width = Math.max(0, Math.min(containerWidth / columns - gap, (containerHeight / Math.max(1, rows) - gap) * ratio));
		const area = width * width / ratio;
		if (area > bestArea + 1 || Math.abs(area - bestArea) <= 1 && rows < bestRows) {
			// Round down to the browser's layout precision so the last card never wraps by a fraction.
			const fittedWidth = Math.floor(width * 64) / 64;
			best = { columns, width: fittedWidth + gap, height: fittedWidth / ratio + gap };
			bestArea = area;
			bestRows = rows;
		}
	}
	return best;
}

function ConferenceFullscreenLayout({ users, maximizedUser, maximizedChannel, theater, onTheater, preview = false }) {
	const savedHeight = useData(() => root.settings.participantsPanelHeight);
	const layoutRef = useRef(null);
	const resizeRef = useRef(null);
	const [ layoutHeight, setLayoutHeight ] = useState(() => window.innerHeight);
	const [ resizing, setResizing ] = useState(false);
	const maxHeight = Math.max(112, Math.min(260, Math.floor(layoutHeight * 0.35)));
	const panelHeight = Math.min(maxHeight, Math.max(96, Number.isFinite(savedHeight) ? savedHeight : 128));
	useEffect(() => {
		const el = layoutRef.current;
		const observer = new ResizeObserver(() => setLayoutHeight(el.clientHeight));
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	function resizePanel(height, persist = false) {
		runInAction(() => {
			root.settings.participantsPanelHeight = Math.min(maxHeight, Math.max(96, Math.round(height)));
			if (persist) root.settings.save();
		});
	}

	function startResize(e) {
		if (e.button !== 0) return;
		e.preventDefault();
		resizeRef.current = { y: e.clientY, height: panelHeight };
		e.currentTarget.setPointerCapture(e.pointerId);
		setResizing(true);
	}

	function moveResize(e) {
		if (resizeRef.current) resizePanel(resizeRef.current.height + e.clientY - resizeRef.current.y);
	}

	function endResize(e) {
		if (!resizeRef.current) return;
		resizePanel(resizeRef.current.height + e.clientY - resizeRef.current.y, true);
		resizeRef.current = null;
		setResizing(false);
		if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
	}

	function onResizeKey(e) {
		const values = { ArrowUp: panelHeight - 16, ArrowDown: panelHeight + 16, Home: 96, End: maxHeight };
		if (!(e.key in values)) return;
		e.preventDefault(); e.stopPropagation(); resizePanel(values[e.key], true);
	}

	const array = [];
	users.filter((user) => user.connected && user.identity !== maximizedUser.identity).forEach((user) => {
		if (!user.screencast) {
			array.push(<ConferenceUser preview={preview} key={user.identity} data={user} mode={USER_MODE.minimized} channel={USER_CHANNEL.personality} />);
		} else {
			if (user.camera) {
				array.push(<ConferenceUser preview={preview} key={user.identity} data={user} mode={USER_MODE.minimized} channel={USER_CHANNEL.personality} />);
				array.push(<ConferenceUser preview={preview} key={user.identity + "-screencast"} data={user} mode={USER_MODE.minimized} channel={USER_CHANNEL.screencast} />);
			} else {
				array.push(<ConferenceUser preview={preview} key={user.identity + "-screencast"} data={user} mode={USER_MODE.minimized} channel={USER_CHANNEL.screencast} forceMicrophone={true} />);
			}
		}
	});

	return <div className={styles.conference_layout_fullscreen} ref={layoutRef} style={{ "--participants-height": `${panelHeight}px` }}>
		<div className={styles.conference_layout_fullscreen_list} role="group" aria-label={t("conference.participants")}>
			<ConferenceUser preview={preview} key={maximizedUser.identity} data={maximizedUser} mode={USER_MODE.minimized} channel={maximizedChannel === USER_CHANNEL.screencast ? USER_CHANNEL.personality : USER_CHANNEL.screencast} />
			{array}
		</div>
		<div className={styles.participants_resize} data-resizing={resizing} data-no-driving-gesture role="separator" aria-orientation="horizontal" aria-label={t("conference.resize_participants")} title={t("conference.resize_participants")} aria-valuemin={96} aria-valuemax={maxHeight} aria-valuenow={panelHeight} tabIndex={0} onPointerDown={startResize} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={() => {
			resizeRef.current = null; setResizing(false); resizePanel(panelHeight, true);
		}} onLostPointerCapture={() => {
			resizeRef.current = null; setResizing(false);
		}} onKeyDown={onResizeKey} onDoubleClick={() => resizePanel(128, true)} />
		<div className={styles.conference_layout_fullscreen_main}>
			<ConferenceUser preview={preview} key={maximizedUser.identity} data={maximizedUser} mode={USER_MODE.maximized} channel={maximizedChannel} theater={theater} onTheater={onTheater} />
		</div>
	</div>;
}

function EditableName({ name, onSave }) {
	const [ editing, setEditing ] = useState(false);
	const [ draft, setDraft ] = useState(name);
	const inputRef = useRef(null);

	useEffect(() => {
		setDraft(name);
	}, [ name ]);

	useEffect(() => {
		if (editing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [ editing ]);

	function commit() {
		const trimmed = draft.trim();
		if (trimmed && trimmed !== name) {
			onSave(trimmed);
		} else {
			setDraft(name);
		}
		setEditing(false);
	}

	function onKeyDown(e) {
		if (e.key === "Enter") {
			e.preventDefault();
			commit();
		} else if (e.key === "Escape") {
			setDraft(name);
			setEditing(false);
		}
	}

	return <span className={styles.conference_user_name_field} data-editing={editing}>
		<button type="button" className={styles.conference_user_name_editable} aria-label={t("conference.edit_name")} title={t("conference.edit_name")} aria-hidden={editing} tabIndex={editing ? -1 : 0} onClick={() => setEditing(true)}>
			<span>{name}</span>
			<span className={styles.conference_user_name_pencil}><Icon name="edit" size={14} /></span>
		</button>
		{editing && <input
			ref={inputRef}
			className={styles.conference_user_name_input}
			aria-label={t("conference.your_name")}
			value={draft}
			maxLength={30}
			onChange={(e) => setDraft(e.target.value)}
			onBlur={commit}
			onKeyDown={onKeyDown}
		/>}
	</span>;
}

function ConferenceUserEntrance({ data, preview = false }) {

	const displayName = useData(() => root.settings.displayName);
	const name = displayName || data.name || generateRoboName(data.identity);
	const [ mediaInProgress, setMediaInProgress ] = useState(false);

	const videoRef = useRef(null);

	const previewCamera = useData(() => data.previewCamera, [ data ]);
	const canSwapCamera = useData(() => root.room?.canSwapCamera);
	const mirrorCamera = useData(() => root.settings.mirrorCamera);
	const cameraDeviceId = useData(() => root.cameraDeviceId);
	const backgroundBlur = useData(() => root.settings.backgroundBlur);

	useEffect(() => {
		if (!previewCamera || preview) return;

		let cancelled = false;
		let localTrack = null;

		async function startPreview() {
			const videoConstraints = {};
			if (!isEmpty(cameraDeviceId)) {
				videoConstraints.deviceId = { exact: cameraDeviceId };
			}

			const stream = await navigator.mediaDevices.getUserMedia({ video: isEmpty(cameraDeviceId) ? true : videoConstraints, audio: false });
			if (cancelled) {
				stream.getTracks().forEach((t) => t.stop());
				return;
			}

			localTrack = new LocalVideoTrack(stream.getVideoTracks()[0]);

			const blurRadius = BACKGROUND_BLUR_RADIUS[backgroundBlur] || 0;
			if (blurRadius > 0) {
				await localTrack.setProcessor(BackgroundBlur(blurRadius));
			}

			if (cancelled) {
				localTrack.stop();
				return;
			}

			localTrack.attach(videoRef.current);
			setMediaInProgress(true);
		}

		startPreview();

		return () => {
			cancelled = true;
			if (isValid(localTrack)) {
				localTrack.detach();
				localTrack.stop();
			}

			setMediaInProgress(false);

			if (isValid(videoRef.current)) {
				videoRef.current.srcObject = null;
			}
		};
	}, [ previewCamera, cameraDeviceId, backgroundBlur, preview ]);

	async function onSwapCamera() {
		await controller?.swapCamera();
		runInAction(() => {
			data.previewCamera = false;
		});
		setTimeout(() => runInAction(() => {
			data.previewCamera = true;
		}), 100);
	}

	return <div className={styles.conference_lobby}>
		<div className={cn(styles.conference_user_container, styles.conference_user_container_entrance)}>
			<div className={styles.conference_user} role="group" aria-label={t("conference.preview")}>
				<div className={styles.conference_user_video_container}>
					<video style={mirrorCamera && mediaInProgress ? { transform: "scaleX(-1)" } : null} autoPlay={true} playsInline={true} ref={videoRef} />
				</div>
				<div className={cn(styles.conference_user_avatar, mediaInProgress ? styles.conference_user_avatar_video : null)}>
					<img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.identity)}`} alt="" />
				</div>
				<div className={cn(styles.conference_user_name, mediaInProgress ? styles.conference_user_name_video : null)}>
					<EditableName name={name} onSave={(newName) => {
						runInAction(() => {
							root.settings.displayName = newName;
							root.settings.save();
							const user = root.room?.users?.find((u) => u.main);
							if (user) user.name = newName;
						});
					}} />
				</div>
				{canSwapCamera && previewCamera && <button className={cn(styles.conference_user_control_button, styles.lobby_swap_camera)} aria-label={t("tooltip.swap_camera")} title={t("tooltip.swap_camera")} onClick={onSwapCamera}><i className="fa-solid fa-arrows-rotate"></i></button>}
			</div>
		</div>
		<ConferenceUserEntranceButtons data={data} preview={preview} />
	</div>;
}

function ConferenceUserEntranceButtons({ data, preview = false }) {
	const room = useData(() => root.room);
	const hasCamera = useData(() => root.room?.hasCamera, [ room ]);

	const [ microphone, setMicrophone ] = useState(false);
	const [ camera, setCamera ] = useState(false);
	const [ status, setStatus ] = useState(0);
	const [ settingsOpen, setSettingsOpen ] = useState(false);

	async function updateStatus() {
		if (status === 0) {
			if (isValid(controller?.room)) {
				setStatus(1);
				await controller.room.startAudio();
				setStatus(2);
			}
		}
	}

	function onEnter() {
		updateStatus().then(async() => {
			runInAction(() => {
				root.room.entered = true;
			});

			if (microphone) {
				await controller.publishMicrophone();
			}

			if (camera) {
				await controller.publishCamera();
			}
		});
	}

	function onToggleMicrophone() {
		updateStatus().then(() => {
			setMicrophone(!microphone);
		});
	}

	function onToggleCamera() {
		updateStatus().then(() => {
			runInAction(() => {
				data.previewCamera = !data.previewCamera;
			});
			document.dispatchEvent(new Event("applicationTogglePreviewVideo"));
			setCamera(!camera);
		});
	}

	const onToggleMicrophoneRef = useRef(onToggleMicrophone);
	onToggleMicrophoneRef.current = onToggleMicrophone;
	const onToggleCameraRef = useRef(onToggleCamera);
	onToggleCameraRef.current = onToggleCamera;

	useEffect(() => {
		function onKeyDown(e) {
			if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
			const notTyping = !document.activeElement.closest("input, textarea, select, [role=dialog]");
			if (e.code === "Space" && notTyping && !document.activeElement.closest("button, summary")) {
				e.preventDefault();
				onToggleMicrophoneRef.current();
			}
			if (e.code === "KeyV" && notTyping) {
				e.preventDefault();
				onToggleCameraRef.current();
			}
		}
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, []);

	return <div className={styles.conference_user_entrance_buttons} role="group" aria-label={t("conference.controls")}>
		<button className={cn(styles.conference_button)} aria-pressed={!!microphone} onClick={onToggleMicrophone} aria-label={t("settings.microphone")} data-tooltip={t("settings.microphone")} data-shortcut="Space">
			<Icon name={microphone ? "mic" : "micOff"} size={22} />
		</button>
		{ hasCamera ? <div className={styles.conference_entrance_camera}>
			<button className={cn(styles.conference_button)} aria-pressed={!!camera} onClick={onToggleCamera} aria-label={t("settings.camera")} data-tooltip={t("settings.camera")} data-shortcut="V">
				<Icon name={camera ? "video" : "videoOff"} size={22} />
			</button>
		</div> : null }
		<button className={cn(styles.conference_button)} onClick={() => setSettingsOpen(!settingsOpen)} aria-label={t("settings.title")} data-tooltip={t("settings.title")}>
			<Icon name="settings" size={22} />
		</button>
		<button className={cn(styles.conference_entrance_button, styles.conference_button_green)} onClick={onEnter}>
			<i className="fa-solid fa-phone"></i>
			<div className={styles.conference_entrance_button_text}>
				{t("conference.join")}
			</div>
		</button>
		<button className={cn(styles.conference_button, styles.conference_button_red)} onClick={() => location.href = homePath(preview)} aria-label={t("tooltip.leave")} data-tooltip={t("tooltip.leave")}>
			<Icon name="phoneDown" size={23} />
		</button>
		{ settingsOpen ? <SettingsPopup controller={controller} onClose={() => setSettingsOpen(false)} /> : null }
	</div>;
}

function ConferenceUser({ data, mode = USER_MODE.default, channel = USER_CHANNEL.personality, forceMicrophone = false, theater = false, onTheater, onEnterTheater, preview = false }) {

	const userName = useData(() => data.name, [ data ]) || generateRoboName(data.identity);
	const [ mediaInProgress, setMediaInProgress ] = useState(false);
	const [ mediaSourceInProgress, setMediaSourceInProgress ] = useState(null);

	const audioContainerRef = useRef(null);
	const videoRef = useRef(null);
	const videoContainerRef = useRef(null);

	const room = useData(() => root.room);
	const state = useData(() => room?.state, [ room ]);
	const main = useData(() => data.main || false, [ data ]);
	const speaking = useData(() => data.speaking || false, [ data ]);

	const mirrorCamera = useData(() => root.settings.mirrorCamera);
	const masterVolume = useData(() => root.settings.masterVolume ?? 1);
	const userVolume = useData(() => root.settings.usersVolumes?.[data.identity] ?? 1);
	const effectiveVolume = Math.min(userVolume * masterVolume, 1);
	const speakerDeviceId = useData(() => root.speakerDeviceId);

	const microphone = useData(() => data.microphone || false, [ data ]);
	const camera = useData(() => data.camera || false, [ data ]);
	const screencast = useData(() => data.screencast || false, [ data ]);

	const microphoneSid = useData(() => data.microphoneSid, [ data ]);
	const cameraSid = useData(() => data.cameraSid, [ data ]);
	const screencastSid = useData(() => data.screencastSid, [ data ]);

	useEffect(() => {
		const connected = state === "connected";
		const microphoneEnabled = (channel === USER_CHANNEL.personality || forceMicrophone) && microphone;

		if (microphoneEnabled && connected && isValid(controller?.room)) {
			const participant = controller.room.remoteParticipants.get(data.identity);
			if (isValid(participant)) {
				const trackPublication = participant.getTrackPublications().filter((p) => p.source === Track.Source.Microphone && p.isEnabled).pop();
				const track = trackPublication?.track;

				if (isValid(track)) {
					const audio = document.createElement("audio");
					audio.autoplay = true;
					audio.playsInline = true;
					audio.volume = effectiveVolume;
					audio.dataset.trackSid = trackPublication.track.sid;

					if (!isEmpty(speakerDeviceId) && audio.setSinkId) {
						audio.setSinkId(speakerDeviceId).catch(() => {});
					}

					track.attach(audio);

					audioContainerRef.current?.appendChild(audio);

					return () => {
						track.detach(audio);
						audio.remove();
					};
				}
			}
		}
	}, [ microphone, microphoneSid, state, channel, effectiveVolume, speakerDeviceId ]);

	useEffect(() => {
		const container = audioContainerRef.current;
		if (!container) return;
		const audios = container.querySelectorAll("audio");
		audios.forEach((audio) => {
			audio.volume = effectiveVolume;
		});
	}, [ effectiveVolume ]);

	useEffect(() => {
		const container = audioContainerRef.current;
		if (!container) return;
		const audios = container.querySelectorAll("audio");
		audios.forEach((audio) => {
			if (audio.setSinkId) {
				audio.setSinkId(speakerDeviceId || "").catch(() => {});
			}
		});
	}, [ speakerDeviceId ]);

	useEffect(() => {
		const connected = state === "connected";
		const cameraEnabled = channel === USER_CHANNEL.personality && camera;
		const screencastEnabled = channel === USER_CHANNEL.screencast && screencast;

		if ((cameraEnabled || screencastEnabled) && connected && isValid(controller?.room)) {
			const participant = main ? controller.room.localParticipant : controller.room.remoteParticipants.get(data.identity);
			if (isValid(participant)) {
				const cameraPublication = cameraEnabled ? participant.getTrackPublications().filter((p) => p.source === Track.Source.Camera && p.isEnabled).pop() : null;
				const screencastPublication = screencastEnabled ? participant.getTrackPublications().filter((p) => p.source === Track.Source.ScreenShare && p.isEnabled).pop() : null;

				const mainTrackPublication = screencastPublication || cameraPublication;

				const mainTrack = mainTrackPublication?.track;
				if (isValid(mainTrack)) {
					videoRef.current.dataset.trackSid = mainTrack.sid;
					mainTrack.attach(videoRef.current);
					setMediaInProgress(true);
					setMediaSourceInProgress(mainTrackPublication.source);

					return () => {
						setMediaInProgress(false);
						setMediaSourceInProgress(null);

						if (isValid(mainTrack)) {
							mainTrack.detach();
						}

						if (isValid(videoRef.current)) {
							videoRef.current.dataset.trackSid = null;
						}
					};
				}
			}
		}
	}, [ screencast, camera, state, channel, cameraSid, screencastSid ]);

	useEffect(() => {
		const container = videoRef.current;
		const source = mediaSourceInProgress;

		function sendHint() {
			controller?.setVideoHint(data.identity, source, container.clientWidth, container.clientHeight);
		}

		if (isValid(container) && isValid(mediaSourceInProgress)) {
			const observer = new ResizeObserver(sendHint);
			observer.observe(container);
			sendHint();

			return () => {
				observer.disconnect();
				controller?.setVideoHint(data.identity, source, 0, 0);
			};
		}
	}, [ mediaSourceInProgress ]);

	function onMaximize() {
		runInAction(() => {
			if (mediaInProgress || preview) {
				root.room.maximized = [ data.identity, channel ];
			}
		});
	}

	function onMinimized() {
		runInAction(() => {
			root.room.maximized = null;
		});
	}

	const [ volumeOpen, setVolumeOpen ] = useState(false);

	function onVolumeChange(e) {
		const value = parseFloat(e.target.value);
		runInAction(() => {
			root.settings.usersVolumes[data.identity] = value;
			root.settings.save();
		});
	}

	let additiveClass = styles.conference_user_container_default;
	if (mode === USER_MODE.minimized) {
		additiveClass = styles.conference_user_container_minimized;
	} else if (mode === USER_MODE.maximized) {
		additiveClass = styles.conference_user_container_maximized;
	}

	return <div className={cn(styles.conference_user_container, additiveClass)}>
		<div className={cn(styles.conference_user, speaking ? styles.conference_user_speaking : null, main ? styles.conference_user_main : null)}>
			<div ref={audioContainerRef}></div>
			<div className={styles.conference_user_video_container} ref={videoContainerRef}>
				<video style={mirrorCamera && main && channel === USER_CHANNEL.personality && mediaInProgress ? { transform: "scaleX(-1)" } : null} autoPlay={true} playsInline={true} ref={videoRef} />
			</div>
			<div className={cn(styles.conference_user_avatar, mediaInProgress ? styles.conference_user_avatar_video : null)}>
				<img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.identity)}`} alt="" />
			</div>
			<div className={cn(styles.conference_user_name, mediaInProgress ? styles.conference_user_name_video : null, !main && userVolume < 0.1 ? styles.conference_user_name_muted : null)}>
				{ main ? <EditableName name={userName} onSave={(newName) => {
					runInAction(() => {
						root.settings.displayName = newName;
						root.settings.save();
						data.name = newName;
						root.room.usersTrigger += 1;
					});
					controller?.sendName(newName);
				}} /> : <div>{userName}</div> }
				{ microphone ? <i className="fa-solid fa-microphone"></i> : <i className="fa-solid fa-microphone-slash"></i> }
				{ !main && userVolume < 0.1 ? <i className="fa-solid fa-volume-xmark"></i> : null }
			</div>
			<div className={styles.conference_user_controls}>
				{ (mediaInProgress || preview) && mode !== USER_MODE.maximized ? <>
					<button aria-label={t("conference.maximize")} title={t("conference.maximize")} className={styles.conference_user_control_button} onClick={onMaximize}>
						<i className="fa-solid fa-maximize"></i>
					</button>
					{ mode === USER_MODE.default && onEnterTheater ? <button aria-label={t("conference.theater")} title={t("conference.theater")} className={styles.conference_user_control_button} onClick={() => onEnterTheater(data.identity, channel)}>
						<i className="fa-solid fa-expand"></i>
					</button> : null }
				</> : null }
				{ mode === USER_MODE.maximized ? <>
					<button aria-label={t("conference.minimize")} title={t("conference.minimize")} className={styles.conference_user_control_button} onClick={onMinimized}>
						<i className="fa-solid fa-minimize"></i>
					</button>
					<button aria-label={t("conference.theater")} title={t("conference.theater")} aria-pressed={theater} className={styles.conference_user_control_button} onClick={onTheater}>
						<i className={theater ? "fa-solid fa-compress" : "fa-solid fa-expand"}></i>
					</button>
				</> : null }
				{ !main ? <div className={styles.conference_user_volume}>
					<button className={cn(styles.conference_user_control_button, userVolume < 0.1 ? styles.conference_user_control_button_red : null)} aria-label={t("tooltip.volume")} onClick={() => setVolumeOpen(!volumeOpen)}>
						<i className={userVolume === 0 ? "fa-solid fa-volume-xmark" : userVolume < 1 ? "fa-solid fa-volume-low" : "fa-solid fa-volume-high"}></i>
					</button>
					{ volumeOpen ? <div className={styles.conference_user_volume_popup}>
						<input type="range" min="0" max="1" step="0.05" value={userVolume} onChange={onVolumeChange} aria-label={t("tooltip.volume")} className={styles.conference_user_volume_slider} />
					</div> : null }
				</div> : null }
			</div>
		</div>
	</div>;
}

const LINK_RE = /(https?:\/\/[^\s]+)/g;

function linkify(text) {
	const parts = text.split(LINK_RE);
	if (parts.length === 1) return text;
	return parts.map((part, i) => LINK_RE.test(part) ?
		<a key={i} href={part} target="_blank" rel="noopener noreferrer" className={styles.conference_chat_link}>{part}</a> :
		part,
	);
}

function ConferenceChat({ onClose, width, maxWidth, onResize }) {
	const room = useData(() => root.room);
	const trigger = useData(() => root.room?.messagesTrigger, [ room ]);
	const messages = useData(() => root.room?.messages || [], [ room ]);
	const myIdentity = useData(() => root.room?.myIdentity, [ room ]);
	const resizeRef = useRef(null);
	const [ resizing, setResizing ] = useState(false);
	const direction = document.documentElement.dir === "rtl" ? -1 : 1;

	function startResize(e) {
		if (e.button !== 0) return;
		e.preventDefault();
		resizeRef.current = { x: e.clientX, width };
		e.currentTarget.setPointerCapture(e.pointerId);
		setResizing(true);
	}

	function moveResize(e) {
		if (!resizeRef.current) return;
		onResize(resizeRef.current.width + (resizeRef.current.x - e.clientX) * direction);
	}

	function endResize(e) {
		if (!resizeRef.current) return;
		onResize(resizeRef.current.width + (resizeRef.current.x - e.clientX) * direction, true);
		resizeRef.current = null;
		setResizing(false);
		if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
	}

	function onResizeKey(e) {
		const values = { ArrowLeft: width + 24 * direction, ArrowRight: width - 24 * direction, Home: 280, End: maxWidth };
		if (!(e.key in values)) return;
		e.preventDefault();
		e.stopPropagation();
		onResize(values[e.key], true);
	}

	const [ text, setText ] = useState("");
	const scrollRef = useRef(null);
	const messagesEndRef = useRef(null);
	const thumbRef = useRef(null);
	const trackRef = useRef(null);
	const [ thumbState, setThumbState ] = useState({ height: 0, top: 0, visible: false });

	const textareaRef = useRef(null);
	const textareaThumbRef = useRef(null);
	const textareaTrackRef = useRef(null);
	const [ textareaThumbState, setTextareaThumbState ] = useState({ height: 0, top: 0, visible: false });

	function updateThumb() {
		const el = scrollRef.current;
		if (!el) return;
		const { scrollTop, scrollHeight, clientHeight } = el;
		if (scrollHeight <= clientHeight) {
			setThumbState({ height: 0, top: 0, visible: false });
		} else {
			const trackH = el.offsetHeight - 8;
			const ratio = clientHeight / scrollHeight;
			const thumbH = Math.max(ratio * trackH, 24);
			const maxTop = trackH - thumbH;
			const top = (scrollTop / (scrollHeight - clientHeight)) * maxTop;
			setThumbState({ height: thumbH, top, visible: true });
		}
	}

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		el.addEventListener("scroll", updateThumb, { passive: true });
		const observer = new ResizeObserver(updateThumb);
		observer.observe(el);
		return () => {
			el.removeEventListener("scroll", updateThumb);
			observer.disconnect();
		};
	}, []);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		requestAnimationFrame(updateThumb);
	}, [ trigger ]);

	function onThumbMouseDown(e) {
		e.preventDefault();
		const el = scrollRef.current;
		const startY = e.clientY;
		const startScroll = el.scrollTop;
		const { scrollHeight, clientHeight } = el;
		const trackH = el.offsetHeight - 8;
		const ratio = clientHeight / scrollHeight;
		const thumbH = Math.max(ratio * trackH, 24);
		const maxTop = trackH - thumbH;
		const scrollRange = scrollHeight - clientHeight;

		function onMouseMove(e) {
			const dy = e.clientY - startY;
			const scrollDelta = (dy / maxTop) * scrollRange;
			el.scrollTop = startScroll + scrollDelta;
		}

		function onMouseUp() {
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		}

		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
	}

	function onTrackClick(e) {
		if (e.target === thumbRef.current) return;
		const el = scrollRef.current;
		const trackRect = trackRef.current.getBoundingClientRect();
		const clickY = e.clientY - trackRect.top;
		const ratio = clickY / trackRect.height;
		el.scrollTop = ratio * (el.scrollHeight - el.clientHeight);
	}

	function updateTextareaThumb() {
		const el = textareaRef.current;
		if (!el) return;
		const { scrollTop, scrollHeight, clientHeight } = el;
		if (scrollHeight <= clientHeight) {
			setTextareaThumbState({ height: 0, top: 0, visible: false });
		} else {
			const trackH = el.offsetHeight - 12;
			const ratio = clientHeight / scrollHeight;
			const thumbH = Math.max(ratio * trackH, 16);
			const maxTop = trackH - thumbH;
			const top = (scrollTop / (scrollHeight - clientHeight)) * maxTop;
			setTextareaThumbState({ height: thumbH, top, visible: true });
		}
	}

	useEffect(() => {
		const el = textareaRef.current;
		if (!el) return;
		el.addEventListener("scroll", updateTextareaThumb, { passive: true });
		const observer = new ResizeObserver(updateTextareaThumb);
		observer.observe(el);
		return () => {
			el.removeEventListener("scroll", updateTextareaThumb);
			observer.disconnect();
		};
	}, []);

	useEffect(() => {
		requestAnimationFrame(updateTextareaThumb);
	}, [ text ]);

	function onTextareaThumbMouseDown(e) {
		e.preventDefault();
		const el = textareaRef.current;
		const startY = e.clientY;
		const startScroll = el.scrollTop;
		const { scrollHeight, clientHeight } = el;
		const trackH = el.offsetHeight - 12;
		const ratio = clientHeight / scrollHeight;
		const thumbH = Math.max(ratio * trackH, 16);
		const maxTop = trackH - thumbH;
		const scrollRange = scrollHeight - clientHeight;

		function onMouseMove(e) {
			const dy = e.clientY - startY;
			el.scrollTop = startScroll + (dy / maxTop) * scrollRange;
		}

		function onMouseUp() {
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		}

		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
	}

	function onTextareaTrackClick(e) {
		if (e.target === textareaThumbRef.current) return;
		const el = textareaRef.current;
		const trackRect = textareaTrackRef.current.getBoundingClientRect();
		const clickY = e.clientY - trackRect.top;
		el.scrollTop = (clickY / trackRect.height) * (el.scrollHeight - el.clientHeight);
	}

	function onSend() {
		const trimmed = text.trim();
		if (isEmpty(trimmed)) return;
		controller?.sendMessage(trimmed);
		setText("");
	}

	function onKeyDown(e) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			onSend();
		}
		if (e.key === "Escape") {
			e.currentTarget.blur();
		}
	}

	return <div className={styles.conference_chat} data-no-driving-gesture>
		<div className={styles.conference_chat_resize} data-resizing={resizing} role="separator" aria-orientation="vertical" aria-label={t("conference.resize_chat")} title={t("conference.resize_chat")} aria-valuemin={280} aria-valuemax={maxWidth} aria-valuenow={width} tabIndex={0} onPointerDown={startResize} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={() => {
			resizeRef.current = null; setResizing(false); onResize(width, true);
		}} onLostPointerCapture={() => {
			resizeRef.current = null; setResizing(false);
		}} onKeyDown={onResizeKey} onDoubleClick={() => onResize(320, true)} />
		<div className={styles.conference_chat_header}>
			<Icon name="chat" /> {t("conference.chat")}<span className={styles.space} /><button className={styles.chat_close} onClick={onClose} aria-label={t("common.close")}><Icon name="close" /></button>
		</div>
		<div className={styles.conference_chat_scroll_wrapper}>
			<div className={styles.conference_chat_messages} ref={scrollRef}>
				{messages.map((msg, i) => {
					const isSelf = msg.identity === myIdentity;
					const time = new Date(msg.timestamp);
					const timeStr = time.getHours().toString().padStart(2, "0") + ":" + time.getMinutes().toString().padStart(2, "0");

					return <div key={i} className={cn(styles.conference_chat_message, isSelf ? styles.conference_chat_message_self : null)}>
						<div className={styles.conference_chat_message_header}>
							<span className={styles.conference_chat_message_name}>{root.room?.users?.find((u) => u.identity === msg.identity)?.name || generateRoboName(msg.identity)}</span>
							<span className={styles.conference_chat_message_time}>{timeStr}</span>
						</div>
						<div className={styles.conference_chat_message_text}>{linkify(msg.text)}</div>
					</div>;
				})}
				<div ref={messagesEndRef} />
			</div>
			{ thumbState.visible ? <div className={styles.conference_chat_scrollbar} ref={trackRef} onClick={onTrackClick}>
				<div
					className={styles.conference_chat_scrollbar_thumb}
					ref={thumbRef}
					style={{ height: thumbState.height + "px", top: thumbState.top + "px" }}
					onMouseDown={onThumbMouseDown}
				/>
			</div> : null }
		</div>
		<div className={styles.conference_chat_input}>
			<div className={styles.conference_chat_input_wrapper}>
				<textarea
					ref={textareaRef}
					rows={1}
					aria-label={t("conference.type_message")} placeholder={t("conference.type_message")}
					value={text}
					onChange={(e) => setText(e.target.value)}
					onKeyDown={onKeyDown}
				/>
				{ textareaThumbState.visible ? <div className={styles.conference_chat_input_scrollbar} ref={textareaTrackRef} onClick={onTextareaTrackClick}>
					<div
						className={styles.conference_chat_input_scrollbar_thumb}
						ref={textareaThumbRef}
						style={{ height: textareaThumbState.height + "px", top: textareaThumbState.top + "px" }}
						onMouseDown={onTextareaThumbMouseDown}
					/>
				</div> : null }
			</div>
			<button className={styles.conference_chat_send} aria-label={t("conference.send")} disabled={!text.trim()} onClick={onSend}>
				<Icon name="arrow" size={20} />
			</button>
		</div>
	</div>;
}

export function Conference({ preview = false }) {
	useData(() => root.settings.language);
	const room = useData(() => root.room);
	const state = useData(() => root.room?.state, [ room ]);
	const entered = useData(() => root.room?.entered, [ room ]);
	const maximized = useData(() => root.room?.maximized, [ room ]);
	const trigger = useData(() => root.room?.usersTrigger, [ room ]);
	const users = useData(() => root.room?.users || [], [ room ]);

	const hasCamera = useData(() => root.room?.hasCamera, [ room ]);
	const hasScreencast = useData(() => root.room?.hasScreencast, [ room ]);

	const microphone = useData(() => root.room?.microphone, [ room ]);
	const camera = useData(() => root.room?.camera, [ room ]);
	const screencast = useData(() => root.room?.screencast, [ room ]);

	const maximizedUser = useData(() => root.room?.users?.find((u) => isValid(maximized) && isValid(maximized[0]) && u.identity === maximized[0]), [ maximized, room, trigger ]);
	const maximizedUserCamera = useData(() => maximizedUser?.camera, [ maximizedUser ]);
	const maximizedUserScreencast = useData(() => maximizedUser?.screencast, [ maximizedUser ]);

	const canSwapCamera = useData(() => root.room?.canSwapCamera, [ room ]);

	const [ settingsOpen, setSettingsOpen ] = useState(false);
	const [ theater, setTheater ] = useState(false);
	const [ chatOpen, setChatOpen ] = useState(() => preview && window.innerWidth > 900 && new URLSearchParams(location.search).get("chat") !== "0");
	const [ chatUnread, setChatUnread ] = useState(false);
	const [ copyToast, setCopyToast ] = useState(false);
	const [ volumeOpen, setVolumeOpen ] = useState(false);
	const [ safeDriving, setSafeDriving ] = useState(false);
	const savedChatWidth = useData(() => root.settings.chatWidth);
	const [ viewportWidth, setViewportWidth ] = useState(() => window.innerWidth);
	const maxChatWidth = Math.max(280, Math.min(720, viewportWidth - 360));
	const chatWidth = Math.min(maxChatWidth, Math.max(280, Number.isFinite(savedChatWidth) ? savedChatWidth : 320));
	useEffect(() => {
		const update = () => setViewportWidth(window.innerWidth);
		window.addEventListener("resize", update);
		return () => window.removeEventListener("resize", update);
	}, []);

	function onChatResize(width, persist = false) {
		runInAction(() => {
			root.settings.chatWidth = Math.min(maxChatWidth, Math.max(280, Math.round(width)));
			if (persist) root.settings.save();
		});
	}

	const masterVolume = useData(() => root.settings.masterVolume ?? 1);
	const messagesTrigger = useData(() => root.room?.messagesTrigger, [ room ]);

	const chatOpenRef = useRef(chatOpen);
	chatOpenRef.current = chatOpen;

	const enteredRef = useRef(entered);
	enteredRef.current = entered;

	useEffect(() => {
		if (messagesTrigger > 0 && !chatOpenRef.current) {
			setChatUnread(true);
		}
	}, [ messagesTrigger ]);

	useEffect(() => {
		if (chatOpen) {
			setChatUnread(false);
		}
	}, [ chatOpen ]);

	const hasMaximized = isValid(maximized) && isValid(maximizedUser) &&
		(preview || maximizedUserCamera === true && maximized[1] === USER_CHANNEL.personality || maximizedUserScreencast === true && maximized[1] === USER_CHANNEL.screencast);

	useEffect(() => {
		if (!hasMaximized) {
			setTheater(false);
		}
	}, [ hasMaximized ]);

	useEffect(() => {
		function onKeyDown(e) {
			if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
			if (e.key === "AudioVolumeMute" || e.key === "MicrophoneToggle") {
				e.preventDefault();
				controller?.toggleMicrophone();
			}
			const notTyping = !document.activeElement.closest("input, textarea, select, [role=dialog]");
			if (enteredRef.current) {
				if (e.code === "Space" && notTyping && !document.activeElement.closest("button, summary")) {
					e.preventDefault();
					controller?.toggleMicrophone();
				}
				if (e.code === "KeyV" && notTyping) {
					e.preventDefault();
					controller?.toggleCamera();
				}
				if (e.code === "KeyS" && notTyping) {
					e.preventDefault();
					controller?.toggleScreencast();
				}
				if (e.code === "KeyC" && notTyping) {
					e.preventDefault();
					setChatOpen((prev) => !prev);
				}
			}
		}
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, []);

	async function onCopyLink() {
		const copied = await copyText(location.href);
		setCopyToast(copied ? "copied" : "failed");
		setTimeout(() => setCopyToast(false), 2000);
	}

	function onMicrophone() {
		controller?.toggleMicrophone();
	}

	function onCamera() {
		controller?.toggleCamera();
	}

	function onScreencast() {
		controller?.toggleScreencast();
	}

	function onMasterVolumeChange(e) {
		const newValue = parseFloat(e.target.value);
		runInAction(() => {
			root.settings.masterVolume = newValue;
			root.settings.save();
		});
	}

	function onExit() {
		if (!preview) localStorage.setItem("lastRoom", JSON.stringify({ id: location.pathname, ts: Date.now() }));
		location.href = homePath(preview);
	}

	const volumeRef = useRef(null);
	useEffect(() => {
		if (!volumeOpen) return;
		function onDown(e) {
			if (volumeRef.current && !volumeRef.current.contains(e.target)) setVolumeOpen(false);
		}
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [ volumeOpen ]);

	const safeDrivingRef = useRef(safeDriving);
	safeDrivingRef.current = safeDriving;

	useEffect(() => {
		let touchStartY = null;
		function onTouchStart(e) {
			if (e.target.closest("input, textarea, button, summary, [role=dialog], [data-no-driving-gesture]")) {
				touchStartY = null; return;
			}
			touchStartY = e.touches[0].clientY;
		}
		function onTouchEnd(e) {
			if (touchStartY === null) return;
			const dy = touchStartY - e.changedTouches[0].clientY;
			touchStartY = null;
			if (dy > 80 && !safeDrivingRef.current && enteredRef.current) {
				setSafeDriving(true);
			} else if (dy < -80 && safeDrivingRef.current) {
				setSafeDriving(false);
			}
		}
		document.addEventListener("touchstart", onTouchStart, { passive: true });
		document.addEventListener("touchend", onTouchEnd, { passive: true });
		return () => {
			document.removeEventListener("touchstart", onTouchStart);
			document.removeEventListener("touchend", onTouchEnd);
		};
	}, []);

	const error = useData(() => root.room?.error, [ room ]);
	const reconnecting = state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting;
	const ready = isValid(room) && (state === "connected" || reconnecting);

	if (ready) {
		let content;
		if (hasMaximized) {
			content = <ConferenceFullscreenLayout preview={preview} users={users} maximizedUser={maximizedUser} maximizedChannel={maximized[1]} theater={theater} onTheater={() => setTheater(!theater)} />;
		} else {
			content = <ConferenceDefaultLayout preview={preview} users={users} onEnterTheater={(identity, channel) => {
				runInAction(() => {
					root.room.maximized = [ identity, channel ];
				});
				setTheater(true);
			}} />;
		}

		return <div className={cn(styles.conference_container, theater && hasMaximized ? styles.conference_container_theater : null, chatOpen ? styles.conference_container_chat_open : null)} style={{ "--chat-width": `${chatWidth}px` }}>
			<div className={styles.conference_body} inert={entered !== true} aria-hidden={entered !== true}>
				<div className={styles.conference_content}>
					<div className={styles.conference_content_layer}>
						{content}
					</div>
					<div className={styles.room_watermark} aria-hidden="true" inert><Brand /></div>
				</div>
				{ chatOpen ? <ConferenceChat onClose={() => setChatOpen(false)} width={chatWidth} maxWidth={maxChatWidth} onResize={onChatResize} /> : null }
			</div>
			<div className={styles.conference_buttons} inert={entered !== true} aria-hidden={entered !== true} role="group" aria-label={t("conference.controls")}>
				<div className={styles.toolbar_brand}><Brand /></div>
				<div className={styles.toolbar_controls}>
					<div className={styles.conference_media_group} role="group" aria-label={t("conference.devices")}>
						<button className={cn(styles.conference_button)} aria-pressed={!!microphone} onClick={onMicrophone} aria-label={t("settings.microphone")} data-tooltip={t("settings.microphone")} data-shortcut="Space">
							<Icon name={microphone ? "mic" : "micOff"} size={22} />
						</button>
						{ hasCamera ?
							<button className={cn(styles.conference_button)} aria-pressed={!!camera} onClick={onCamera} aria-label={t("settings.camera")} data-tooltip={t("settings.camera")} data-shortcut="V">
								<Icon name={camera ? "video" : "videoOff"} size={22} />
							</button> :
							null }
					</div>
					{ hasScreencast ? <button className={cn(styles.conference_button)} aria-pressed={!!screencast} onClick={onScreencast} aria-label={t("settings.screen_share")} data-tooltip={t("settings.screen_share")} data-shortcut="S">
						<Icon name="screen" size={22} />
					</button> : null }
					<div className={styles.conference_volume_wrapper} ref={volumeRef}>
						<button className={cn(styles.conference_button, masterVolume < 0.1 ? styles.conference_button_red : null)} onClick={() => setVolumeOpen(!volumeOpen)} aria-label={t("tooltip.volume")} data-tooltip={t("tooltip.volume")}>
							<Icon name={masterVolume < 0.01 ? "volumeOff" : "volume"} size={22} />
						</button>
						{ volumeOpen ? <div className={styles.conference_volume_popup}>
							<input type="range" min="0" max="1" step="0.05" value={masterVolume} onChange={onMasterVolumeChange} aria-label={t("tooltip.volume")} className={styles.conference_volume_slider} />
						</div> : null }
					</div>
					<button className={cn(styles.conference_button, styles.conference_chat_button)} aria-pressed={chatOpen} onClick={() => setChatOpen(!chatOpen)} aria-label={t("conference.chat")} data-tooltip={t("conference.chat")} data-shortcut="C">
						<Icon name="chat" size={22} />
						{ chatUnread ? <span className={styles.conference_chat_badge} /> : null }
					</button>
					<button className={cn(styles.conference_button, styles.toolbar_secondary)} onClick={() => setSettingsOpen(!settingsOpen)} aria-label={t("settings.title")} data-tooltip={t("settings.title")}>
						<Icon name="settings" size={22} />
					</button>
					<button className={cn(styles.conference_button, styles.safe_driving_toggle)} onClick={() => setSafeDriving(true)} aria-label={t("safe_driving.title")} data-tooltip={t("safe_driving.title")}>
						<i className="fa-solid fa-car"></i>
					</button>
					<details className={styles.mobile_more} onClick={(e) => {
						if (e.target.closest("button")) e.currentTarget.open = false;
					}}>
						<summary aria-label={t("common.more")}><Icon name="more" size={22} /></summary>
						<div className={styles.mobile_more_menu} data-no-driving-gesture>
							<button onClick={onCopyLink}><Icon name="users" />{t("tooltip.invite")}</button>
							{hasScreencast && <button onClick={onScreencast} aria-pressed={!!screencast}><Icon name="screen" />{t("settings.screen_share")}</button>}
							<button onClick={() => setSettingsOpen(true)}><Icon name="settings" />{t("settings.title")}</button>
							<button onClick={() => setSafeDriving(true)}><Icon name="mic" />{t("safe_driving.title")}</button>
							{camera && canSwapCamera && <button onClick={() => controller?.swapCamera()}><Icon name="video" />{t("tooltip.swap_camera")}</button>}
							<label>{t("tooltip.volume")}<input type="range" min="0" max="1" step="0.05" value={masterVolume} onChange={onMasterVolumeChange} /></label>
						</div>
					</details>
					<div className={styles.conference_buttons_gap} />
					<button className={cn(styles.conference_button, styles.conference_button_red, styles.conference_leave_button)} onClick={onExit} aria-label={t("tooltip.leave")} data-tooltip={t("tooltip.leave")}>
						<Icon name="phoneDown" size={23} />
					</button>
				</div>
				<div className={styles.toolbar_actions}><span className={styles.room_people}><Icon name="users" size={17} />{users.filter((user) => user.connected).length}</span><button className={styles.invite_button} aria-label={t("tooltip.invite")} title={t("tooltip.invite")} onClick={onCopyLink}><Icon name="plus" size={17} /><span>{t("tooltip.invite")}</span></button></div>
			</div>
			{ entered === true && safeDriving ?
				<div className={styles.safe_driving_overlay}>
					<div className={styles.safe_driving_content}>
						<button aria-label={microphone ? t("safe_driving.tap_to_mute") : t("safe_driving.tap_to_unmute")} aria-pressed={!!microphone} className={cn(styles.safe_driving_mic, microphone ? styles.safe_driving_mic_on : styles.safe_driving_mic_off)} onClick={onMicrophone}>
							<i className={microphone ? "fa-solid fa-microphone" : "fa-solid fa-microphone-slash"}></i>
						</button>
						<div className={styles.safe_driving_status}>
							{microphone ? t("safe_driving.tap_to_mute") : t("safe_driving.tap_to_unmute")}
						</div>
						<div className={styles.safe_driving_speaker}>
							<i className="fa-solid fa-volume-high"></i> {t("safe_driving.speaker_on")}
						</div>
					</div>
					<button className={styles.safe_driving_exit} onClick={() => setSafeDriving(false)}>
						{t("safe_driving.tap_to_exit")}
					</button>
				</div> :
				null }
			{ entered === true ? null :
				<div className={styles.conference_enter} role="region" aria-label={t("conference.prejoin")}>
					<ConferenceUserEntrance data={root.room.users[0]} preview={preview} />
				</div>
			}
			{ copyToast ?
				<div className={styles.copy_toast} role={copyToast === "failed" ? "alert" : "status"}>
					<i className={copyToast === "failed" ? "fa-solid fa-xmark" : "fa-solid fa-check"}></i> {t(copyToast === "failed" ? "toast.copy_failed" : "toast.invite_copied")}
				</div> :
				null }
			{ reconnecting ?
				<div className={styles.reconnect_toast} role="status">
					<i className="fa-solid fa-wifi"></i> {t("toast.network_issues")}
				</div> :
				null }
			{ isValid(error) ?
				<div className={styles.error_toast} role="alert">
					<i className="fa-solid fa-circle-exclamation"></i> {error}
				</div> :
				null }
			{ settingsOpen ? <SettingsPopup controller={controller} onClose={() => setSettingsOpen(false)} /> : null }
		</div>;
	}

	return <div className={styles.conference_loading}>
		{t("conference.loading")}
		{ isValid(error) ?
			<div className={styles.error_toast} role="alert">
				<i className="fa-solid fa-circle-exclamation"></i> {error}
			</div> :
			null }
	</div>;
}

function ConferencePage({ roomId, p2p }) {
	useEffect(() => {
		const ctrl = p2p ? new P2PRoomController() : new LiveKitRoomController();
		controller = ctrl;

		ctrl.start(roomId);

		return () => {
			ctrl.stop();
			controller = null;
		};
	}, [ roomId, p2p ]);

	useEffect(() => {
		if (!("wakeLock" in navigator)) return;

		let wakeLock = null;
		let active = true;

		async function requestWakeLock() {
			if (!active) return;
			try {
				wakeLock = await navigator.wakeLock.request("screen");
				wakeLock.addEventListener("release", () => {
					wakeLock = null;
				});
			} catch {}
		}

		function onVisibilityChange() {
			if (document.visibilityState === "visible") {
				requestWakeLock();
			}
		}

		requestWakeLock();
		document.addEventListener("visibilitychange", onVisibilityChange);

		return () => {
			active = false;
			document.removeEventListener("visibilitychange", onVisibilityChange);
			if (wakeLock) {
				wakeLock.release().catch(() => {});
				wakeLock = null;
			}
		};
	}, []);

	return <Conference />;
}

export function MenuPage({ onCreatePreview, onReturnPreview }) {
	const lastRoom = (() => {
		try {
			const raw = JSON.parse(localStorage.getItem("lastRoom"));
			if (isValid(raw) && Date.now() - raw.ts < 5 * 60 * 1000) return raw.id;
		} catch {}
		return null;
	})();
	const [ p2p, setP2p ] = useState(false);
	const [ pending, setPending ] = useState(false);
	const [ error, setError ] = useState("");
	const [ settingsOpen, setSettingsOpen ] = useState(false);
	useData(() => root.settings.language);

	async function onCreate() {
		if (onCreatePreview) {
			onCreatePreview(); return;
		}
		setPending(true);
		setError("");
		try {
			if (p2p) {
				location.href = "/p2p/" + globalThis.crypto.randomUUID(); return;
			}
			const payload = await jsonFetch(appConfig.serverUrl + "room/create", {});
			if (!payload.json?.room) throw new Error("create failed");
			location.href = "/" + payload.json.room;
		} catch {
			setError(t("menu.create_failed")); setPending(false);
		}
	}


	return <div className={styles.main}>
		<header className={styles.home_header}><button className={styles.icon_button} onClick={() => setSettingsOpen(true)} aria-label={t("settings.title")}><Icon name="settings" /></button></header>
		<main className={styles.home_content}>
			<div className={styles.home_actions}>
				<div className={styles.home_identity}><Brand /></div>
				<button className={styles.create_button} disabled={pending} onClick={onCreate}><Icon name="video" size={22} /><span>{pending ? t("menu.creating") : t("menu.create_meeting")}</span></button>
				{(lastRoom || onReturnPreview) && <button className={styles.return_button} onClick={onReturnPreview || (() => location.href = lastRoom)}><span>{t("menu.return_to_meeting")}</span><Icon name="arrow" size={20} /></button>}
				{error && <p className={styles.home_error} role="alert">{error}</p>}
				<label className={styles.p2p_row} title={t("menu.p2p_explanation")}><button className={cn(styles.main_p2p_switch, p2p && styles.main_p2p_switch_on)} role="switch" aria-label="P2P" aria-checked={p2p} onClick={() => setP2p(!p2p)}><span className={styles.main_p2p_switch_thumb} /></button><span>P2P</span></label>
			</div>
		</main>
		<footer className={styles.home_footer}><a href="mailto:go@sozvon.now" aria-label="go@sozvon.now" title="go@sozvon.now"><i aria-hidden="true" className="fa-regular fa-envelope" /></a><a href="https://t.me/govoicenow_bot" target="_blank" rel="noreferrer" aria-label="Telegram" title="Telegram"><i aria-hidden="true" className="fa-brands fa-telegram" /></a></footer>
		{settingsOpen && <SettingsPopup controller={null} onClose={() => setSettingsOpen(false)} />}
	</div>;
}

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

const RTL_LOCALES = [ "ar" ];

export default function Page() {
	const [ { roomId, p2p } ] = useState(() => {
		const parts = location.pathname.split("/").filter(Boolean);
		const p2p = parts[0] === "p2p";
		const id = p2p ? parts[1] : parts[0];
		return { roomId: id && UUID_RE.test(id) ? id : null, p2p };
	});

	const language = useData(() => root.settings.language);

	useEffect(() => {
		const dir = RTL_LOCALES.includes(getLocale()) ? "rtl" : "ltr";
		document.documentElement.dir = dir;
		document.documentElement.lang = getLocale();
	}, [ language ]);

	useEffect(() => {
		const blurOk = supportsBackgroundProcessors();
		runInAction(() => {
			root.blurSupported = blurOk;
			if (!blurOk && root.settings.backgroundBlur > 0) {
				root.settings.backgroundBlur = 0;
				root.settings.save();
			}
		});

		if (roomId) localStorage.setItem("lastRoom", JSON.stringify({ id: location.pathname, ts: Date.now() }));
	}, []);

	if (location.pathname === "/design") return <Suspense fallback={<div className={styles.conference_loading}>{t("conference.loading")}</div>}><DesignReview /></Suspense>;

	if (!isValid(roomId)) {
		return <MenuPage />;
	}

	return <ConferencePage roomId={roomId} p2p={p2p} />;
}
