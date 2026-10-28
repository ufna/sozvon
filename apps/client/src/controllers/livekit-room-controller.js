import { BackgroundBlur } from "@livekit/track-processors";
import { AudioPresets, LocalAudioTrack, LocalVideoTrack, Room, Track } from "livekit-client";
import { runInAction } from "mobx";

import appConfig from "@/config.js";
import { BACKGROUND_BLUR_RADIUS } from "@/constants.js";
import { BaseRoomController } from "@/controllers/base-room-controller.js";
import root from "@/data/root-data.js";
import { jsonFetch } from "@/utils/fetch.js";
import { t } from "@/utils/locale.js";
import { generateRoboName } from "@/utils/user-generator.js";
import { isEmpty, isValid } from "@/utils/utils.js";

export const CAMERA_PRESETS = [
	{
		capture: {
			width: { ideal: 640, max: 640 },
			height: { ideal: 360, max: 360 },
			frameRate: { ideal: 15, max: 15 },
		},
		publish: {
			videoEncoding: { maxBitrate: 150_000, maxFramerate: 15 },
			videoCodec: "vp8",
			simulcast: true,
		},
	},
	{
		capture: {
			width: { ideal: 1280, max: 1280 },
			height: { ideal: 720, max: 720 },
			frameRate: { ideal: 30, max: 30 },
		},
		publish: {
			videoEncoding: { maxBitrate: 1_000_000, maxFramerate: 30 },
			videoCodec: "vp8",
			simulcast: true,
		},
	},
	{
		capture: {
			width: { ideal: 1920, max: 1920 },
			height: { ideal: 1080, max: 1080 },
			frameRate: { ideal: 30, max: 30 },
		},
		publish: {
			videoEncoding: { maxBitrate: 1_800_000, maxFramerate: 30 },
			videoCodec: "vp8",
			simulcast: true,
		},
	},
];

export const SCREENCAST_PRESETS = [
	{
		capture: {
			width: { ideal: 1280, max: 1280 },
			height: { ideal: 720, max: 720 },
			frameRate: { ideal: 10, max: 10 },
		},
		publish: {
			screenShareEncoding: { maxBitrate: 800_000, maxFramerate: 10 },
			videoCodec: "vp8",
		},
	},
	{
		capture: {
			width: { ideal: 1280, max: 1280 },
			height: { ideal: 720, max: 720 },
			frameRate: { ideal: 30, max: 30 },
		},
		publish: {
			screenShareEncoding: { maxBitrate: 1_200_000, maxFramerate: 30 },
			videoCodec: "vp8",
		},
	},
	{
		capture: {
			width: { ideal: 1920, max: 1920 },
			height: { ideal: 1080, max: 1080 },
			frameRate: { ideal: 30, max: 30 },
		},
		publish: {
			screenShareEncoding: { maxBitrate: 2_500_000, maxFramerate: 30 },
			videoCodec: "vp8",
		},
	},
];

export const MICROPHONE_PRESETS = [
	{
		capture: {
			echoCancellation: true,
			noiseSuppression: true,
			autoGainControl: true,
			channelCount: 1,
		},
		publish: {
			audioPreset: AudioPresets.telephone,
			audioBitrate: 12_000,
			dtx: true,
		},
	},
	{
		capture: {
			echoCancellation: true,
			noiseSuppression: true,
			autoGainControl: true,
			channelCount: 1,
		},
		publish: {
			audioPreset: AudioPresets.speech,
			audioBitrate: 20_000,
			dtx: true,
		},
	},
	{
		capture: {
			echoCancellation: true,
			noiseSuppression: true,
			autoGainControl: true,
			channelCount: 1,
		},
		publish: {
			audioPreset: AudioPresets.music,
			audioBitrate: 48_000,
			dtx: true,
		},
	},
];

const RECONNECT_DELAY = 3000;

export class LiveKitRoomController extends BaseRoomController {
	reconnectTimer = null;
	scanInterval = null;

	async start(roomId) {
		this.stopped = false;

		const token = await this.fetchToken(roomId);
		if (!isValid(token)) return;

		await this.initRoom(roomId, token.identity);

		try {
			const room = this.createRoom(roomId);
			await room.connect(token.socket, token.token);

			this.room = room;

			this.sendName(root.settings.displayName || generateRoboName(token.identity));
			this.scanTracks();
			this.scanInterval = setInterval(() => this.scanTracks(), 1000);
		} catch (err) {
			console.error("Start: connection failed", err);
			runInAction(() => {
				root.room.error = t("toast.connection_failed");
			});
			this.scheduleReconnect(roomId);
		}
	}

	stop() {
		this.stopped = true;
		clearTimeout(this.reconnectTimer);
		clearInterval(this.scanInterval);

		if (isValid(this.room)) {
			this.room.removeAllListeners();
			this.room.disconnect();
		}

		this.resetState();
	}

