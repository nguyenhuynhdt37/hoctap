const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('../studynest_fe/node_modules/typescript');
const Module = require('node:module');

async function check(relative) {
  const file = path.resolve(__dirname, '..', relative);
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const loaded = new Module(file, module);
  loaded._compile(output, file);
  const parse = loaded.exports.consumeChatEvents;
  const expected = 'Xin chào 🚀\nTiếng Việt';
  const sse = ': keepalive\r\n\r\ndata: '+JSON.stringify({type:'delta',delta:'Xin chào 🚀'})+'\r\n\r\ndata: '+JSON.stringify({type:'delta',delta:'\nTiếng Việt'})+'\r\n\r\ndata: '+JSON.stringify({type:'done',data:{response:expected}})+'\r\n\r\n';
  const bytes = new TextEncoder().encode(sse);
  for (let split = 1; split < bytes.length; split++) {
    const response = new Response(new ReadableStream({start(c) { c.enqueue(bytes.slice(0,split));c.enqueue(bytes.slice(split));c.close(); }}), {headers:{'Content-Type':'text/event-stream'}});
    let visible='';
    const result=await parse(response, delta => {visible+=delta;});
    assert.equal(visible,expected);assert.equal(result.response,expected);
  }
  await assert.rejects(parse(new Response('data: {"type":"delta","delta":"partial"}\n\n',{headers:{'Content-Type':'text/event-stream'}}),()=>{}), /Kết nối bị ngắt/);
  await assert.rejects(parse(new Response('data: {"type":"error","message":"Retry"}\n\n',{headers:{'Content-Type':'text/event-stream'}}),()=>{}), /Retry/);
  await assert.rejects(parse(new Response('{}',{headers:{'Content-Type':'application/json'}}),()=>{}), /không trả về/);
  console.log(relative+': PASS; all UTF-8/CRLF split points, EOF and server errors');
}
(async()=>{ await check('studynest_fe/src/lib/utils/fetcher/client/chat-events.ts');await check('mobile/src/services/chat-events.ts'); })().catch(e=>{console.error(e);process.exitCode=1;});
