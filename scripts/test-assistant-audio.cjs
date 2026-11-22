/* Exercise the actual recorder worklet without recording a user's microphone. */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
let Recorder;
class Processor {
  constructor() { this.frames = []; this.messages = []; this.port = { postMessage: frame => { this.messages.push(frame); if (frame instanceof ArrayBuffer) this.frames.push(new Int16Array(frame)); } }; }
}
vm.runInNewContext(fs.readFileSync('studynest_fe/public/audio/tutor-recorder.js', 'utf8'), {
  AudioWorkletProcessor: Processor, sampleRate: 48000, Int16Array, Math, Number,
  registerProcessor: (_, implementation) => { Recorder = implementation; },
});
const recorder = new Recorder({ processorOptions: { threshold: .02 } });
function frame(amplitude) {
  recorder.process([[new Float32Array(4800).fill(amplitude)]]);
  return recorder.frames.at(-1);
}
assert.equal(frame(.005).length, 1600, 'Keep 100ms audio timing');
assert.ok(recorder.frames.at(-1).every(sample => sample === 0), 'Ambient noise becomes silence');
assert.ok(frame(.1).every(sample => sample > 3000), 'Speech still passes');
assert.ok(frame(.009).some(sample => sample > 200), 'Quiet syllables after speech are preserved');
for (let i=0;i<5;i++) frame(.002);
assert.ok(recorder.frames.at(-1).every(sample => sample === 0), 'Gate closes after speech so VAD can end the turn');
recorder.port.onmessage({ data: { threshold: .008 } });
assert.ok(frame(.015).every(sample => sample > 400), 'Sensitivity can be changed during the call');
assert.ok(frame(2).every(sample => sample === 32767), 'Clamp PCM instead of integer overflow');
console.log('PASS: mic hangover, end-of-turn silence, 16kHz PCM timing, live sensitivity and clipping');

const tail = new Recorder({ processorOptions: { threshold: .006 } });
tail.process([[new Float32Array(2400).fill(.1)]]);
assert.equal(tail.frames.length, 0);
tail.port.onmessage({ data: { type: 'flush' } });
assert.equal(tail.frames[0].length, 800, 'Flush the final 50ms rather than dropping the last syllable');
assert.equal(tail.messages.at(-1).type, 'flushed');
tail.port.onmessage({ data: { type: 'flush' } });
assert.equal(tail.frames.length, 1, 'A repeated flush must not duplicate audio');