	// --- Media: Microphone ---

	async publishMicrophone() {
		if (this.actionInProgress) return;
		this.actionInProgress = true;

		try {
			if (isValid(this.microphoneTrack)) {
				return;
			}

			const preset = MICROPHONE_PRESETS[root.settings.microphoneQuality] || MICROPHONE_PRESETS[1];
			const microphoneConstraints = { ...preset.capture };
			if (!isEmpty(root.microphoneDeviceId)) {
				microphoneConstraints.deviceId = { exact: root.microphoneDeviceId };
			}

			const stream = await navigator.mediaDevices.getUserMedia({
				audio: microphoneConstraints,
				video: false,
			});

			const track = new LocalAudioTrack(stream.getAudioTracks()[0]);

			await this.room.localParticipant.publishTrack(track, { source: Track.Source.Microphone, ...preset.publish });

			this.microphoneTrack = track;

			track.mediaStreamTrack.onended = () => {
				this.unpublishMicrophone();
			};

			runInAction(() => {
				root.room.microphone = true;
			});

		} finally {
			this.actionInProgress = false;
		}
	}

	async unpublishMicrophone() {
		if (this.actionInProgress) return;
		this.actionInProgress = true;

		try {
			if (!isValid(this.microphoneTrack)) {
				return;
			}

			await this.room.localParticipant.unpublishTrack(this.microphoneTrack);
			this.microphoneTrack.stop();
			this.microphoneTrack = null;

			runInAction(() => {
				root.room.microphone = false;
			});
		} finally {
			this.actionInProgress = false;
		}
	}

	// --- Media: Camera ---

	async publishCamera() {
		if (this.actionInProgress) return;
		this.actionInProgress = true;

		try {
			if (isValid(this.cameraTrack)) {
				return;
			}

			const cameraPreset = CAMERA_PRESETS[root.settings.cameraQuality] || CAMERA_PRESETS[1];
			const cameraConstraints = { ...cameraPreset.capture };
			if (!isEmpty(root.cameraDeviceId)) {
				cameraConstraints.deviceId = { exact: root.cameraDeviceId };
			}

			const stream = await navigator.mediaDevices.getUserMedia({ video: cameraConstraints });
			const track = new LocalVideoTrack(stream.getVideoTracks()[0]);

			await this.room.localParticipant.publishTrack(track, { source: Track.Source.Camera, ...cameraPreset.publish });

			this.cameraTrack = track;

			track.mediaStreamTrack.onended = () => {
				this.unpublishCamera();
			};

			await this.applyBackgroundBlur();

			runInAction(() => {
				root.room.camera = true;
			});

		} finally {
			this.actionInProgress = false;
		}
	}

	async unpublishCamera() {
		if (this.actionInProgress) return;
		this.actionInProgress = true;

		try {
			if (!isValid(this.cameraTrack)) {
				return;
			}

			await this.room.localParticipant.unpublishTrack(this.cameraTrack);
			this.cameraTrack.stop();
			this.cameraTrack = null;

			runInAction(() => {
				root.room.camera = false;
			});
		} finally {
			this.actionInProgress = false;
		}
	}

	async applyBackgroundBlur() {
		if (!isValid(this.cameraTrack)) return;
		const level = root.settings.backgroundBlur;
		const radius = BACKGROUND_BLUR_RADIUS[level] || 0;
		try {
			if (radius > 0) {
				await this.cameraTrack.setProcessor(BackgroundBlur(radius));
			} else {
				await this.cameraTrack.stopProcessor();
			}
		} catch {}
	}

	// --- Media: Screencast ---

	async publishScreencast() {
		if (this.actionInProgress) return;
		this.actionInProgress = true;

		try {
			if (isValid(this.screencastTrack)) {
				return;
			}

			const screencastPreset = SCREENCAST_PRESETS[root.settings.screencastQuality] || SCREENCAST_PRESETS[1];
			const display = await navigator.mediaDevices.getDisplayMedia({ video: screencastPreset.capture });
			const track = new LocalVideoTrack(display.getVideoTracks()[0]);
			await this.room.localParticipant.publishTrack(track, { source: Track.Source.ScreenShare, ...screencastPreset.publish });

			track.mediaStreamTrack.onended = () => {
				this.unpublishScreencast();
			};

			this.screencastTrack = track;

			runInAction(() => {
				root.room.screencast = true;
			});
		} finally {
			this.actionInProgress = false;
		}
	}

	async unpublishScreencast() {
		if (this.actionInProgress) return;
		this.actionInProgress = true;

		try {
			if (!isValid(this.screencastTrack)) {
				return;
			}

			await this.room.localParticipant.unpublishTrack(this.screencastTrack);
			this.screencastTrack.stop();
			this.screencastTrack = null;

			runInAction(() => {
				root.room.screencast = false;
			});
		} finally {
			this.actionInProgress = false;
		}
	}

