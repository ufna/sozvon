export function isValid(value) {
	return value !== undefined && value !== null;
}

export function isEmpty(value) {
	if (isValid(value)) {
		return (value.toString() + "").length === 0;
	}
	return true;
}

export function delay(timeMs) {
	return new Promise((resolve) => {
		setTimeout(resolve, timeMs); 
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

export async function execTasksAll(tasks) {
	if (Array.isArray(tasks)) {
		let promises = [];
		for (const func of tasks) {
			const promise = func();
			if (promise instanceof Promise) {
				promises.push(promise);
			}
		}

		if (promises.length > 0) {
			await Promise.all(promises);
		}
	}
}