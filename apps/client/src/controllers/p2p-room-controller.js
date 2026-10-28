import { BackgroundBlur } from "@livekit/track-processors";
import { LocalVideoTrack, Track } from "livekit-client";
import { runInAction } from "mobx";

import appConfig from "@/config.js";
import { BACKGROUND_BLUR_RADIUS } from "@/constants.js";
import { BaseRoomController } from "@/controllers/base-room-controller.js";
import root from "@/data/root-data.js";
import { jsonFetch } from "@/utils/fetch.js";
import { t } from "@/utils/locale.js";
import { generateRoboName } from "@/utils/user-generator.js";
import { isEmpty, isValid } from "@/utils/utils.js";

// P2P debug logging - only in dev mode
function p2pLog(...args) {
	if (appConfig.devMode) {
		console.log("[P2P]", ...args);
	}
}

function p2pError(...args) {
	console.error("[P2P]", ...args);
}

const CAMERA_PRESETS = [
	{
		capture: {
			width: { ideal: 640, max: 640 },
			height: { ideal: 360, max: 360 },
			frameRate: { ideal: 15, max: 15 },
		},
		publish: {
			maxBitrate: 150_000,
		},
	},
	{
		capture: {
			width: { ideal: 1280, max: 1280 },
			height: { ideal: 720, max: 720 },
			frameRate: { ideal: 30, max: 30 },
		},
		publish: {
			maxBitrate: 1_000_000,
		},
	},
	{
		capture: {
			width: { ideal: 1920, max: 1920 },
			height: { ideal: 1080, max: 1080 },
			frameRate: { ideal: 30, max: 30 },
		},
		publish: {
			maxBitrate: 1_800_000,
		},
	},
];

const SCREENCAST_PRESETS = [
	{
		capture: {
			width: { ideal: 1280, max: 1280 },
			height: { ideal: 720, max: 720 },
			frameRate: { ideal: 10, max: 10 },
		},
		publish: {
			maxBitrate: 800_000,
		},
	},
	{
		capture: {
			width: { ideal: 1280, max: 1280 },
			height: { ideal: 720, max: 720 },
			frameRate: { ideal: 30, max: 30 },
		},
		publish: {
			maxBitrate: 1_200_000,
		},
	},
	{
		capture: {
			width: { ideal: 1920, max: 1920 },
			height: { ideal: 1080, max: 1080 },
			frameRate: { ideal: 30, max: 30 },
		},
		publish: {
			maxBitrate: 2_500_000,
		},
	},
];

const MICROPHONE_PRESETS = [
	{
		capture: {
			echoCancellation: true,
			noiseSuppression: true,
			autoGainControl: true,
			channelCount: 1,
		},
		publish: {
			maxBitrate: 12_000,
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
			maxBitrate: 20_000,
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
			maxBitrate: 48_000,
		},
	},
];

const RECONNECT_TIMEOUT = 5000;
const RECONNECT_DELAY = 3000;
const SPEAKING_THRESHOLD = 10;


// ---------------------------------------------------------------------------
// Shim layer: makes raw MediaStreamTracks behave like LiveKit track objects
// so the existing UI (which calls track.attach / track.detach) works unchanged.
// ---------------------------------------------------------------------------

class TrackShim {
	constructor(mediaStreamTrack, source, preset = null) {
		this.mediaStreamTrack = mediaStreamTrack;
		this.source = source;
		this.preset = preset;
		this.sid = `p2p-${source}-${globalThis.crypto.randomUUID()}`;
		this._elements = new Set();
		this._onUnmuteCallback = null;

		// Re-attach elements when track unmutes (browser may not render muted tracks)
		this.mediaStreamTrack.onunmute = () => {
			p2pLog(` TrackShim unmute: ${source}, reattaching ${this._elements.size} elements`);
			this.reattachAll();
			if (this._onUnmuteCallback) {
				this._onUnmuteCallback();
			}
		};
	}

	onUnmute(callback) {
		this._onUnmuteCallback = callback;
	}

	attach(element) {
		if (!element) {
			p2pLog(` TrackShim.attach: no element provided for ${this.source}`);
			return element;
		}

		p2pLog(` TrackShim.attach: ${this.source}, element=${element.tagName}, muted=${this.mediaStreamTrack.muted}`);
		const stream = new MediaStream([ this.mediaStreamTrack ]);
		element.srcObject = stream;
		this._elements.add(element);

		// For video elements, allow muted autoplay (browsers permit this)
		if (element.tagName === "VIDEO") {
			element.muted = true;
		}

		// Ensure playback starts
		if (element.play) {
			element.play().catch((err) => {
				p2pLog(` TrackShim.attach: play() failed for ${this.source}, will retry on user interaction`);
				// Retry on next user interaction
				const retryPlay = () => {
					element.play().catch(() => {});
					document.removeEventListener("click", retryPlay);
					document.removeEventListener("touchstart", retryPlay);
				};
				document.addEventListener("click", retryPlay, { once: true });
				document.addEventListener("touchstart", retryPlay, { once: true });
			});
		}

		p2pLog(` TrackShim.attach: now tracking ${this._elements.size} elements for ${this.source}`);
		return element;
	}

	reattachAll() {
		for (const el of this._elements) {
			const stream = new MediaStream([ this.mediaStreamTrack ]);
			el.srcObject = stream;
			if (el.tagName === "VIDEO") {
				el.muted = true;
			}
			if (el.play) {
				el.play().catch(() => {});
			}
		}
	}

