
import { runInAction } from "mobx";
import React, { useEffect, useRef, useState } from "react";

import Select from "@/components/select.jsx";
import root from "@/data/root-data.js";
import { useData } from "@/utils/data-hook.js";
import { setLocale, t } from "@/utils/locale.js";

import styles from "./settings-popup.module.css";

function qualityOptions() {
	return [
		{ label: t("settings.low"), value: 0 },
		{ label: t("settings.med"), value: 1 },
		{ label: t("settings.high"), value: 2 },
	];
}

function blurOptions() {
	return [
		{ label: t("settings.off"), value: 0 },
		{ label: t("settings.low"), value: 1 },
		{ label: t("settings.high"), value: 2 },
	];
}

const LANGUAGE_OPTIONS = [
	{ value: "", label: "\uD83C\uDF10\u2003Auto" },
	{ value: "en", label: "\uD83C\uDDEC\uD83C\uDDE7\u2003English" },
	{ value: "ru", label: "\uD83C\uDDF7\uD83C\uDDFA\u2003Русский" },
	{ value: "zh", label: "\uD83C\uDDE8\uD83C\uDDF3\u2003中文" },
	{ value: "es", label: "\uD83C\uDDEA\uD83C\uDDF8\u2003Español" },
	{ value: "fr", label: "\uD83C\uDDEB\uD83C\uDDF7\u2003Français" },
	{ value: "de", label: "\uD83C\uDDE9\uD83C\uDDEA\u2003Deutsch" },
	{ value: "pt", label: "\uD83C\uDDE7\uD83C\uDDF7\u2003Português" },
	{ value: "ja", label: "\uD83C\uDDEF\uD83C\uDDF5\u2003日本語" },
	{ value: "ko", label: "\uD83C\uDDF0\uD83C\uDDF7\u2003한국어" },
	{ value: "ar", label: "\uD83C\uDDF8\uD83C\uDDE6\u2003العربية" },
];

function OptionsSwitcher({ options, value, onChange }) {
	return <div className={styles.switcher}>
		{options.map((opt) => <button
			key={opt.value}
			aria-pressed={value === opt.value}
			className={`${styles.switcher_button} ${value === opt.value ? styles.switcher_button_active : ""}`}
			onClick={() => onChange(opt.value)}
		>{opt.label}</button>)}
	</div>;
}

function QualitySwitcher({ value, onChange }) {
	return <OptionsSwitcher options={qualityOptions()} value={value} onChange={onChange} />;
}

