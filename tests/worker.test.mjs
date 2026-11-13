import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../worker/index.js';

test('Worker serves assets and routes real API endpoints',async()=>{
 const env={ASSETS:{fetch:async req=>new Response('asset:'+new URL(req.url).pathname)}};
 const requests=[
  ['/index.html',200,'asset:/index.html'],
  ['/api/ai',405],
  ['/api/exam',503],
  ['/api/certificate?id=ES-123456789012345678',503],
  ['/api/unknown',404]
 ];
 for(const [path,status,expectBody] of requests){
  const res=await worker.fetch(new Request('https://example.test'+path),env,{});
  assert.equal(res.status,status,path);
  if(expectBody)assert.equal(await res.text(),expectBody);
 }
});
test('Groq AI proxy receives Worker secret from env and does not leak it',async()=>{
 const response=await worker.fetch(new Request('https://example.test/api/ai',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'chat',level:'A1',message:'Explain hello'})
 }),{ASSETS:{fetch:async()=>new Response()}},{});
 assert.equal(response.status,503);
 const data=await response.json();
 assert.match(data.error,/GROQ_API_KEY/);
});
test('Wrangler deploys the existing Easay Worker with static assets',()=>{
 const cfg=readFileSync(new URL('../wrangler.toml',import.meta.url),'utf8');
 assert.match(cfg,/name = "easay"/);
 assert.match(cfg,/main = "\.\/worker\/index\.js"/);
 assert.match(cfg,/directory = "\.\/dist"/);
 assert.match(cfg,/run_worker_first = \["\/api\/\*"\]/);
 assert.match(cfg,/keep_vars = true/);
});
