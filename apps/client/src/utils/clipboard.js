export async function copyText(text) {
	if (navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch {}
	}

	const previous = document.activeElement;
	const field = document.createElement("textarea");
	field.value = text;
	field.readOnly = true;
	field.style.cssText = "position:fixed;inset-inline-start:-9999px;top:0;font-size:16px";
	document.body.appendChild(field);
	field.select();
	try {
		return document.execCommand("copy");
	} catch {
		return false;
	} finally {
		field.remove();
		if (previous?.isConnected) previous.focus({ preventScroll: true });
	}
}