	detach(element) {
		if (element) {
			element.srcObject = null;
			this._elements.delete(element);
		} else {
			for (const el of this._elements) {
				el.srcObject = null;
			}
			this._elements.clear();
		}
	}

	stop() {
		this.mediaStreamTrack.stop();
		this.detach();
	}
}

class PublicationShim {
	constructor(trackShim, sendHint = null) {
		this.track = trackShim;
		this.source = trackShim.source;
		this.isEnabled = true;
		this._sendHint = sendHint;
	}

	get isMuted() {
		const raw = this.track?.mediaStreamTrack;
		// For remote tracks, only check if the track exists and is live.
		// Don't check muted (transient) or enabled (controlled by hints).
		return !raw || raw.readyState !== "live";
	}

	setSubscribed(subscribed) {
		if (this.track?.mediaStreamTrack) {
			this.track.mediaStreamTrack.enabled = subscribed;
		}
	}

	setVideoDimensions({ width, height }) {
		// Don't disable the track - just send hints to the sender for quality adjustment
		if (this._sendHint) {
			this._sendHint(this.source, width, height);
		}
	}
}

class ParticipantShim {
	constructor(identity) {
		this.identity = identity;
		this._publications = new Map();
		this._audioCtx = null;
		this._analyser = null;
	}

	get isSpeaking() {
		return this.checkSpeaking();
	}

	getTrackPublications() {
		return [ ...this._publications.values() ];
	}

	get trackPublications() {
		return this._publications;
	}

	addTrack(trackShim, sendHint = null) {
		this._publications.set(trackShim.sid, new PublicationShim(trackShim, sendHint));
	}

	removeTrackBySource(source) {
		for (const [ sid, pub ] of this._publications) {
			if (pub.source === source) {
				this._publications.delete(sid);
				return pub.track;
			}
		}
		return null;
	}

	setupSpeakingDetection(audioTrack, stream) {
		this.destroyAudioContext();

		try {
			const ctx = new AudioContext();
			const source = ctx.createMediaStreamSource(stream || new MediaStream([ audioTrack ]));
			const analyser = ctx.createAnalyser();
			analyser.fftSize = 256;
			analyser.smoothingTimeConstant = 0.2;
			source.connect(analyser);

			this._audioCtx = ctx;
			this._analyser = analyser;
		} catch (err) {
			p2pError("Speaking detection setup error:", err);
		}
	}

	checkSpeaking() {
		if (!this._analyser) return false;

		const data = new Uint8Array(this._analyser.frequencyBinCount);
		this._analyser.getByteFrequencyData(data);

		let sum = 0;
		for (let i = 0; i < data.length; i++) {
			sum += data[i];
		}
		return sum / data.length > SPEAKING_THRESHOLD;
	}

	destroyAudioContext() {
		if (this._audioCtx) {
			try {
				this._audioCtx.close();
			} catch {}
			this._audioCtx = null;
			this._analyser = null;
		}
	}
}

// ---------------------------------------------------------------------------
// RoomShim — manages WebSocket signaling, RTCPeerConnection mesh, and data
// channels. Mirrors LiveKit's Room: the controller subscribes to events and
// manages local media / MobX; RoomShim owns all connection plumbing.
// ---------------------------------------------------------------------------

class RoomShim {
	constructor(localIdentity, hints) {
		this.localParticipant = new ParticipantShim(localIdentity);
		this.remoteParticipants = new Map();
		this._listeners = new Map();
		this._hints = hints;
		this._peers = new Map();
		this._ws = null;
		this._remoteHints = new Map();
		this._localTracks = [];
		this._disconnected = false;
	}

	// --- Event emitter ---

	on(event, fn) {
		if (!this._listeners.has(event)) {
			this._listeners.set(event, []);
		}
		this._listeners.get(event).push(fn);
	}

	_emit(event, ...args) {
		const fns = this._listeners.get(event);
		if (fns) {
			for (const fn of fns) fn(...args);
		}
	}

	removeAllListeners() {
		this._listeners.clear();
	}

	async startAudio() {
		// No-op for P2P — audio plays directly via <audio> elements
	}

	// --- Public API ---

	connect(wsUrl, token) {
		this._disconnected = false;

		if (this._ws) {
			this._ws.close();
			this._ws = null;
		}

		const ws = new WebSocket(wsUrl);
		this._ws = ws;

		ws.onopen = () => {
			p2pLog("WebSocket connected");
			ws.send(JSON.stringify({ type: "join", token }));
		};

		ws.onmessage = (event) => {
			let msg;
			try {
				msg = JSON.parse(event.data);
			} catch {
				return;
			}

			if (msg.type === "peers") {
				for (const peerId of msg.peers) {
					this._addPeer(peerId, true);
				}
			} else if (msg.type === "peer-joined") {
				if (!this.remoteParticipants.has(msg.identity)) {
					this.remoteParticipants.set(msg.identity, new ParticipantShim(msg.identity));
				}
				const participant = this.remoteParticipants.get(msg.identity);
				this._emit("participantConnected", participant);
			} else if (msg.type === "peer-left") {
				this._removePeer(msg.identity);
			} else if (msg.type === "signal") {
				this._handleSignal(msg.from, msg.data);
			}
		};

		ws.onclose = () => {
			p2pLog("WebSocket closed");
			this._emit("disconnected");
		};

		ws.onerror = () => {};
	}