	// --- Name ---

	sendName(name) {
		if (!isValid(this.room)) return;

		Promise.resolve(this.room.localParticipant.setName(name)).catch((err) => {
			console.error("setName failed", err);
		});

		const data = new TextEncoder().encode(JSON.stringify({ type: "name", name }));
		this.room.localParticipant.publishData(data, { reliable: true });
	}

	// --- Chat ---

	sendMessage(text) {
		if (!isValid(this.room) || isEmpty(text)) return;

		const data = new TextEncoder().encode(JSON.stringify({ type: "chat", text }));
		this.room.localParticipant.publishData(data, { reliable: true });

		runInAction(() => {
			root.room.messages.push({ identity: root.room.myIdentity, text, timestamp: Date.now() });
			root.room.messagesTrigger += 1;
		});
	}

	// --- Internal ---

	async fetchToken(roomId) {
		const identity = this.getOrCreateIdentity();

		const payload = await jsonFetch(appConfig.serverUrl + "room/token/livekit/" + roomId, { identity });
		if (!isValid(payload.json) || isValid(payload.json.error)) {
			location.href = "/";
			return null;
		}
		return payload.json;
	}

	createRoom(roomId) {
		const room = new Room({ dynacast: true });

		room.on("connectionStateChanged", (state) => {
			console.log("Connection state:", state);
			runInAction(() => {
				if (isValid(root.room)) {
					root.room.state = state;
				}
			});
		});

		room.on("disconnected", () => {
			if (!this.stopped) {
				console.log("Disconnected: scheduling reconnect...");
				this.scheduleReconnect(roomId);
			}
		});

		room.on("dataReceived", (payload, participant) => {
			try {
				const msg = JSON.parse(new TextDecoder().decode(payload));
				if (msg.type === "chat") {
					runInAction(() => {
						root.room.messages.push({ identity: participant.identity, text: msg.text, timestamp: Date.now() });
						root.room.messagesTrigger += 1;
					});
				} else if (msg.type === "name") {
					this.names.set(participant.identity, msg.name);
					runInAction(() => {
						const user = root.room?.users?.find((u) => u.identity === participant.identity);
						if (user) {
							user.name = msg.name;
							root.room.usersTrigger += 1;
						}
					});
				}
			} catch {}
		});

		room.on("participantNameChanged", (name, participant) => {
			this.names.set(participant.identity, name);
			runInAction(() => {
				const user = root.room?.users?.find((u) => u.identity === participant.identity);
				if (user && user.name !== name) {
					user.name = name;
					root.room.usersTrigger += 1;
				}
			});
		});

		room.on("trackSubscribed", (track, publication, participant) => {
			this.scanTracks();
			this.updateIncomingVideo({ participant, publication });
		});
		room.on("trackUnsubscribed", () => this.scanTracks());
		room.on("participantConnected", (participant) => {
			this.scanTracks();
			this.updateIncomingVideo({ participant });
			this.onParticipantConnected();
			this.sendName(root.settings.displayName || generateRoboName(root.room?.myIdentity));
		});
		room.on("participantDisconnected", () => {
			this.scanTracks();
			this.onParticipantDisconnected();
		});

		return room;
	}

	scheduleReconnect(roomId) {
		if (this.stopped) return;
		clearTimeout(this.reconnectTimer);
		this.reconnectTimer = setTimeout(() => this.reconnect(roomId), RECONNECT_DELAY);
	}

	async reconnect(roomId) {
		if (this.stopped) return;

		console.log("Reconnect: fetching new token...");

		try {
			if (isValid(this.room)) {
				this.room.removeAllListeners();
				try {
					this.room.disconnect();
				} catch {}
				this.room = null;
			}

			this.microphoneTrack = null;
			this.cameraTrack = null;
			this.screencastTrack = null;
			this.screencastAudioTrack = null;

			const token = await this.fetchToken(roomId);
			if (!isValid(token) || this.stopped) return;

			const wasMicrophone = root.room?.microphone;
			const wasCamera = root.room?.camera;

			runInAction(() => {
				root.room.microphone = false;
				root.room.camera = false;
				root.room.screencast = false;
			});
			this.actionInProgress = false;

			const newRoom = this.createRoom(roomId);
			await newRoom.connect(token.socket, token.token);

			if (this.stopped) {
				newRoom.disconnect();
				return;
			}

			this.room = newRoom;

			runInAction(() => {
				root.room.error = null;
			});

			console.log("Reconnect: success");

			this.sendName(root.settings.displayName || generateRoboName(token.identity));

			if (wasMicrophone) await this.publishMicrophone();
			if (wasCamera) await this.publishCamera();
		} catch (err) {
			console.error("Reconnect: failed", err);
			runInAction(() => {
				root.room.error = t("toast.connection_failed");
			});
			this.scheduleReconnect(roomId);
		}
	}

}
