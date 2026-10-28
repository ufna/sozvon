import appConfig from "@/config";
import BaseData from "@/data/base-data";

const settingsLocalStorageKey = "settings";

export default class SettingsData extends BaseData {
	constructor() {
		super({
			cameraQuality: { type: Number, default: 1 },
			microphoneQuality: { type: Number, default: 1 },
			screencastQuality: { type: Number, default: 1 },
			mirrorCamera: { type: Boolean, default: true },
			backgroundBlur: { type: Number, default: 0 },
			disableIncomingVideo: { type: Boolean, default: false },
			masterVolume: { type: Number, default: 1 },
			usersVolumes: { type: { Number }, default: {} },
			language: { type: String, default: "" },
			displayName: { type: String, default: "" },
			chatWidth: { type: Number, default: 320 },
			participantsPanelHeight: { type: Number, default: 128 },
		});
	}

	load() {
		const settings = localStorage.getItem(settingsLocalStorageKey) || "{}";
		this.deserialize(JSON.parse(settings));
	}

	save() {
		const object = this.serialize();
		localStorage.setItem(settingsLocalStorageKey, JSON.stringify(object));
	}

}
