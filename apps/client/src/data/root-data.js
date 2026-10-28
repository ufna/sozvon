import BaseData from "@/data/base-data";
import { RoomData } from "@/data/room-data.js";
import SettingsData from "@/data/settings-data.js";

class RootData extends BaseData {
	constructor() {
		super({
			room: { type: RoomData, default: null },
			settings: { type: SettingsData, default: {} },

			cameraDeviceId: { type: String, default: "" },
			microphoneDeviceId: { type: String, default: "" },
			speakerDeviceId: { type: String, default: "" },
			blurSupported: { type: Boolean, default: true },
		});
	}
}

const root = new RootData();

export default root;