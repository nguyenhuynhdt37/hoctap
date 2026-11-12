/* Microphone PCM16 mono -> 16kHz, 100ms transferable frames. No audio leaves
   the browser until the authenticated voice socket reports ready. */
class TutorRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sum = 0; this.count = 0; this.phase = 0;
    this.frame = new Int16Array(1600); this.offset = 0;
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    const ratio = sampleRate / 16000;
    for (let i = 0; i < input.length; i++) {
      this.sum += input[i]; this.count++; this.phase++;
      if (this.phase >= ratio) {
        const value = Math.max(-1, Math.min(1, this.sum / this.count));
        this.frame[this.offset++] = Math.round(value * (value < 0 ? 32768 : 32767));
        this.phase -= ratio; this.sum = 0; this.count = 0;
        if (this.offset === this.frame.length) {
          this.port.postMessage(this.frame.buffer, [this.frame.buffer]);
          this.frame = new Int16Array(1600); this.offset = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('tutor-recorder', TutorRecorder);