	disconnect() {
		this._disconnected = true;

		for (const [ identity, peer ] of this._peers) {
			try {
				peer.connection.close();
			} catch {}
			const participant = this.remoteParticipants.get(identity);
			if (participant) participant.destroyAudioContext();
		}
		this._peers.clear();
		this.remoteParticipants.clear();

		if (this._ws) {
			this._ws.close();
			this._ws = null;
		}

		this.localParticipant.destroyAudioContext();
		this._remoteHints.clear();
		this._localTracks = [];
	}

	addTrack(rawTrack, stream) {
		p2pLog(` RoomShim.addTrack: ${rawTrack.kind}, id=${rawTrack.id}, peers=${this._peers.size}`);
		this._localTracks.push({ rawTrack, stream });

		for (const [ identity, peer ] of this._peers) {
			try {
				p2pLog(` Adding track to peer ${identity}: ${rawTrack.kind}`);
				const sender = peer.connection.addTrack(rawTrack, stream);
				peer.senders.set(rawTrack.id, sender);
				this._configureSender(peer.connection, sender, rawTrack);
			} catch (err) {
				p2pError("Error adding track to peer:", err);
			}
		}
	}

	removeTrack(rawTrack) {
		this._localTracks = this._localTracks.filter((t) => t.rawTrack !== rawTrack);

		for (const [ , peer ] of this._peers) {
			const sender = peer.senders.get(rawTrack.id);
			if (sender) {
				try {
					peer.connection.removeTrack(sender);
				} catch {}
				peer.senders.delete(rawTrack.id);
			}
		}
	}

	async replaceTrack(oldTrack, newTrack) {
		const entry = this._localTracks.find((t) => t.rawTrack === oldTrack);
		if (entry) {
			entry.rawTrack = newTrack;
			entry.stream = new MediaStream([ newTrack ]);
		}

		for (const [ , peer ] of this._peers) {
			const sender = peer.senders.get(oldTrack.id);
			if (sender) {
				await sender.replaceTrack(newTrack);
				peer.senders.delete(oldTrack.id);
				peer.senders.set(newTrack.id, sender);
			}
		}
	}

	reapplyHints(source) {
		for (const [ identity ] of this._peers) {
			this._applySenderHint(identity, source);
		}
	}

	sendData(payload) {
		for (const [ , peer ] of this._peers) {
			if (peer.dataChannel && peer.dataChannel.readyState === "open") {
				try {
					peer.dataChannel.send(payload);
				} catch {}
			}
		}
	}

	sendDataTo(identity, payload) {
		const peer = this._peers.get(identity);
		if (peer?.dataChannel?.readyState === "open") {
			try {
				peer.dataChannel.send(payload);
			} catch {}
		}
	}

	// --- Internal: signaling ---

	_sendSignal(targetIdentity, message) {
		if (this._ws && this._ws.readyState === WebSocket.OPEN) {
			this._ws.send(JSON.stringify({
				type: "signal",
				target: targetIdentity,
				data: message,
			}));
		}
	}

	_sendSignalWithTrackSources(identity, connection) {
		const desc = connection.localDescription;
		const trackSources = {};

		p2pLog(` _sendSignalWithTrackSources to ${identity}, type=${desc.type}, transceivers=${connection.getTransceivers().length}`);

		for (const transceiver of connection.getTransceivers()) {
			p2pLog(` Transceiver: mid=${transceiver.mid}, track=${transceiver.sender.track?.kind || "none"}, direction=${transceiver.direction}`);
			if (transceiver.mid && transceiver.sender.track) {
				const source = this._getSourceForLocalTrack(transceiver.sender.track);
				if (source) {
					trackSources[transceiver.mid] = source;
				} else {
					p2pLog(` WARNING: No source found for track ${transceiver.sender.track.kind}`);
				}
			}
		}

		p2pLog(` Sending ${desc.type} with trackSources:`, trackSources);
		this._sendSignal(identity, { type: desc.type, sdp: desc.sdp, trackSources });
	}

	// --- Internal: peer management ---

