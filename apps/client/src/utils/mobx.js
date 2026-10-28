import { reaction } from "mobx";

export function bind(action, ...properties) {
	return () => {
		if (!Array.isArray(properties)) {
			properties = [ properties ];
		}

		for (let i = 0; i < properties.length; ++i) {
			if (typeof properties[i] !== "function") {
				throw new Error("Property is not a function");
			}
		}

		action();

		let disposers = [];
		for (let i = 0; i < properties.length; ++i) {
			disposers.push(reaction(() => properties[i](),
				() => {
					action();
				}));
		}

		return () => {
			for (let i = 0; i < disposers.length; ++i) {
				disposers[i]();
			}
		};
	};
}

export function bindT(action, ...properties) {
	return () => {
		if (!Array.isArray(properties)) {
			properties = [ properties ];
		}

		for (let i = 0; i < properties.length; ++i) {
			if (typeof properties[i] !== "function") {
				throw new Error("Property is not a function");
			}
		}

		let disposers = [];
		for (let i = 0; i < properties.length; ++i) {
			disposers.push(reaction(() => properties[i](),
				() => {
					action();
				}));
		}

		return () => {
			for (let i = 0; i < disposers.length; ++i) {
				disposers[i]();
			}
		};
	};
}