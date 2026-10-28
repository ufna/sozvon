import BaseData from "@/data/base-data.js";

export class UserData extends BaseData {

	tracks = [];

	constructor() {
		super({
			main: { type: Boolean, default: false },
			identity: { type: String, default: null },
			connected: { type: Boolean, default: false },
			name: { type: String, default: null },

			speaking: { type: Boolean, default: false },

			microphone: { type: Boolean, default: false },
			camera: { type: Boolean, default: false },
			screencast: { type: Boolean, default: false },
			screencastAudio: { type: Boolean, default: false },

			microphoneSid: { type: String, default: null },
			cameraSid: { type: String, default: null },
			screencastSid: { type: String, default: null },
			screencastAudioSid: { type: String, default: null },

			previewCamera: { type: Boolean, default: false },
		});
	}
}