	_addPeer(identity, isInitiator) {
		if (this._peers.has(identity)) return;

		if (!this.remoteParticipants.has(identity)) {
			this.remoteParticipants.set(identity, new ParticipantShim(identity));
		}
		const participant = this.remoteParticipants.get(identity);
		this._emit("participantConnected", participant);

		const connection = new RTCPeerConnection({
			iceServers: appConfig.iceServers,
		});

		const senders = new Map();

		let dataChannel = null;
		if (isInitiator) {
			dataChannel = connection.createDataChannel("chat", { ordered: true });
			this._setupDataChannel(dataChannel, identity);
		}

		connection.ondatachannel = (event) => {
			const peer = this._peers.get(identity);
			if (peer) {
				peer.dataChannel = event.channel;
				this._setupDataChannel(event.channel, identity);
			}
		};

		connection.onicecandidate = (event) => {
			if (event.candidate) {
				p2pLog(` Sending ICE candidate to ${identity}: ${event.candidate.candidate.substring(0, 50)}...`);
				this._sendSignal(identity, {
					type: "ice-candidate",
					candidate: event.candidate,
				});
			} else {
				p2pLog(` ICE gathering complete for ${identity}`);
			}
		};

		connection.ontrack = (event) => {
			const track = event.track;
			const stream = event.streams[0];

			p2pLog(` ontrack: received ${track.kind} track from ${identity}, mid=${event.transceiver.mid}, readyState=${track.readyState}`);

			if (!this.remoteParticipants.has(identity)) {
				this.remoteParticipants.set(identity, new ParticipantShim(identity));
			}

			const peer = this._peers.get(identity);
			const source = peer?.trackSources?.[event.transceiver.mid];
			p2pLog(" ontrack: trackSources=", peer?.trackSources, `source for mid ${event.transceiver.mid}=`, source);
			if (!source) {
				p2pLog(" ontrack: no source found, adding to pendingTracks");
				if (!peer.pendingTracks) peer.pendingTracks = [];
				peer.pendingTracks.push({ track, stream, transceiver: event.transceiver });
				return;
			}

			this._processReceivedTrack(identity, track, stream, source);
		};

		connection.onnegotiationneeded = async() => {
			p2pLog(` onnegotiationneeded fired for ${identity}, signalingState=${connection.signalingState}`);
			const peer = this._peers.get(identity);
			if (!peer) {
				p2pLog(` onnegotiationneeded: no peer for ${identity}`);
				return;
			}
			peer.makingOffer = true;
			try {
				await connection.setLocalDescription();
				p2pLog(` onnegotiationneeded: created ${connection.localDescription?.type} for ${identity}`);
				this._sendSignalWithTrackSources(identity, connection);
			} catch (err) {
				p2pError(`Negotiation error for ${identity}:`, err);
			} finally {
				peer.makingOffer = false;
			}
		};

		connection.onconnectionstatechange = () => {
			const state = connection.connectionState;
			p2pLog(` Connection to ${identity}: ${state}`);

			if (state === "failed" || state === "disconnected") {
				this._handlePeerConnectionFailure(identity, connection);
			}
		};

		connection.oniceconnectionstatechange = () => {
			p2pLog(` ICE connection to ${identity}: ${connection.iceConnectionState}`);
		};

		connection.onicegatheringstatechange = () => {
			p2pLog(` ICE gathering for ${identity}: ${connection.iceGatheringState}`);
		};

		connection.onicecandidateerror = (event) => {
			p2pError(`ICE candidate error for ${identity}:`, event.errorCode, event.errorText, event.url);
		};

		const peer = { connection, dataChannel, senders, makingOffer: false, isInitiator, trackSources: {} };
		this._peers.set(identity, peer);

		this._addLocalTracksToConnection(peer);

		if (isInitiator && peer.senders.size === 0) {
			this._createAndSendOffer(identity, connection);
		}
	}

	_removePeer(identity) {
		const peer = this._peers.get(identity);
		if (!peer) return;

		try {
			peer.connection.close();
		} catch {}
		this._peers.delete(identity);
		this._remoteHints.delete(identity);

		const participant = this.remoteParticipants.get(identity);
		if (participant) {
			participant.destroyAudioContext();
			this.remoteParticipants.delete(identity);
		}

		this._emit("participantDisconnected");
	}

	_handleSignal(fromIdentity, message) {
		if (!this._peers.has(fromIdentity)) {
			this._addPeer(fromIdentity, false);
		}

		const peer = this._peers.get(fromIdentity);
		peer.signalChain = (peer.signalChain || Promise.resolve())
			.then(() => this._processSignal(peer, fromIdentity, message))
			.catch((err) => p2pError(`Signal handling error for ${fromIdentity}:`, err));
	}

	async _processSignal(peer, fromIdentity, message) {
		const connection = peer.connection;

		p2pLog(` Processing signal ${message.type} from ${fromIdentity}, signalingState=${connection.signalingState}`);

		if (message.type === "offer") {
			const offerCollision = peer.makingOffer || connection.signalingState !== "stable";
			const polite = this.localParticipant.identity < fromIdentity;

			if (offerCollision && !polite) {
				p2pLog(` Ignoring offer collision from ${fromIdentity} (not polite)`);
				return;
			}

			if (message.trackSources) {
				p2pLog(` Received trackSources from ${fromIdentity}:`, message.trackSources);
				peer.trackSources = { ...peer.trackSources, ...message.trackSources };
				this._processPendingTracks(fromIdentity);
			}

			await connection.setRemoteDescription(new RTCSessionDescription(message));
			const answer = await connection.createAnswer();
			await connection.setLocalDescription(answer);
			p2pLog(` Sent answer to ${fromIdentity}, signalingState=${connection.signalingState}`);
			this._sendSignalWithTrackSources(fromIdentity, connection);
			this._reconcileTracks(fromIdentity);

			// After answering, check if we have local tracks that weren't included
			// in the answer (because they weren't in the offer). If so, we need to
			// send our own offer to establish those tracks.
			this._scheduleRenegotiationIfNeeded(fromIdentity);
		} else if (message.type === "answer") {
			if (message.trackSources) {
				peer.trackSources = { ...peer.trackSources, ...message.trackSources };
				this._processPendingTracks(fromIdentity);
			}
			await connection.setRemoteDescription(new RTCSessionDescription(message));
			this._reconcileTracks(fromIdentity);
		} else if (message.type === "ice-candidate") {
			try {
				await connection.addIceCandidate(new RTCIceCandidate(message.candidate));
			} catch {}
		}
	}

