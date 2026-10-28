class RNNoiseProcessor extends AudioWorkletProcessor {
	process(inputs, outputs) {
		outputs[0][0].set(inputs[0][0]);
		return true;
	}
}
registerProcessor("rnnoise", RNNoiseProcessor);