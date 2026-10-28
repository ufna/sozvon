export function isValid(value) {
	return value !== undefined && value !== null;
}

export function isEmpty(value) {
	if (isValid(value)) {
		return value.toString().length === 0;
	}
	return true;
}

export function delay(time) {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve();
		}, time);
	});
}

export async function delayWithCancel(timeMs, isCanceled, stepMs = 500) {
	if (isCanceled()) {
		return;
	}

	const start = Date.now();
	while (!isCanceled()) {
		const deltaMs = timeMs - (Date.now() - start);
		if (deltaMs > 0) {
			await delay(Math.min(stepMs, deltaMs));
		} else {
			break;
		}
	}
}

export function isEmptyMap(A) {
	for (const key in A) {
		if (!isEmpty(A[key])) {
			return false;
		}
	}
	return true;
}

export function cn(...inputs) {
	let result = "";

	for (let i = 0; i < inputs.length; ++i) {
		const name = inputs[i];
		if (!isEmpty(name)) {
			if (result.length > 0) {
				result += " ";
			}

			result += name.toString();
		}
	}

	return result;
}