	_processPendingTracks(identity) {
		const peer = this._peers.get(identity);
		if (!peer?.pendingTracks?.length) {
			p2pLog(` _processPendingTracks: no pending tracks for ${identity}`);
			return;
		}

		p2pLog(` _processPendingTracks: processing ${peer.pendingTracks.length} pending tracks for ${identity}`);

		const remaining = [];
		for (const entry of peer.pendingTracks) {
			const source = peer.trackSources?.[entry.transceiver.mid];
			p2pLog(` _processPendingTracks: mid=${entry.transceiver.mid}, source=${source}, track.kind=${entry.track.kind}`);
			if (source) {
				this._processReceivedTrack(identity, entry.track, entry.stream, source);
			} else {
				remaining.push(entry);
			}
		}
		peer.pendingTracks = remaining;
		p2pLog(` _processPendingTracks: ${remaining.length} tracks still pending`);
	}

	_processReceivedTrack(identity, track, stream, source) {
		p2pLog(` _processReceivedTrack: ${track.kind} track for ${identity}, source=${source}, readyState=${track.readyState}, muted=${track.muted}`);

		if (!this.remoteParticipants.has(identity)) {
			this.remoteParticipants.set(identity, new ParticipantShim(identity));
		}
		const participant = this.remoteParticipants.get(identity);

		participant.removeTrackBySource(source);

		const trackShim = new TrackShim(track, source);
		participant.addTrack(trackShim, (hintSource, width, height) => {
			const peer = this._peers.get(identity);
			if (peer?.dataChannel?.readyState === "open") {
				try {
					peer.dataChannel.send(JSON.stringify({ type: "video-hint", source: hintSource, width, height }));
				} catch {}
			}
		});

		if (track.kind === "audio") {
			participant.setupSpeakingDetection(track, stream);
		}

		// Find publication first (before setting up event handlers)
		let newPub = null;
		for (const [ , pub ] of participant.trackPublications) {
			if (pub.track === trackShim) {
				newPub = pub;
				break;
			}
		}

		track.onended = () => {
			p2pLog(` Track ended: ${track.kind} for ${identity}, source=${source}`);
			participant.removeTrackBySource(source);
			this._emit("trackUnsubscribed");
		};

		// Re-emit trackSubscribed when track unmutes so UI updates
		trackShim.onUnmute(() => {
			p2pLog(` Track unmuted callback: ${track.kind} for ${identity}, source=${source}`);
			this._emit("trackSubscribed", trackShim, newPub, participant);
		});

		p2pLog(` Emitting trackSubscribed for ${source}, track.kind=${track.kind}, muted=${track.muted}`);
		this._emit("trackSubscribed", trackShim, newPub, participant);
	}

	_reconcileTracks(identity) {
		const peer = this._peers.get(identity);
		if (!peer) return;

		const participant = this.remoteParticipants.get(identity);
		if (!participant) return;

		const connection = peer.connection;
		const receiving = new Map();

		p2pLog(` _reconcileTracks for ${identity}, trackSources=`, peer.trackSources);

		for (const transceiver of connection.getTransceivers()) {
			if (!transceiver.mid) {
				p2pLog(" _reconcileTracks: transceiver has no mid, skipping");
				continue;
			}

			const source = peer.trackSources[transceiver.mid];
			if (!source) {
				p2pLog(` _reconcileTracks: no source for mid=${transceiver.mid}, skipping`);
				continue;
			}

			const dir = transceiver.currentDirection;
			p2pLog(` _reconcileTracks: mid=${transceiver.mid}, source=${source}, direction=${dir}`);
			if (dir !== "recvonly" && dir !== "sendrecv") continue;

			const receiverTrack = transceiver.receiver.track;
			if (!receiverTrack || receiverTrack.readyState === "ended") {
				p2pLog(" _reconcileTracks: no receiver track or ended, skipping");
				continue;
			}
			receiving.set(source, receiverTrack);
		}

		// A remote track can stay live after removeTrack() changes its transceiver
		// to sendonly/inactive. Remove its publication so the UI clears the frame.
		for (const pub of participant.getTrackPublications()) {
			if (receiving.get(pub.source) !== pub.track?.mediaStreamTrack) {
				participant.removeTrackBySource(pub.source)?.detach();
				if (pub.source === Track.Source.Microphone) participant.destroyAudioContext();
				this._emit("trackUnsubscribed");
			}
		}

		for (const [ source, receiverTrack ] of receiving) {
			const hasLiveTrack = participant.getTrackPublications().some((pub) => pub.source === source && pub.track?.mediaStreamTrack === receiverTrack);
			p2pLog(` _reconcileTracks: hasLiveTrack=${hasLiveTrack} for source=${source}`);
			if (!hasLiveTrack) {
				p2pLog(` _reconcileTracks: processing received track for source=${source}`);
				const stream = new MediaStream([ receiverTrack ]);
				this._processReceivedTrack(identity, receiverTrack, stream, source);
			}
		}
	}

	_scheduleRenegotiationIfNeeded(identity) {
		// Use setTimeout to ensure we're after the current signaling transaction completes
		setTimeout(() => {
			const peer = this._peers.get(identity);
			if (!peer) {
				p2pLog(` Renegotiation check: no peer for ${identity}`);
				return;
			}
			if (peer.makingOffer) {
				p2pLog(` Renegotiation check: already making offer for ${identity}`);
				return;
			}

			const connection = peer.connection;
			p2pLog(` Renegotiation check for ${identity}: signalingState=${connection.signalingState}`);

			if (connection.signalingState !== "stable") {
				// Retry after a short delay if not stable yet
				setTimeout(() => this._scheduleRenegotiationIfNeeded(identity), 100);
				return;
			}

			// Check if we have local tracks with transceivers that don't have a mid
			// (meaning they weren't negotiated in the offer/answer exchange)
			let hasUnnegotiatedTracks = false;
			for (const transceiver of connection.getTransceivers()) {
				const track = transceiver.sender.track;
				if (track) {
					p2pLog(` Transceiver: mid=${transceiver.mid}, kind=${track.kind}, direction=${transceiver.direction}`);
					if (transceiver.mid === null) {
						hasUnnegotiatedTracks = true;
					}
				}
			}

			if (hasUnnegotiatedTracks) {
				p2pLog(` Triggering renegotiation for ${identity} - local tracks need to be sent`);
				this._createAndSendOffer(identity, connection);
			} else {
				p2pLog(` No renegotiation needed for ${identity} - all tracks have mid`);
			}
		}, 0);
	}

