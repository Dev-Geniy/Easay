import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/ai.mjs';
const req=(method,body,origin='https://easay.netlify.app')=>new Request('https://easay.netlify.app/api/ai',{method,headers:{origin,'content-type':'application/json','x-nf-client-connection-ip':'192.0.2.50'},...(body?{body:JSON.stringify(body)}:{})});
test('API rejects cross-origin requests',async()=>{const r=await handler(req('POST',{mode:'chat',message:'Hello'},'https://other.example'));assert.equal(r.status,403)});
test('API rejects malformed mode before Groq',async()=>{const r=await handler(req('POST',{mode:'admin',message:'Hello'}));assert.equal(r.status,400)});
test('API never returns the API key in its content',async()=>{
 const saved=process.env.GROQ_API_KEY;const previous=globalThis.fetch;
 process.env.GROQ_API_KEY='SECRET-NEVER-DISCLOSE';
 globalThis.fetch=async(url,opts)=>{assert.equal(new URL(url).hostname,'api.groq.com');const payload=JSON.parse(opts.body);assert.equal(payload.model,'openai/gpt-oss-20b');assert.equal(opts.headers.authorization,'Bearer SECRET-NEVER-DISCLOSE');return new Response(JSON.stringify({choices:[{message:{content:'Привет! Hello!'}}],usage:{total_tokens:45}}),{status:200})};
 try{const r=await handler(req('POST',{mode:'chat',message:'Hello',level:'A1',context:{course:'Basics'}}));assert.equal(r.status,200);const result=await r.text();assert.ok(result.includes('Привет! Hello!'));assert.ok(!result.includes('SECRET-NEVER-DISCLOSE'));}finally{globalThis.fetch=previous;if(saved===undefined)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=saved;}
});
