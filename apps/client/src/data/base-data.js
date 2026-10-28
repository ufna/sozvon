import { makeObservable, observable } from "mobx";

import appConfig from "@/config.js";

function isValid(value) {
	return value !== undefined && value !== null;
}

function logWarn(...values) {
	if (appConfig.devMode) {
		console.warn(...values);
	}
}

function logError(...values) {
	if (appConfig.devMode) {
		console.error(...values);
	}
}

function prepareFields(fields) {
	const result = {};
	for (let key in fields) {
		let field = fields[key];
		if (isValid(field.type)) {
			result[key] = { type: field.type, default: field.default };
		} else {
			result[key] = { type: field, default: null };
		}

		field = result[key];

		if (!isValid(field.default)) {
			field.default = null;
		}

		if (typeof field.type === "function") {
			field.collection = "none";
		} else if (Array.isArray(field.type)) {
			if (field.type.length !== 1) {
				throw new Error("Wrong type");
			}

			field.type = field.type[0];
			field.collection = "array";
		} else if (typeof field.type === "object") {
			const array = Object.keys(field.type);
			if (array.length !== 1) {
				throw new Error("Wrong type");
			}

			field.type = field.type[array[0]];
			field.collection = "map";
		} else {
			console.log(key, field);
			throw new Error("Wrong type");
		}

		if (typeof field.type !== "function") {
			throw new Error("Wrong type");
		}

		if (field.type.name === "BaseData") {
			throw new Error("Wrong type");
		}

		field.data = field.type.prototype instanceof BaseData;
	}

	return result;
}

function construct(data, fields) {
	const mobxObservable = {};

	for (let key in fields) {
		const field = fields[key];
		deserialize(data, key, field, field.default);
		mobxObservable[key] = observable;
	}

	makeObservable(data, mobxObservable);
}


function customValueOf(value) {
	if (!isValid(value)) {
		return null;
	} else if (value instanceof Date) {
		return value;
	} else if (value instanceof BaseData) {
		return value;
	}

	return value.valueOf();
}

function deserializeObject(field, value) {
	const obj = new field.type(value);
	return customValueOf(obj);
}

function serializeObject(value) {
	if (value.constructor.name === "Object") {
		let object = {};
		for (let key in value) {
			object[key] = serialize(value[key]);
		}
		return object;
	}

	return value.toString();
}

function serialize(value) {
	if (!isValid(value)) {
		return null;
	} else {
		value = customValueOf(value);
		if (value instanceof BaseData) {
			return value.serialize();
		} else if (Array.isArray(value)) {
			let array = [];
			for (let i = 0; i < value.length; i++) {
				array.push(serialize(value[i]));
			}
			return array;
		} else if (typeof value === "object") {
			return serializeObject(value);
		} else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
			return value;
		}
	}

	try {
		return value.serialize();
	} catch (error) {
		logError("Can't deserialize", error);
		return null;
	}
}

function deserialize(instance, key, field, value, patch) {
	if (!isValid(value)) {
		instance[key] = null;
	} else if (field.data) {
		if (field.collection === "none") {
			if (typeof value === "object") {
				if (instance[key] instanceof BaseData) {
					instance[key].deserialize(value, patch);
				} else {
					let data = new field.type();
					data.deserialize(value, patch);
					instance[key] = data;
				}
			} else {
				logWarn("Can't deserialize data " + instance.constructor.name + "::" + key + " from:", value);
			}
		} else if (field.collection === "array") {
			if (Array.isArray(value)) {
				let array = [];

				for (let i = 0; i < value.length; i++) {
					let data = new field.type();
					data.deserialize(value[i], patch);
					array.push(data);
				}

				instance[key] = array;
			} else {
				logWarn("Can't deserialize array " + instance.constructor.name + "::" + key + " from:", value);
			}
		} else if (field.collection === "map") {
			if (typeof value === "object") {
				const prevObject = typeof instance[key] === "object" ? instance[key] : null;
				let object = {};

				for (let vkey in value) {
					if (prevObject[vkey] instanceof BaseData) {
						prevObject[vkey].deserialize(value[vkey], patch);
						object[vkey] = prevObject[vkey];
					} else {
						let data = new field.type();
						data.deserialize(value[vkey], patch);
						object[vkey] = data;
					}
				}

				instance[key] = object;
			} else {
				logWarn("Can't deserialize map " + instance.constructor.name + "::" + key + " from:", value);
			}
		} else {
			throw new Error("Wrong collection");
		}
	} else {
		if (field.collection === "none") {
			instance[key] = deserializeObject(field, value);
		} else if (field.collection === "array") {
			if (Array.isArray(value)) {
				let array = [];

				for (let i = 0; i < value.length; i++) {
					array.push(deserializeObject(field, value[i]));
				}

				instance[key] = array;
			} else {
				logWarn("Can't deserialize array " + instance.constructor.name + "::" + key + " from:", value);
			}
		} else if (field.collection === "map") {
			if (typeof value === "object") {
				let object = {};

				for (let vkey in value) {
					object[vkey] = deserializeObject(field, value[vkey]);
				}

				instance[key] = object;
			} else {
				logWarn("Can't deserialize map " + instance.constructor.name + "::" + key + " from:", value);
			}
		} else {
			throw new Error("Wrong collection");
		}
	}
}

export default class BaseData {
	#fields = null;

	constructor(fields) {
		this.#fields = prepareFields(fields);
		construct(this, this.#fields);
	}

	serialize() {
		let result = {};

		for (let key in this.#fields) {
			result[key] = serialize(this[key]);
		}

		return result;
	}

	deserialize(json, patch = false) {
		if (typeof json !== "object") {
			return;
		}

		if (!patch) {
			this.clear();
		}

		for (let key in json) {
			if (this.#fields.hasOwnProperty(key)) {
				deserialize(this, key, this.#fields[key], json[key], patch);
			} else {
				logWarn("Can't deserialize " + this.constructor.name + "::" + key);
			}
		}
	}

	clear() {
		for (let key in this.#fields) {
			deserialize(this, key, this.#fields[key], this.#fields[key].default, false);
		}
	}

	clone() {
		const newObject = new this.constructor();
		newObject.deserialize(this.serialize());
		return newObject;
	}
}