	async _createAndSendOffer(identity, connection, { iceRestart = false } = {}) {
		const peer = this._peers.get(identity);
		if (!peer) return;
		peer.makingOffer = true;
		try {
			if (iceRestart) {
				const offer = await connection.createOffer({ iceRestart: true });
				await connection.setLocalDescription(offer);
			} else {
				await connection.setLocalDescription();
			}
			this._sendSignalWithTrackSources(identity, connection);
		} catch (err) {
			p2pError(`Error creating offer for ${identity}:`, err);
		} finally {
			peer.makingOffer = false;
		}
	}

	_handlePeerConnectionFailure(identity, connection) {
		setTimeout(() => {
			if (this._disconnected) return;
			const peer = this._peers.get(identity);
			if (!peer || peer.connection !== connection) return;

			if (connection.connectionState === "failed" || connection.connectionState === "disconnected") {
				p2pLog(` Attempting ICE restart for ${identity}`);
				try {
					this._createAndSendOffer(identity, connection, { iceRestart: true });
				} catch {
					p2pLog(` ICE restart failed, removing peer ${identity}`);
					this._removePeer(identity);
				}
			}
		}, RECONNECT_TIMEOUT);
	}

	// --- Internal: data channel ---

	_setupDataChannel(channel, identity) {
		const onOpen = () => {
			this._sendPendingHints(identity, channel);
			this._emit("dataChannelOpen", identity);
		};

		channel.onopen = onOpen;

		if (channel.readyState === "open") {
			onOpen();
		}

		channel.onmessage = (event) => {
			try {
				const msg = JSON.parse(event.data);
				if (msg.type === "chat") {
					this._emit("dataReceived", msg, identity);
				} else if (msg.type === "name") {
					this._emit("nameReceived", msg.name, identity);
				} else if (msg.type === "video-hint") {
					this._onRemoteVideoHint(identity, msg.source, msg.width, msg.height);
				}
			} catch {}
		};
	}

	_sendPendingHints(identity, channel) {
		for (const [ key, dimensions ] of this._hints) {
			if (key.startsWith(identity + "_")) {
				const source = key.substring(identity.length + 1);
				try {
					channel.send(JSON.stringify({
						type: "video-hint",
						source,
						width: dimensions.width,
						height: dimensions.height,
					}));
				} catch {}
			}
		}
	}

	// --- Internal: tracks & encoding ---

	_addLocalTracksToConnection(peer) {
		p2pLog(` Adding ${this._localTracks.length} local tracks to peer connection`);
		for (const { rawTrack, stream } of this._localTracks) {
			p2pLog(` Adding track: ${rawTrack.kind}, id=${rawTrack.id}`);
			const sender = peer.connection.addTrack(rawTrack, stream);
			peer.senders.set(rawTrack.id, sender);
			this._configureSender(peer.connection, sender, rawTrack);
		}
	}

	_configureSender(connection, sender, track) {
		let preset = null;
		for (const [ , pub ] of this.localParticipant._publications) {
			if (pub.track?.mediaStreamTrack === track) {
				preset = pub.track.preset;
				break;
			}
		}
		if (!preset?.publish) return;

		try {
			const { maxBitrate } = preset.publish;

			const params = sender.getParameters();
			if (params.encodings && params.encodings.length > 0) {
				if (maxBitrate > 0) {
					params.encodings[0].maxBitrate = maxBitrate;
				}

				if (track.kind === "video") {
					const { width: captureWidth, height: captureHeight } = track.getSettings();
					params.encodings[0].scaleResolutionDownBy = Math.max(captureWidth, captureHeight);
				}

				sender.setParameters(params).catch(() => {});
			}
		} catch (err) {
			p2pError("Error configuring sender:", err);
		}
	}

	_getSourceForLocalTrack(mediaStreamTrack) {
		for (const [ , pub ] of this.localParticipant._publications) {
			if (pub.track?.mediaStreamTrack === mediaStreamTrack) {
				return pub.source;
			}
		}
		return null;
	}

	// --- Internal: video quality hints ---

	_onRemoteVideoHint(identity, source, width, height) {
		if (!this._remoteHints.has(identity)) {
			this._remoteHints.set(identity, new Map());
		}

		const peerHints = this._remoteHints.get(identity);

		if (width === 0 || height === 0) {
			peerHints.delete(source);
		} else {
			peerHints.set(source, { width, height });
		}

		this._applySenderHint(identity, source);
	}

