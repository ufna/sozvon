import BaseData from "@/data/base-data.js";
import { UserData } from "@/data/user-data.js";

export class RoomData extends BaseData {
	constructor() {
		super({
			roomId: { type: String, default: null },
			state: { type: String, default: "diconnected" },
			error: { type: String, default: null },
			myIdentity: { type: String, default: null },

			entered: { type: Boolean, default: false },
			maximized: { type: [ String ], default: [] },

			users: { type: [ UserData ], default: [] },
			usersTrigger: { type: Number, default: 0 },

			messages: { type: [ Object ], default: [] },
			messagesTrigger: { type: Number, default: 0 },

			hasCamera: { type: Boolean, default: false },
			canSwapCamera: { type: Boolean, default: false },
			hasScreencast: { type: Boolean, default: false },

			microphone: { type: Boolean, default: false },
			camera: { type: Boolean, default: false },
			screencast: { type: Boolean, default: false },
		});
	}
}
