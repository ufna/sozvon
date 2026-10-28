let audioCtx = null;

function getContext() {
	if (!audioCtx) {
		audioCtx = new AudioContext();
	}
	return audioCtx;
}

function playTone(freq1, freq2, duration = 0.12) {
	try {
		const ctx = getContext();
		const now = ctx.currentTime;

		const gain = ctx.createGain();
		gain.connect(ctx.destination);
		gain.gain.setValueAtTime(0.15, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + duration * 2);

		const osc1 = ctx.createOscillator();
		osc1.type = "sine";
		osc1.frequency.setValueAtTime(freq1, now);
		osc1.connect(gain);
		osc1.start(now);
		osc1.stop(now + duration);

		const osc2 = ctx.createOscillator();
		osc2.type = "sine";
		osc2.frequency.setValueAtTime(freq2, now + duration);
		osc2.connect(gain);
		osc2.start(now + duration);
		osc2.stop(now + duration * 2);
	} catch {}
}

export function playJoinSound() {
	playTone(440, 660);
}

export function playLeaveSound() {
	playTone(440, 330);
}