	_applySenderHint(identity, source) {
		const peer = this._peers.get(identity);
		if (!peer) return;

		let localTrack = null;
		for (const [ , pub ] of this.localParticipant._publications) {
			if (pub.source === source) {
				localTrack = pub.track?.mediaStreamTrack;
				break;
			}
		}
		if (!localTrack) return;

		const sender = peer.senders.get(localTrack.id);
		if (!sender) return;

		const { width: captureWidth, height: captureHeight } = localTrack.getSettings();

		const peerHints = this._remoteHints.get(identity);
		const hint = peerHints?.get(source);

		try {
			const params = sender.getParameters();
			if (!params.encodings || params.encodings.length === 0) return;

			const target = isValid(hint) ? hint : { width: 1, height: 1 };
			const scale = Math.max(1, Math.max(captureWidth / target.width, captureHeight / target.height));
			params.encodings[0].scaleResolutionDownBy = scale;

			sender.setParameters(params).catch(() => {});
		} catch (err) {
			p2pError("Error applying sender hint:", err);
		}
	}
}

// ---------------------------------------------------------------------------
// P2PRoomController
// ---------------------------------------------------------------------------

export class P2PRoomController extends BaseRoomController {
	reconnectTimer = null;
	scanInterval = null;
	lkVideoTrack = null;
	_currentName = null;

