/* Microphone PCM16 mono -> 16kHz, 100ms transferable frames. No audio leaves
   the browser until the authenticated voice socket reports ready. */
class TutorRecorder extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.threshold = options.processorOptions?.threshold ?? 0.012;
    this.port.onmessage = event => {
      if (event.data?.type === 'flush') {
        if (this.offset) {
          const tail = this.frame.slice(0, this.offset);
          this.port.postMessage(tail.buffer, [tail.buffer]);
          this.frame = new Int16Array(1600); this.offset = 0;
        }
        this.port.postMessage({ type: 'flushed' });
      }
      if (Number.isFinite(event.data?.threshold)) this.threshold = Math.max(0.004, Math.min(0.08, event.data.threshold)); };
    this.holdFrames = 0;
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
          let energy = 0;
          for (const sample of this.frame) energy += (sample / 32768) ** 2;
          // Hold the gate open across quiet syllables instead of chopping every
          // 100ms frame independently. Silence still reaches provider turn detection.
          const rms = Math.sqrt(energy / this.frame.length);
          if (rms >= this.threshold) this.holdFrames = 4;
          const audible = rms >= this.threshold || this.holdFrames > 0;
          if (this.holdFrames > 0) this.holdFrames--;
          if (!audible) this.frame.fill(0);
          this.port.postMessage(this.frame.buffer, [this.frame.buffer]);
          this.frame = new Int16Array(1600); this.offset = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('tutor-recorder', TutorRecorder);
