import { Track } from "livekit-client";
import { runInAction } from "mobx";

import { RoomData } from "@/data/room-data.js";
import root from "@/data/root-data.js";
import { UserData } from "@/data/user-data.js";
import { playJoinSound, playLeaveSound } from "@/utils/sounds.js";
import { generateRoboName } from "@/utils/user-generator.js";
import { isEmpty, isValid } from "@/utils/utils.js";

export class BaseRoomController {
	room = null;
	actionInProgress = false;

	microphoneTrack = null;
	cameraTrack = null;
	screencastTrack = null;
	screencastAudioTrack = null;

	stopped = false;

	hints = new Map();
	names = new Map();

	// --- Toggles ---

	toggleMicrophone() {
		if (isValid(this.microphoneTrack)) {
			this.unpublishMicrophone();
		} else {
			this.publishMicrophone();
		}
	}

	toggleCamera() {
		if (isValid(this.cameraTrack)) {
			this.unpublishCamera();
		} else {
			this.publishCamera();
		}
	}

	toggleScreencast() {
		if (isValid(this.screencastTrack)) {
			this.unpublishScreencast();
		} else {
			this.publishScreencast();
		}
	}

	// --- Devices ---

	async getDevices(skipDefaults = true) {
		const devices = await navigator.mediaDevices.enumerateDevices();

		function isDefault(d) {
			if (skipDefaults) {
				const defaultStr = "default";

				if (d.label.toLowerCase() === defaultStr) {
					return true;
				}

				if (isEmpty(d.deviceId) || d.deviceId.toLowerCase() === defaultStr) {
					return true;
				}
			}

			return false;
		}

		return {
			microphone: devices.filter((d) => d.kind === "audioinput" && !isDefault(d)).map((d) => ({ deviceId: d.deviceId, label: d.label })),
			camera: devices.filter((d) => d.kind === "videoinput" && !isDefault(d)).map((d) => ({ deviceId: d.deviceId, label: d.label })),
			speaker: devices.filter((d) => d.kind === "audiooutput" && !isDefault(d)).map((d) => ({ deviceId: d.deviceId, label: d.label })),
		};
	}

	async switchMicrophoneDevice() {
		if (isValid(this.microphoneTrack)) {
			await this.unpublishMicrophone();
			await this.publishMicrophone();
		}
	}

	async switchCameraDevice() {
		if (isValid(this.cameraTrack)) {
			await this.unpublishCamera();
			await this.publishCamera();
		}
	}

	async swapCamera() {
		const { camera: cameras } = await this.getDevices(false);
		if (cameras.length < 2) return;

		let currentIndex = cameras.findIndex((d) => d.deviceId === root.cameraDeviceId);
		if (currentIndex === -1) currentIndex = 0;
		const nextIndex = (currentIndex + 1) % cameras.length;

		runInAction(() => {
			root.cameraDeviceId = cameras[nextIndex].deviceId;
			root.settings.save();
		});

		await this.switchCameraDevice();
	}

	// --- Preset switching ---

	async switchMicrophonePreset() {
		if (isValid(this.microphoneTrack)) {
			await this.unpublishMicrophone();
			await this.publishMicrophone();
		}
	}

	async switchCameraPreset() {
		if (isValid(this.cameraTrack)) {
			await this.unpublishCamera();
			await this.publishCamera();
		}
	}

	async switchScreencastPreset() {
		if (isValid(this.screencastTrack)) {
			await this.unpublishScreencast();
			await this.publishScreencast();
		}
	}

	// --- Abstract methods (must be overridden by subclasses) ---

	async publishMicrophone() {
		throw new Error("publishMicrophone() not implemented");
	}
	async unpublishMicrophone() {
		throw new Error("unpublishMicrophone() not implemented");
	}
	async publishCamera() {
		throw new Error("publishCamera() not implemented");
	}
	async unpublishCamera() {
		throw new Error("unpublishCamera() not implemented");
	}
	async publishScreencast() {
		throw new Error("publishScreencast() not implemented");
	}
	async unpublishScreencast() {
		throw new Error("unpublishScreencast() not implemented");
	}
	async applyBackgroundBlur() {
		throw new Error("applyBackgroundBlur() not implemented");
	}
	sendMessage(text) {
		throw new Error("sendMessage() not implemented");
	}
	sendName(name) {
		throw new Error("sendName() not implemented");
	}
	// --- Participant sounds ---

	onParticipantConnected() {
		if (root.room?.entered) playJoinSound();
	}

	onParticipantDisconnected() {
		if (root.room?.entered) playLeaveSound();
	}

	// --- Track scanning ---

	buildTrackInfo(participant) {
		const obj = {
			connected: true,
			speaking: false,

			microphone: false,
			camera: false,
			screencast: false,
			screencastAudio: false,

			microphoneSid: null,
			cameraSid: null,
			screencastSid: null,
			screencastAudioSid: null,

			name: isEmpty(participant.name) ? null : participant.name,
		};

		for (const [ , publication ] of participant.trackPublications) {
			if (publication.isEnabled && isValid(publication.track)) {
				if (publication.source === Track.Source.Microphone) {
					obj.speaking ||= participant.isSpeaking;

					obj.microphone = !publication.isMuted;
					obj.microphoneSid = publication.track.sid;
				}

				if (publication.source === Track.Source.Camera) {
					obj.camera = !publication.isMuted;
					obj.cameraSid = publication.track.sid;
				}

				if (publication.source === Track.Source.ScreenShare) {
					obj.screencast = !publication.isMuted;
					obj.screencastSid = publication.track.sid;
				}

				if (publication.source === Track.Source.ScreenShareAudio) {
					obj.screencastAudio = !publication.isMuted;
					obj.screencastAudioSid = publication.track.sid;
				}
			}
		}

		return obj;
	}

