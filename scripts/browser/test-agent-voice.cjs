/* Synthetic microphone E2E: actual AudioWorklet, backend WS, Grok Voice and UI
   callback receipts. This does NOT certify physical mic/Safari/iOS behavior. */
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const origin=process.env.AGENT_BROWSER_URL||'http://localhost:3001';
 if(!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))throw Error('Only local isolated frontend');
 const fixture=JSON.parse(fs.readFileSync(process.env.AGENT_BROWSER_FIXTURE||'/tmp/maymay-agent-verification/browser-fixture.json','utf8'));
 const artifacts=process.env.AGENT_BROWSER_ARTIFACTS||'/tmp/maymay-agent-verification/voice-browser';fs.mkdirSync(artifacts,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',`--use-file-for-fake-audio-capture=${process.env.AGENT_VOICE_WAV||'/tmp/maymay-agent-verification/voice-microphone.wav'}%noloop`,'--autoplay-policy=no-user-gesture-required']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['microphone']});
 const evidence={input:'synthetic Vietnamese WAV through WebAudio MediaStream; actual AudioWorklet and WS',physical_microphone:false,planner:'real Grok Voice',events:[],transcripts:[],audio_bytes:0,sent_binary_frames:0,errors:[]};
 try{
  await context.addCookies([{name:'access_token',value:fixture.token,url:origin,httpOnly:true,sameSite:'Lax'}]);
  const marker=await context.request.get(origin+'/api/agent-browser-fixture');assert.equal(marker.status(),200);assert.equal((await marker.json()).isolated_database,true);
  assert.equal((await context.request.post(`${origin}/api/learning/${fixture.course_id}/active/${fixture.video_lesson_id}`)).status(),200);
  const wav=fs.readFileSync(process.env.AGENT_VOICE_WAV||'/tmp/maymay-agent-verification/voice-microphone.wav').toString('base64');
  // Browser-native synthesis avoids OS microphone permissions. PCM still travels
  // through the real AudioWorklet/socket/provider, never a fake tool result.
  await context.addInitScript(({wav})=>{
    window.__voiceProbe=[];window.__voiceTestStreams=[];window.__voiceSyntheticContexts=[];
    navigator.mediaDevices.getUserMedia=async()=>{
      window.__voiceProbe.push('syntheticStream:start');
      const audio=new AudioContext();await audio.resume();
      const bytes=Uint8Array.from(atob(wav),c=>c.charCodeAt(0));
      const buffer=await audio.decodeAudioData(bytes.buffer);
      const source=audio.createBufferSource();source.buffer=buffer;
      const destination=audio.createMediaStreamDestination();source.connect(destination);source.start();
      window.__voiceSyntheticContexts.push(audio);window.__voiceTestStreams.push(destination.stream);
      for(const track of destination.stream.getTracks()){
        const stop=track.stop.bind(track);track.stop=()=>{stop();try{source.stop();}catch{}void audio.close();};
      }
      window.__voiceProbe.push('syntheticStream:ready');return destination.stream;
    };
  },{wav});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',e=>evidence.errors.push(e.message));
  page.on('websocket',ws=>{
   if(!ws.url().includes('/voice'))return;
   ws.on('framesent',frame=>{if(Buffer.isBuffer(frame.payload))evidence.sent_binary_frames++;});
   ws.on('close',()=>{ if(!evidence.stopping) evidence.errors.push('Voice WebSocket closed before completion'); });
   ws.on('socketerror',error=>evidence.errors.push(String(error))); 
   ws.on('framereceived',frame=>{if(typeof frame.payload!=='string')return;try{const data=JSON.parse(frame.payload);evidence.frame_types=evidence.frame_types||[];if(evidence.frame_types.length<30)evidence.frame_types.push(data.type);if(data.type==='agent_event')evidence.events.push(data.event);if(data.type==='transcript')evidence.transcripts.push({role:data.role,text:data.delta});if(data.type==='audio')evidence.audio_bytes+=Buffer.from(data.data,'base64').length;if(data.type==='error')evidence.errors.push(data.message);}catch{}});
  });
  await page.goto(`${origin}/learning/${fixture.course_slug}`,{waitUntil:'domcontentloaded',timeout:120000});
  await page.getByRole('button',{name:'Hỏi trợ giảng',exact:true}).click();
  await page.getByRole('button',{name:'Mở voice Mây Mây',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Trò chuyện cùng Mây Mây'});await dialog.waitFor();
  await dialog.getByRole('button',{name:'Bắt đầu nói chuyện',exact:true}).click();
  const deadline=Date.now()+90000;
  while(Date.now()<deadline){
   if(evidence.errors.length)throw Error(evidence.errors.join('; '));
   const alert=await dialog.getByRole('alert').allTextContents();if(alert.length)throw Error(alert.join('; '));
   if(evidence.events.some(e=>e.type==='ui.action_receipt'&&e.payload.verified)&&evidence.events.some(e=>e.type==='run.completed')&&evidence.audio_bytes>0)break;
   await new Promise(r=>setTimeout(r,250));
  }
  assert.ok(evidence.sent_binary_frames>0,'AudioWorklet must send actual PCM frames');
  const receipts=evidence.events.filter(e=>e.type==='ui.action_receipt'&&e.payload.verified);
  assert.ok(receipts.length,'real Grok Voice must request and verify an application action');
  const notesTool=evidence.events.find(e=>e.type==='tool.completed'&&(e.payload.name==='ui.switch_tab'||(e.payload.name==='ui.open_panel'&&e.payload.result?.panel==='notes'&&e.payload.result?.verified)));
  assert.ok(notesTool,'voice must open the registered notes surface and finish verified');
  assert.ok(evidence.events.some(e=>e.type==='run.completed'),'voice run must finish authoritative state');
  assert.ok(evidence.audio_bytes>0,'real provider audio output required');
  evidence.stopping=true;
  await dialog.getByRole('button',{name:'Kết thúc',exact:true}).click();
  await page.waitForFunction(()=>window.__voiceTestStreams.length>0&&window.__voiceTestStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended')));
  evidence.microphone_tracks_ended=true;
  await page.screenshot({path:path.join(artifacts,'voice-completed.png'),fullPage:true});
  evidence.status='passed';console.log('PASS synthetic microphone → backend WS → Grok Voice → notes tool → verified receipt → audio → Stop cleanup');
 }catch(e){evidence.status='failed';evidence.error=e.message;const pages=context.pages();if(pages[0]){evidence.probe=await pages[0].evaluate(()=>window.__voiceProbe);evidence.screen_text=(await pages[0].locator('body').innerText()).slice(-5000);await pages[0].screenshot({path:path.join(artifacts,'voice-failed.png'),fullPage:true}).catch(()=>{});}throw e;}
 finally{fs.writeFileSync(path.join(artifacts,'results.json'),JSON.stringify(evidence,null,2));await context.close();await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
