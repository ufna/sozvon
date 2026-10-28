export function serviceLog(name, level, log, data) {
	if (data) {
		console[level](`[${name}] ${log}`, data);
	} else {
		console[level](`[${name}] ${log}`);
	}
}