	scanTracks() {
		if (!isValid(this.room) || !isValid(root.room)) return;

		const tracks = {};

		tracks[this.room.localParticipant.identity] = this.buildTrackInfo(this.room.localParticipant);

		for (const [ , participant ] of this.room.remoteParticipants) {
			tracks[participant.identity] = this.buildTrackInfo(participant);
		}

		runInAction(() => {
			let triggerUsers = false;

			for (let identity in tracks) {
				const obj = tracks[identity];

				if (obj.connected) {
					let index = root.room.users.findIndex((user) => user.identity === identity);
					if (index === -1) {
						const user = new UserData();
						user.identity = identity;
						user.name = obj.name || this.names.get(identity) || generateRoboName(identity);
						root.room.users.push(user);
						triggerUsers = true;
					} else {
						const existing = root.room.users[index];
						const updatedName = obj.name || this.names.get(identity);
						if (!isEmpty(updatedName) && existing.name !== updatedName) {
							existing.name = updatedName;
							triggerUsers = true;
						}
					}
				}
			}

			for (let user of root.room.users) {
				const obj = tracks[user.identity];

				if (!isValid(obj)) {
					if (user.connected) {
						user.connected = false;
						triggerUsers = true;
					}
				} else {
					const connected = user.main || obj.connected;
					if (user.connected !== connected) {
						user.connected = connected;
						triggerUsers = true;
					}

					const changed =
						user.microphone !== obj.microphone || user.microphoneSid !== obj.microphoneSid ||
						user.camera !== obj.camera || user.cameraSid !== obj.cameraSid ||
						user.screencast !== obj.screencast || user.screencastSid !== obj.screencastSid ||
						user.screencastAudio !== obj.screencastAudio || user.screencastAudioSid !== obj.screencastAudioSid;

					user.speaking = obj.speaking;

					if (changed) {
						user.microphone = obj.microphone;
						user.camera = obj.camera;
						user.screencast = obj.screencast;
						user.screencastAudio = obj.screencastAudio;

						user.microphoneSid = obj.microphoneSid;
						user.cameraSid = obj.cameraSid;
						user.screencastSid = obj.screencastSid;
						user.screencastAudioSid = obj.screencastAudioSid;
					}

					triggerUsers = triggerUsers || changed;
				}
			}

			if (triggerUsers) {
				root.room.usersTrigger += 1;
			}
		});
	}

	updateIncomingVideo({ participant = null, publication = null } = {}) {
		if (!isValid(this.room)) return;
		const disabled = root.settings.disableIncomingVideo;

		for (const [ , _participant ] of this.room.remoteParticipants) {
			if (isValid(participant) && participant !== _participant) continue;

			for (const [ , _publication ] of _participant.trackPublications) {
				if (isValid(publication) && publication !== _publication) continue;

				if (_publication.source === Track.Source.Camera || _publication.source === Track.Source.ScreenShare) {
					if (disabled) {
						_publication.setSubscribed(false);
					} else {
						_publication.setSubscribed(true);

						const key = `${_participant.identity}_${_publication.source}`;
						const dimensions = this.hints.get(key);

						if (isValid(dimensions)) {
							_publication.setVideoDimensions(dimensions);
						} else {
							_publication.setVideoDimensions({ width: 0, height: 0 });
						}
					}
				}
			}
		}
	}
	// --- Video Quality Hints ---

	setVideoHint(identity, source, width, height) {
		if (!isValid(this.room)) return;

		const key = `${identity}_${source}`;
		const empty = width === 0 || height === 0;
		const prev = this.hints.get(key);

		if (empty && !prev) return;
		if (prev && prev.width === width && prev.height === height) return;

		if (empty) {
			this.hints.delete(key);
		} else {
			this.hints.set(key, { width, height });
		}

		const participant = this.room.remoteParticipants.get(identity);
		if (isValid(participant)) {
			for (const [ , publication ] of participant.trackPublications) {
				if (publication.source === source) {
					this.updateIncomingVideo({ participant, publication });
					break;
				}
			}
		}
	}

	// --- Identity ---

	getOrCreateIdentity() {
		let user = localStorage.getItem("user");
		if (isEmpty(user)) {
			user = globalThis.crypto.randomUUID();
			localStorage.setItem("user", user);
		}
		return user;
	}

	// --- Shared init/cleanup ---

	async initRoom(roomId, identity) {
		const { camera: cameras } = await this.getDevices(false);
		const hasCamera = cameras.length > 0;
		const canSwapCamera = cameras.length >= 2;
		const hasScreencast = typeof navigator.mediaDevices.getDisplayMedia === "function";

		runInAction(() => {
			const data = new RoomData();
			data.roomId = roomId;
			data.myIdentity = identity;
			data.hasCamera = hasCamera;
			data.canSwapCamera = canSwapCamera;
			data.hasScreencast = hasScreencast;
			root.room = data;

			const user = new UserData();
			user.main = true;
			user.connected = true;
			user.identity = identity;
			user.name = root.settings.displayName || generateRoboName(identity);
			root.room.users.push(user);

			root.room.usersTrigger += 1;
		});
	}

	resetState() {
		runInAction(() => {
			root.room = null;
		});

		this.room = null;
		this.microphoneTrack = null;
		this.cameraTrack = null;
		this.screencastTrack = null;
		this.screencastAudioTrack = null;
		this.hints.clear();
		this.names.clear();
		this.actionInProgress = false;
	}

}
