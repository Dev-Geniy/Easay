import {test} from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/api/exam.js';
import {getOrCreateLearnerId,LEARNER_ID_KEY,LEARNER_ID_PATTERN} from '../public/learner-identity.js';
import {getCourse} from '../public/courses.js';

// Mock D1's atomic INSERT ... WHERE NOT EXISTS using the same hashed learner key.
function mockEnv(){
 const attempts=new Map(),operations=[];
 return {
  CERT_HASH_SECRET:'unit-test-secret-key-exactly-32-chars',
  EASAY_DB:{prepare(sql){return {bind(...args){return {
   async run(){
    operations.push({sql,args});
    assert.match(sql,/INSERT INTO exam_attempts/);
    assert.match(sql,/WHERE NOT EXISTS/);
    const hash=args[3],cutoff=args[7],previous=attempts.get(hash);
    if(previous!=null&&previous>cutoff)return {meta:{changes:0}};
    attempts.set(hash,args[4]);return {meta:{changes:1}};
   },
   async first(){
    operations.push({sql,args});
    assert.match(sql,/MAX\(created_at\)/);
    return {last_attempt:attempts.get(args[0])??null};
   }
  }}}}},
  attempts,operations
 };
}
const ids=['b7aa299d-d36c-4d07-a0b8-2f0296d4a155','22f3d662-5d6f-41d2-9571-6653c6ef380a'];
function request(id,ip='192.0.2.60'){
 return new Request('https://easay.example/api/exam?course=basics',{headers:{'cf-connecting-ip':ip,'x-easay-learner-id':id}});
}
test('a second pupil on the same Wi-Fi has an independent server exam allowance',async()=>{
 const env=mockEnv();
 const first=await onRequestGet({request:request(ids[0]),env});
 const second=await onRequestGet({request:request(ids[1]),env});
 assert.equal(first.status,200);
 assert.equal(second.status,200);
 assert.equal(env.attempts.size,2);
 assert.equal((await first.json()).questions.length,40);
 assert.equal((await second.json()).questions.length,40);
});
test('same learner on different Wi-Fi is still limited for 24 hours',async()=>{
 const env=mockEnv();
 const first=await onRequestGet({request:request(ids[0]),env});
 assert.equal(first.status,200);
 const second=await onRequestGet({request:request(ids[0],'198.51.100.74'),env});
 assert.equal(second.status,429);
 const blocked=await second.json();
 assert.equal(blocked.code,'EXAM_DAILY_LIMIT');
 assert.equal(blocked.practiceAvailable,true);
 assert.ok(blocked.nextAttemptAt>Date.now());
 assert.equal(env.attempts.size,1);
});
test('missing or invalid stored learner identity cannot consume verified attempts',async()=>{
 const env=mockEnv();
 for(const id of ['', 'not-a-uuid', ids[0].replace('-4','-1')]){
  const response=await onRequestGet({request:request(id),env});
  assert.equal(response.status,400);
  assert.equal((await response.json()).code,'LEARNER_ID_REQUIRED');
 }
 assert.equal(env.attempts.size,0);
});
test('browser learner identity persists between visits and cannot silently fall back to ephemeral IDs',()=>{
 const map=new Map();
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v)}};
 let calls=0;
 const cryptoApi={randomUUID:()=>{calls++;return ids[0]}};
 const first=getOrCreateLearnerId(storage,cryptoApi),second=getOrCreateLearnerId(storage,cryptoApi);
 assert.equal(first,ids[0]);assert.equal(second,ids[0]);assert.equal(calls,1);
 assert.equal(map.get(LEARNER_ID_KEY),ids[0]);
 assert.ok(LEARNER_ID_PATTERN.test(first));
 const broken={getItem(){throw Error('Storage blocked')}};
 assert.equal(getOrCreateLearnerId(broken,cryptoApi),null);
});
test('certificate quota requires no new D1 tables or secrets',async()=>{
 const {readFile}=await import('node:fs/promises');
 const api=await readFile(new URL('../functions/api/exam.js',import.meta.url),'utf8');
 const ui=await readFile(new URL('../public/exam-ui.js',import.meta.url),'utf8');
 const schema=await readFile(new URL('../db/schema.sql',import.meta.url),'utf8');
 assert.match(api,/CERT_HASH_SECRET/);
 assert.match(api,/learner-v1/);
 assert.match(api,/ip_hash/);
 assert.doesNotMatch(api,/cf-connecting-ip/);
 assert.match(api,/24\*60\*60\*1000/);
 assert.match(ui,/getOrCreateLearnerId/);
 assert.match(ui,/x-easay-learner-id/);
 assert.match(ui,/function renderLimit/);
 assert.match(ui,/startExam\(true\)/);
 assert.match(schema,/CREATE TABLE IF NOT EXISTS exam_attempts/);
 assert.equal(getCourse('basics').lessons.length,36);
});
