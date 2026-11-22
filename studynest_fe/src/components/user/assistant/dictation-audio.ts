/** Normalize browser recordings to the WAV format verified with the router. */
export async function dictationWav(blob: Blob): Promise<Blob> {
  const decoder = new AudioContext();
  let source: AudioBuffer;
  try { source = await decoder.decodeAudioData(await blob.arrayBuffer()); }
  finally { await decoder.close(); }
  if (!source.duration || source.duration > 62) throw new Error('Bản ghi âm vượt giới hạn 60 giây.');
  const rate = 16000;
  const renderer = new OfflineAudioContext(1, Math.ceil(source.duration * rate), rate);
  const node = renderer.createBufferSource(); node.buffer = source;
  node.connect(renderer.destination); node.start();
  const samples = (await renderer.startRendering()).getChannelData(0);
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const tag = (offset: number, text: string) => { for (let i=0;i<text.length;i++) view.setUint8(offset+i,text.charCodeAt(i)); };
  tag(0,'RIFF'); view.setUint32(4,36+samples.length*2,true); tag(8,'WAVE'); tag(12,'fmt ');
  view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true);
  view.setUint32(24,rate,true); view.setUint32(28,rate*2,true); view.setUint16(32,2,true); view.setUint16(34,16,true);
  tag(36,'data'); view.setUint32(40,samples.length*2,true);
  for (let i=0;i<samples.length;i++) { const value=Math.max(-1,Math.min(1,samples[i])); view.setInt16(44+i*2,Math.round(value*(value<0?32768:32767)),true); }
  return new Blob([buffer],{type:'audio/wav'});
}
