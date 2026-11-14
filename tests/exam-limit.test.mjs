import {test} from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/api/exam.js';
import {getOrCreateLearnerId,LEARNER_ID_KEY,LEARNER_ID_PATTERN} from '../public/learner-identity.js';
import {getCourse} from '../public/courses.js';

const ids=['b7aa299d-d36c-4d07-a0b8-2f0296d4a155','22f3d662-5d6f-41d2-9571-6653c6ef380a'];
const examUrl=(param='')=>'https://easay.example/api/exam?course=basics'+param;
const request=(id,ip='192.0.2.60',param='')=>new Request(examUrl(param),{headers:{'cf-connecting-ip':ip,'x-easay-learner-id':id}});
function mockEnv(){
 const attempts=new Map(),operations=[];
 const db={prepare(sql){return {bind(...args){return {
  async run(){
   operations.push({type:'run',sql,args});
   assert.match(sql,/INSERT INTO exam_attempts/);
   assert.match(sql,/WHERE NOT EXISTS/);
   const [id,course_id,questions_json,ip_hash,created_at,expires_at,checkHash,cutoff]=args;
   assert.equal(ip_hash,checkHash);
   const exists=[...attempts.values()].some(a=>a.ip_hash===checkHash&&a.created_at>cutoff);
   if(exists)return {meta:{changes:0}};
   attempts.set(id,{id,course_id,questions_json,ip_hash,created_at,expires_at,used:0});
   return {meta:{changes:1}};
  },
  async first(){
   operations.push({type:'first',sql,args});
   if(sql.includes('MAX(created_at)'))return {last_attempt:Math.max(0,...[...attempts.values()].filter(a=>a.ip_hash===args[0]&&a.created_at>args[1]).map(a=>a.created_at))||null};
   if(sql.includes('WHERE id=? AND ip_hash=?'))return [...attempts.values()].find(a=>a.id===args[0]&&a.ip_hash===args[1])||null;
   if(sql.includes('WHERE ip_hash=? AND course_id=? AND used=0 AND expires_at>?'))return [...attempts.values()].find(a=>a.ip_hash===args[0]&&a.course_id===args[1]&&!a.used&&a.expires_at>args[2])||null;
   throw Error('Unexpected SELECT: '+sql);
  }
 }}}}};
 return {CERT_HASH_SECRET:'unit-test-secret-key-exactly-32-chars',EASAY_DB:db,attempts,operations};
}
test('students on same Wi-Fi have independent exam allowances',async()=>{
 const env=mockEnv();
 const first=await onRequestGet({request:request(ids[0]),env});
 const second=await onRequestGet({request:request(ids[1]),env});
 assert.equal(first.status,200);assert.equal(second.status,200);
 assert.equal(env.attempts.size,2);
 assert.equal((await first.json()).questions.length,40);
 assert.equal((await second.json()).questions.length,40);
});
test('same learner changing Wi-Fi resumes the one active attempt, never starts another',async()=>{
 const env=mockEnv();
 const a=await onRequestGet({request:request(ids[0]),env});assert.equal(a.status,200);
 const first=await a.json();
 const b=await onRequestGet({request:request(ids[0],'198.51.100.74'),env});assert.equal(b.status,200);
 const again=await b.json();
 assert.equal(again.attemptId,first.attemptId);
 assert.equal(again.resumed,true);
 assert.deepEqual(again.questions,first.questions);
 assert.equal(env.attempts.size,1);
});
test('resume by attempt ID confirms learner browser and 45-minute expiry',async()=>{
 const env=mockEnv(),a=await onRequestGet({request:request(ids[0]),env}),data=await a.json();
 const before=env.operations.length;
 const b=await onRequestGet({request:request(ids[0],'198.51.100.74','&resume='+data.attemptId),env});
 assert.equal(b.status,200);assert.equal((await b.json()).attemptId,data.attemptId);
 assert.equal(env.operations.length,before+1);
 const wrong=await onRequestGet({request:request(ids[1],'192.0.2.60','&resume='+data.attemptId),env});
 assert.equal(wrong.status,404);assert.equal((await wrong.json()).code,'EXAM_SESSION_INVALID');
 const stored=env.attempts.get(data.attemptId);
 stored.expires_at=Date.now()-1;
 const expired=await onRequestGet({request:request(ids[0],'192.0.2.60','&resume='+data.attemptId),env});
 assert.equal(expired.status,409);assert.equal((await expired.json()).code,'EXAM_SESSION_EXPIRED');
});
test('finished or expired exam cannot start second one within 24 hours',async()=>{
 const env=mockEnv(),first=await onRequestGet({request:request(ids[0]),env}),data=await first.json();
 env.attempts.get(data.attemptId).used=1;
 const repeat=await onRequestGet({request:request(ids[0]),env});
 assert.equal(repeat.status,429);
 const blocked=await repeat.json();
 assert.equal(blocked.code,'EXAM_DAILY_LIMIT');
 assert.equal(blocked.practiceAvailable,true);
 assert.ok(blocked.nextAttemptAt>Date.now());
 assert.equal(env.attempts.size,1);
});
test('missing or malformed browser IDs do not consume a verified attempt',async()=>{
 const env=mockEnv();
 for(const id of ['', 'not-a-uuid', ids[0].replace('-4','-1')]){
  const res=await onRequestGet({request:request(id),env});
  assert.equal(res.status,400);assert.equal((await res.json()).code,'LEARNER_ID_REQUIRED');
 }
 assert.equal(env.attempts.size,0);
});
test('browser identity persists between visits',()=>{
 const map=new Map();
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v)}};
 let calls=0;
 const cryptoApi={randomUUID:()=>{calls++;return ids[0]}};
 assert.equal(getOrCreateLearnerId(storage,cryptoApi),ids[0]);
 assert.equal(getOrCreateLearnerId(storage,cryptoApi),ids[0]);
 assert.equal(calls,1);assert.equal(map.get(LEARNER_ID_KEY),ids[0]);
 assert.ok(LEARNER_ID_PATTERN.test(ids[0]));
 assert.equal(getOrCreateLearnerId({getItem(){throw Error('blocked')}},cryptoApi),null);
});
test('exam quota and resume use existing D1 table and hashed browser identity',async()=>{
 const {readFile}=await import('node:fs/promises');
 const api=await readFile(new URL('../functions/api/exam.js',import.meta.url),'utf8');
 const schema=await readFile(new URL('../db/schema.sql',import.meta.url),'utf8');
 assert.match(api,/learner-v1/);assert.match(api,/CERT_HASH_SECRET/);
 assert.match(api,/activeExamPayload/);assert.match(api,/WHERE NOT EXISTS/);
 assert.doesNotMatch(api,/cf-connecting-ip/);
 assert.match(api,/24\*60\*60\*1000/);
 assert.match(schema,/CREATE TABLE IF NOT EXISTS exam_attempts/);
 assert.equal(getCourse('basics').lessons.length,36);
});
