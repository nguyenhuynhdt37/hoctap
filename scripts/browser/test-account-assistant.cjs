/* Isolated backend + scripted planner; synthetic browser microphone/socket.
   PLAYWRIGHT_MODULE points to an installed playwright package. No real audio,
   GitHub authorization, provider calls, or production account writes occur. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { expect } = require((process.env.PLAYWRIGHT_MODULE || 'playwright') + '/test');
const fixture = JSON.parse(fs.readFileSync(process.env.HANNES_BROWSER_FIXTURE || '/tmp/hannes-verification/browser-fixture.json', 'utf8'));
const origin = process.env.HANNES_BROWSER_ORIGIN || 'http://localhost:3107';
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
  try {
    const context = await browser.newContext({viewport:{width:1440,height:1000}, permissions:['microphone']});
    await context.addCookies([{name:'access_token',value:fixture.token,url:origin,httpOnly:true,sameSite:'Lax'}]);
    await context.addInitScript(() => {
      const Native = window.WebSocket;
      window.__hannesAudio = {sockets:0,frames:0,closed:0,playbackRates:[],requestedSpeed:null};
      const nativeBufferSource = AudioContext.prototype.createBufferSource;
      AudioContext.prototype.createBufferSource = function(...args) {
        const node = nativeBufferSource.apply(this,args);
        const start = node.start.bind(node);
        node.start = function(...values) {window.__hannesAudio.playbackRates.push(node.playbackRate.value);return start(...values);};
        return node;
      };
      class TestSocket {
        static OPEN=1; static CLOSED=3; static CONNECTING=0; static CLOSING=2;
        constructor(url, protocols) {
          if (!String(url).includes('/tutor-chat/') || !String(url).includes('/voice')) return new Native(url, protocols);
          window.__hannesAudio.requestedSpeed=new URL(url).searchParams.get("speed");
          this.readyState=0; this.bufferedAmount=0;
          window.__hannesAudio.sockets++;
          setTimeout(()=>{this.readyState=1;this.onopen?.({});this.onmessage?.({data:JSON.stringify({type:'ready',thread_id:'11111111-1111-4111-8111-111111111111',can_read_lesson:null})});},100);
          setTimeout(()=>this.onmessage?.({data:JSON.stringify({type:'audio',data:btoa(String.fromCharCode(...new Uint8Array(4800))),sample_rate:24000})}),250);
        }
        send(data) {if(data instanceof ArrayBuffer) window.__hannesAudio.frames++;}
        close() {if(this.readyState!==3){this.readyState=3;window.__hannesAudio.closed++;this.onclose?.({code:1000});}}
      }
      window.WebSocket=TestSocket;
    });
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/instructors',{waitUntil:'domcontentloaded',timeout:120000});
    await page.getByRole('button',{name:'Mở trợ lý Hannes',exact:true}).click({timeout:60000});
    const panel=page.getByRole('region',{name:'Hannes · Trợ lý của bạn'});
    const initial=await (await page.request.get(origin+'/api/agent/conversation')).json();
    const lastId=initial.messages.at(-1)?.id;
    const question='[E2E_SQL] xem dữ liệu tài khoản '+Date.now();
    await panel.getByRole('textbox',{name:'Nhắn Hannes'}).fill(question);
    await panel.getByRole('button',{name:'Gửi cho Hannes'}).click();
    await expect(panel.getByText('Đã đọc SQL sandbox của tài khoản.',{exact:true}).last()).toBeVisible({timeout:45000});
    await expect.poll(async()=>{ const history=await (await page.request.get(origin+'/api/agent/conversation')).json();return history.messages.at(-1)?.role==='assistant' && history.messages.at(-1)?.id!==lastId && history.messages.filter(item=>item.role==='user').at(-1)?.content===question; }).toBe(true);
    const saved=await (await page.request.get(origin+'/api/agent/conversation')).json();
    assert(saved.messages.some(item=>item.content==='Đã đọc SQL sandbox của tài khoản.'));
    await page.reload({waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Mở trợ lý Hannes',exact:true}).click();
    await expect(panel.getByText('Đã đọc SQL sandbox của tài khoản.',{exact:true}).last()).toBeVisible();
    await panel.getByRole('button',{name:'Trò chuyện bằng giọng nói',exact:true}).click();
    await page.getByText('Giọng nói và micro',{exact:true}).click();
    await page.getByLabel('Giọng đọc',{exact:true}).selectOption('Kore');
    const speed=page.getByRole('slider',{name:'Tốc độ đọc',exact:true});
    await speed.press('Home');await speed.press('ArrowRight');await speed.press('ArrowRight');
    await expect.poll(async()=>{const response=await page.request.get(origin+'/api/agent/voice-settings');const value=await response.json();return {voice:value.voice,speed:value.speed};}).toEqual({voice:'Kore',speed:.85});
    await page.getByRole('button',{name:'Bắt đầu nói chuyện',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'Mây Mây đang lắng nghe'})).toBeVisible({timeout:20000});
    await expect.poll(()=>page.evaluate(()=>window.__hannesAudio.playbackRates.length)).toBeGreaterThan(0);
    assert.deepEqual(await page.evaluate(()=>window.__hannesAudio.playbackRates),[1], 'Slower requested pace must not transpose the voice');
    assert.equal(await page.evaluate(()=>window.__hannesAudio.requestedSpeed),'0.85');
    await page.getByRole('button',{name:'Thu nhỏ · tiếp tục cuộc gọi',exact:true}).click();
    await expect(page.getByRole('complementary',{name:'Cuộc gọi Hannes đang chạy'})).toBeVisible();
    await page.getByRole('button',{name:'Thu nhỏ khung Hannes',exact:true}).click();
    const before=await page.evaluate(()=>({...window.__hannesAudio}));
    // A real Next Link transition must keep the existing audio/session mounted.
    await page.locator('footer').getByRole('link',{name:'Giới thiệu',exact:true}).click();
    await expect(page).toHaveURL(/\/about/,{timeout:45000});
    await expect(page.getByRole('complementary',{name:'Cuộc gọi Hannes đang chạy'})).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>window.__hannesAudio.frames)).toBeGreaterThan(before.frames);
    const after=await page.evaluate(()=>({...window.__hannesAudio}));
    assert.equal(after.sockets,1);assert.equal(after.closed,0);
    await page.getByRole('button',{name:'Mở lại cuộc gọi',exact:true}).click();
    await expect(page.getByLabel('Giọng đọc',{exact:true})).toHaveValue('Kore');
    await page.getByRole('button',{name:'Thu nhỏ · tiếp tục cuộc gọi',exact:true}).click();
    await page.getByRole('button',{name:'Kết thúc cuộc gọi',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>window.__hannesAudio.closed)).toBe(1);
    await page.getByRole('button',{name:'Mở trợ lý Hannes',exact:true}).click();
    await panel.getByRole('button',{name:'Kết nối GitHub',exact:true}).click();
    await page.getByRole('button',{name:'Xác thực với GitHub',exact:true}).click();
    await expect(page.getByText(/Kết nối GitHub chưa được bật/)).toBeVisible();
    await page.screenshot({path:'/tmp/hannes-verification/assistant-desktop.png'});
    assert.deepEqual(errors,[]);
    const report={passed:true,checks:['SQL tool executes against own snapshot','conversation survives reload','account voice preferences persist','minimized call survives Next navigation with one socket','stop releases audio','GitHub configuration requirement shown'],audio:after};
    fs.writeFileSync('/tmp/hannes-verification/browser-report.json',JSON.stringify(report,null,2));
    console.log(JSON.stringify(report));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