export default function SettingsPopup({ controller, onClose }) {
	const dialogRef = useRef(null);
	useEffect(() => {
		const previous = document.activeElement;
		const dialog = dialogRef.current;
		dialog.querySelector("button")?.focus();
		return () => {
			if (previous?.isConnected) previous.focus();
		};
	}, []);

	function onDialogKey(event) {
		if (event.key === "Escape") {
			event.preventDefault(); event.stopPropagation(); onClose();
		}
		if (event.key !== "Tab") return;
		const elements = Array.from(dialogRef.current.querySelectorAll("button, input, select, textarea, [tabindex='0']")).filter((el) => !el.disabled && el.getClientRects().length);
		const first = elements[0], last = elements[elements.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault(); last?.focus();
		}
		if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault(); first?.focus();
		}
	}

	const [ microphoneDevices, setMicrophoneDevices ] = useState([]);
	const [ cameraDevices, setCameraDevices ] = useState([]);
	const [ speakerDevices, setSpeakerDevices ] = useState([]);

	const cameraDeviceId = useData(() => root.cameraDeviceId || "");
	const microphoneDeviceId = useData(() => root.microphoneDeviceId || "");
	const speakerDeviceId = useData(() => root.speakerDeviceId || "");

	const cameraQuality = useData(() => root.settings.cameraQuality);
	const microphoneQuality = useData(() => root.settings.microphoneQuality);
	const screencastQuality = useData(() => root.settings.screencastQuality);
	const mirrorCamera = useData(() => root.settings.mirrorCamera);
	const backgroundBlur = useData(() => root.settings.backgroundBlur);
	const disableIncomingVideo = useData(() => root.settings.disableIncomingVideo);
	const blurSupported = useData(() => root.blurSupported);
	const language = useData(() => root.settings.language);

	useEffect(() => {
		controller?.getDevices(true).then((devices) => {
			setMicrophoneDevices(devices.microphone);
			setCameraDevices(devices.camera);
			setSpeakerDevices(devices.speaker);
		});
	}, []);

	function onMicrophoneChange(newValue) {
		if (newValue !== root.microphoneDeviceId) {
			runInAction(() => {
				root.microphoneDeviceId = newValue;
				root.settings.save();
			});
			controller?.switchMicrophoneDevice();
		}
	}

	function onSpeakerChange(newValue) {
		if (newValue !== root.speakerDeviceId) {
			runInAction(() => {
				root.speakerDeviceId = newValue;
				root.settings.save();
			});
		}
	}

	function onCameraChange(newValue) {
		if (newValue !== root.cameraDeviceId) {
			runInAction(() => {
				root.cameraDeviceId = newValue;
				root.settings.save();
			});
			controller?.switchCameraDevice();
		}
	}

	function onMicrophonePresetChange(newValue) {
		if (newValue !== root.settings.microphoneQuality) {
			runInAction(() => {
				root.settings.microphoneQuality = newValue;
				root.settings.save();
			});
			controller?.switchMicrophonePreset();
		}
	}

	function onCameraPresetChange(newValue) {
		if (newValue !== root.settings.cameraQuality) {
			runInAction(() => {
				root.settings.cameraQuality = newValue;
				root.settings.save();
			});
			controller?.switchCameraPreset();
		}
	}

	function onMirrorCameraChange() {
		runInAction(() => {
			root.settings.mirrorCamera = !root.settings.mirrorCamera;
			root.settings.save();
		});
	}

	function onBackgroundBlurChange(newValue) {
		if (newValue !== root.settings.backgroundBlur) {
			runInAction(() => {
				root.settings.backgroundBlur = newValue;
				root.settings.save();
			});
			controller?.applyBackgroundBlur();
		}
	}

	function onDisableIncomingVideoChange() {
		runInAction(() => {
			root.settings.disableIncomingVideo = !root.settings.disableIncomingVideo;
			root.settings.save();
		});
		controller?.updateIncomingVideo();
	}

	function onScreencastPresetChange(newValue) {
		if (newValue !== root.settings.screencastQuality) {
			runInAction(() => {
				root.settings.screencastQuality = newValue;
				root.settings.save();
			});
			controller?.switchScreencastPreset();
		}
	}

	function onOverlayClick(e) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	const scrollRef = useRef(null);
	const thumbRef = useRef(null);
	const trackRef = useRef(null);
	const [ thumbState, setThumbState ] = useState({ height: 0, top: 0, visible: false });

	function updateThumb() {
		const el = scrollRef.current;
		if (!el) return;
		const { scrollTop, scrollHeight, clientHeight } = el;
		if (scrollHeight <= clientHeight) {
			setThumbState({ height: 0, top: 0, visible: false });
		} else {
			const ratio = clientHeight / scrollHeight;
			const thumbH = Math.max(ratio * clientHeight, 24);
			const maxTop = clientHeight - thumbH;
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
		updateThumb();
		return () => {
			el.removeEventListener("scroll", updateThumb);
			observer.disconnect();
		};
	}, []);

	function onThumbMouseDown(e) {
		e.preventDefault();
		const el = scrollRef.current;
		const startY = e.clientY;
		const startScroll = el.scrollTop;
		const { scrollHeight, clientHeight } = el;
		const ratio = clientHeight / scrollHeight;
		const thumbH = Math.max(ratio * clientHeight, 24);
		const maxTop = clientHeight - thumbH;
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

	function onTrackClick(e) {
		if (e.target === thumbRef.current) return;
		const el = scrollRef.current;
		const trackRect = trackRef.current.getBoundingClientRect();
		const clickY = e.clientY - trackRect.top;
		el.scrollTop = (clickY / trackRect.height) * (el.scrollHeight - el.clientHeight);
	}

	return <div ref={dialogRef} className={styles.overlay} aria-modal="true" role="dialog" aria-label={t("settings.title")} onClick={onOverlayClick} onKeyDown={onDialogKey}>
		<div className={styles.settings}>
			<div className={styles.header}>
				<div className={styles.title}><i className="fa-solid fa-gear"></i> {t("settings.title")}</div>
				<button className={styles.close} aria-label={t("common.close")} onClick={onClose}>
					<i className="fa-solid fa-xmark"></i>
				</button>
			</div>
			<div className={styles.settings_scroll_wrapper}>
				<div className={styles.settings_scroll} ref={scrollRef}>
					<div className={styles.group}>
						<div className={styles.group_title}><i className="fa-solid fa-globe"></i> {t("settings.language")}</div>
						<div className={styles.row}>
							<div className={styles.control}>
								<Select label={t("settings.language")} value={language} onChange={setLocale}>
									{LANGUAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
								</Select>
							</div>
						</div>
					</div>
					<div className={styles.group}>
						<div className={styles.group_title}><i className="fa-solid fa-microphone"></i> {t("settings.microphone")}</div>
						<div className={styles.row}>
							<div className={styles.label}>{t("settings.device")}</div>
							<div className={styles.control}>
								<Select label={t("settings.microphone")} value={microphoneDeviceId} onChange={onMicrophoneChange}>
									<option value="">{t("settings.default")}</option>
									{microphoneDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>)}
								</Select>
							</div>
						</div>
						<div className={styles.row}>
							<div className={styles.label}>{t("settings.quality")}</div>
							<div className={styles.control}>
								<QualitySwitcher value={microphoneQuality} onChange={onMicrophonePresetChange} />
							</div>
						</div>
					</div>
					{ speakerDevices.length > 0 ? <div className={styles.group}>
						<div className={styles.group_title}><i className="fa-solid fa-headphones"></i> {t("settings.speaker")}</div>
						<div className={styles.row}>
							<div className={styles.label}>{t("settings.device")}</div>
							<div className={styles.control}>
								<Select label={t("settings.speaker")} value={speakerDeviceId} onChange={onSpeakerChange}>
									<option value="">{t("settings.default")}</option>
									{speakerDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>)}
								</Select>
							</div>
						</div>
					</div> : null }
					<div className={styles.group}>
						<div className={styles.group_title}><i className="fa-solid fa-video"></i> {t("settings.camera")}</div>
						<div className={styles.row}>
							<div className={styles.label}>{t("settings.device")}</div>
							<div className={styles.control}>
								<Select label={t("settings.camera")} value={cameraDeviceId} onChange={onCameraChange}>
									<option value="">{t("settings.default")}</option>
									{cameraDevices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>)}
								</Select>
							</div>
						</div>
						<div className={styles.row}>
							<div className={styles.label}>{t("settings.quality")}</div>
							<div className={styles.control}>
								<QualitySwitcher value={cameraQuality} onChange={onCameraPresetChange} />
							</div>
						</div>
						{ blurSupported ? <div className={styles.row}>
							<div className={styles.label}>{t("settings.blur")}</div>
							<div className={styles.control}>
								<OptionsSwitcher options={blurOptions()} value={backgroundBlur} onChange={onBackgroundBlurChange} />
							</div>
						</div> : null }
						<div className={styles.row}>
							<div className={styles.label}>{t("settings.mirror")}</div>
							<div className={styles.control}>
								<div className={styles.switcher}>
									<button
										aria-pressed={!mirrorCamera} className={`${styles.switcher_button} ${!mirrorCamera ? styles.switcher_button_active : ""}`}
										onClick={() => {
											if (mirrorCamera) onMirrorCameraChange();
										}}
									>{t("settings.off")}</button>
									<button
										aria-pressed={!!mirrorCamera} className={`${styles.switcher_button} ${mirrorCamera ? styles.switcher_button_active : ""}`}
										onClick={() => {
											if (!mirrorCamera) onMirrorCameraChange();
										}}
									>{t("settings.on")}</button>
								</div>
							</div>
						</div>
					</div>
					<div className={styles.group}>
						<div className={styles.group_title}><i className="fa-solid fa-desktop"></i> {t("settings.screen_share")}</div>
						<div className={styles.row}>
							<div className={styles.label}>{t("settings.quality")}</div>
							<div className={styles.control}>
								<QualitySwitcher value={screencastQuality} onChange={onScreencastPresetChange} />
							</div>
						</div>
					</div>
					<div className={styles.group}>
						<div className={styles.group_title}><i className="fa-solid fa-eye"></i> {t("settings.incoming_video")}</div>
						<div className={styles.row}>
							<div className={styles.label}>{t("settings.receive")}</div>
							<div className={styles.control}>
								<div className={styles.switcher}>
									<button
										aria-pressed={!disableIncomingVideo} className={`${styles.switcher_button} ${!disableIncomingVideo ? styles.switcher_button_active : ""}`}
										onClick={() => {
											if (disableIncomingVideo) onDisableIncomingVideoChange();
										}}
									>{t("settings.on")}</button>
									<button
										aria-pressed={!!disableIncomingVideo} className={`${styles.switcher_button} ${disableIncomingVideo ? styles.switcher_button_active : ""}`}
										onClick={() => {
											if (!disableIncomingVideo) onDisableIncomingVideoChange();
										}}
									>{t("settings.off")}</button>
								</div>
							</div>
						</div>
					</div>
				</div>
				{ thumbState.visible ? <div className={styles.settings_scrollbar} ref={trackRef} onClick={onTrackClick}>
					<div
						className={styles.settings_scrollbar_thumb}
						ref={thumbRef}
						style={{ height: thumbState.height + "px", top: thumbState.top + "px" }}
						onMouseDown={onThumbMouseDown}
					/>
				</div> : null }
			</div>
		</div>
	</div>;
}