	async start(roomId) {
		this.stopped = false;

		const token = await this.fetchToken(roomId);
		if (!isValid(token)) return;

		await this.initRoom(roomId, token.identity);

		try {
			const room = this.createRoom(roomId, token.identity);

			room.connect(appConfig.serverWsUrl + "signaling", token.token);

			this.room = room;
			runInAction(() => {
				root.room.state = "connected";
			});

			this.sendName(root.settings.displayName || generateRoboName(token.identity));
			this.scanTracks();
			this.scanInterval = setInterval(() => this.scanTracks(), 1000);
		} catch (err) {
			p2pError("Start: connection failed", err);
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

		if (this.microphoneTrack) this.microphoneTrack.stop();
		if (this.cameraTrack) this.cameraTrack.stop();
		if (this.screencastTrack) this.screencastTrack.stop();

		if (this.lkVideoTrack) this.lkVideoTrack.stop();
		this.lkVideoTrack = null;

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
			if (isValid(this.microphoneTrack)) return;

			const preset = MICROPHONE_PRESETS[root.settings.microphoneQuality] || MICROPHONE_PRESETS[1];
			const microphoneConstraints = { ...preset.capture };
			if (!isEmpty(root.microphoneDeviceId)) {
				microphoneConstraints.deviceId = { exact: root.microphoneDeviceId };
			}

			const stream = await navigator.mediaDevices.getUserMedia({
				audio: microphoneConstraints,
				video: false,
			});

			const ctx = new AudioContext();
			try {
				await ctx.resume();
			} catch {}

			const rawTrack = stream.getAudioTracks()[0];

			const trackShim = new TrackShim(rawTrack, Track.Source.Microphone, preset);
			this.microphoneTrack = trackShim;

			this.room.localParticipant.addTrack(trackShim);
			this.room.addTrack(rawTrack, stream);
			this.room.localParticipant.setupSpeakingDetection(rawTrack, stream);

			rawTrack.onended = () => {
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
			if (!isValid(this.microphoneTrack)) return;

			const rawTrack = this.microphoneTrack.mediaStreamTrack;
			this.room.removeTrack(rawTrack);

			this.room.localParticipant.removeTrackBySource(Track.Source.Microphone);
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
			if (isValid(this.cameraTrack)) return;

			const cameraPreset = CAMERA_PRESETS[root.settings.cameraQuality] || CAMERA_PRESETS[1];
			const cameraConstraints = { ...cameraPreset.capture };
			if (!isEmpty(root.cameraDeviceId)) {
				cameraConstraints.deviceId = { exact: root.cameraDeviceId };
			}

			let stream;
			try {
				stream = await navigator.mediaDevices.getUserMedia({ video: cameraConstraints });
			} catch (err) {
				p2pError("Camera access error:", err);
				return;
			}
			const rawTrack = stream.getVideoTracks()[0];

			this.lkVideoTrack = new LocalVideoTrack(rawTrack);

			await this.applyBackgroundBlur();

			const activeTrack = this.lkVideoTrack.mediaStreamTrack;

			const trackShim = new TrackShim(activeTrack, Track.Source.Camera, cameraPreset);
			this.cameraTrack = trackShim;

			this.room.localParticipant.addTrack(trackShim);
			this.room.addTrack(activeTrack, new MediaStream([ activeTrack ]));

			rawTrack.onended = () => {
				this.unpublishCamera();
			};

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
			if (!isValid(this.cameraTrack)) return;

			const rawTrack = this.cameraTrack.mediaStreamTrack;
			this.room.removeTrack(rawTrack);

			this.room.localParticipant.removeTrackBySource(Track.Source.Camera);
			this.cameraTrack.detach();
			this.cameraTrack = null;

			if (this.lkVideoTrack) this.lkVideoTrack.stop();
			this.lkVideoTrack = null;

			runInAction(() => {
				root.room.camera = false;
			});
		} finally {
			this.actionInProgress = false;
		}
	}

	async applyBackgroundBlur() {
		if (!isValid(this.lkVideoTrack)) return;

		const level = root.settings.backgroundBlur;
		const radius = BACKGROUND_BLUR_RADIUS[level] || 0;

		try {
			const oldTrack = this.lkVideoTrack.mediaStreamTrack;

			if (radius > 0) {
				await this.lkVideoTrack.setProcessor(BackgroundBlur(radius));
			} else {
				await this.lkVideoTrack.stopProcessor();
			}

			const newTrack = this.lkVideoTrack.mediaStreamTrack;

			if (oldTrack !== newTrack && isValid(this.cameraTrack)) {
				await this.room.replaceTrack(oldTrack, newTrack);

				this.cameraTrack.mediaStreamTrack = newTrack;
				this.cameraTrack.sid = `p2p-${Track.Source.Camera}-${globalThis.crypto.randomUUID()}`;

				this.room.reapplyHints(Track.Source.Camera);
			}
		} catch (err) {
			p2pError("Background blur error:", err);
		}
	}

	// --- Media: Screencast ---

	async publishScreencast() {
		if (this.actionInProgress) return;
		this.actionInProgress = true;

		try {
			if (isValid(this.screencastTrack)) return;

			const screencastPreset = SCREENCAST_PRESETS[root.settings.screencastQuality] || SCREENCAST_PRESETS[1];
			const stream = await navigator.mediaDevices.getDisplayMedia({ video: screencastPreset.capture });
			const rawTrack = stream.getVideoTracks()[0];

			const trackShim = new TrackShim(rawTrack, Track.Source.ScreenShare, screencastPreset);
			this.screencastTrack = trackShim;

			this.room.localParticipant.addTrack(trackShim);
			this.room.addTrack(rawTrack, stream);

			rawTrack.onended = () => {
				this.unpublishScreencast();
			};

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
			if (!isValid(this.screencastTrack)) return;

			const rawTrack = this.screencastTrack.mediaStreamTrack;
			this.room.removeTrack(rawTrack);

			this.room.localParticipant.removeTrackBySource(Track.Source.ScreenShare);
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
		this._currentName = name;
		const payload = JSON.stringify({ type: "name", name });
		this.room.sendData(payload);
	}

	// --- Chat ---

	sendMessage(text) {
		if (!isValid(this.room) || isEmpty(text)) return;

		const payload = JSON.stringify({ type: "chat", text });
		this.room.sendData(payload);

		runInAction(() => {
			root.room.messages.push({ identity: root.room.myIdentity, text, timestamp: Date.now() });
			root.room.messagesTrigger += 1;
		});
	}

	// --- Internal ---

	async fetchToken(roomId) {
		const identity = this.getOrCreateIdentity();

		const payload = await jsonFetch(appConfig.serverUrl + "room/token/p2p/" + roomId, { identity });
		if (!isValid(payload.json) || isValid(payload.json.error)) {
			location.href = "/";
			return null;
		}
		return payload.json;
	}

	createRoom(roomId, identity) {
		const room = new RoomShim(identity, this.hints);

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

		room.on("trackSubscribed", (track, publication, participant) => {
			p2pLog(` Controller: trackSubscribed event, source=${publication?.source}, participant=${participant?.identity}`);
			this.scanTracks();

			// Debug: check MobX state after scanTracks
			const user = root.room?.users?.find((u) => u.identity === participant?.identity);
			p2pLog(` After scanTracks: user=${user?.identity}, camera=${user?.camera}, microphone=${user?.microphone}`);

			this.updateIncomingVideo({ participant, publication });
		});
		room.on("trackUnsubscribed", () => this.scanTracks());

		room.on("dataReceived", (msg, senderIdentity) => {
			runInAction(() => {
				root.room.messages.push({ identity: senderIdentity, text: msg.text, timestamp: Date.now() });
				root.room.messagesTrigger += 1;
			});
		});

		room.on("nameReceived", (name, senderIdentity) => {
			this.names.set(senderIdentity, name);
			runInAction(() => {
				const user = root.room?.users?.find((u) => u.identity === senderIdentity);
				if (user) {
					user.name = name;
					root.room.usersTrigger += 1;
				}
			});
		});

		room.on("dataChannelOpen", (identity) => {
			if (isEmpty(this._currentName)) return;
			const payload = JSON.stringify({ type: "name", name: this._currentName });
			this.room?.sendDataTo(identity, payload);
		});

		room.on("disconnected", () => {
			if (!this.stopped) {
				p2pLog("Disconnected: scheduling reconnect...");
				this.scheduleReconnect(roomId);
			}
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

		p2pLog("Reconnect: fetching new token...");

		try {
			if (isValid(this.room)) {
				this.room.removeAllListeners();
				try {
					this.room.disconnect();
				} catch {}
				this.room = null;
			}

			if (this.microphoneTrack) this.microphoneTrack.stop();
			if (this.cameraTrack) this.cameraTrack.stop();
			if (this.screencastTrack) this.screencastTrack.stop();
			if (this.lkVideoTrack) this.lkVideoTrack.stop();

			this.microphoneTrack = null;
			this.cameraTrack = null;
			this.screencastTrack = null;
			this.lkVideoTrack = null;

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

			const newRoom = this.createRoom(roomId, token.identity);

			newRoom.connect(appConfig.serverWsUrl + "signaling", token.token);

			if (this.stopped) {
				newRoom.disconnect();
				return;
			}

			this.room = newRoom;

			runInAction(() => {
				root.room.error = null;
			});

			p2pLog("Reconnect: success");

			this.sendName(root.settings.displayName || generateRoboName(token.identity));

			if (wasMicrophone) await this.publishMicrophone();
			if (wasCamera) await this.publishCamera();
		} catch (err) {
			p2pError("Reconnect: failed", err);
			runInAction(() => {
				root.room.error = t("toast.connection_failed");
			});
			this.scheduleReconnect(roomId);
		}
	}

}
