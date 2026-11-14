import {test} from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/api/exam.js';
import {getCourse} from '../public/courses.js';

// Minimal D1 mock: the reservation statement is atomic in production SQLite.
// Simulate already reserved / newly reserved and the lookup for a 429 response.
function envFor({reserved,lastAttempt=null}){
 const operations=[];
 return {
  CERT_HASH_SECRET:'unit-test-secret-key-exactly-32-chars',
  EASAY_DB:{prepare(sql){return {bind(...args){return {
   async first(){
    operations.push({kind:'first',sql,args});
    if(sql.includes('MAX(created_at)'))return {last_attempt:lastAttempt};
    throw Error('Unexpected SELECT: '+sql);
   },
   async run(){
    operations.push({kind:'run',sql,args});
    if(!sql.includes('INSERT INTO exam_attempts')||!sql.includes('WHERE NOT EXISTS'))throw Error('Non-atomic reservation!');
    return {meta:{changes:reserved?1:0}};
   }
  }}}}},
  operations
 };
}
function request(){return new Request('https://easay.example/api/exam?course=basics',{headers:{'cf-connecting-ip':'192.0.2.60'}})}
test('server denies second attempt for the whole rolling 24h window',async()=>{
 const timestamp=Date.now()-3*60*60*1000;
 const env=envFor({reserved:false,lastAttempt:timestamp});
 const response=await onRequestGet({request:request(),env});
 assert.equal(response.status,429);
 const data=await response.json();
 assert.equal(data.code,'EXAM_DAILY_LIMIT');
 assert.equal(data.nextAttemptAt,timestamp+24*60*60*1000);
 assert.equal(data.practiceAvailable,true);
 assert.equal(env.operations.filter(x=>x.kind==='run').length,1);
 assert.equal(env.operations.filter(x=>x.kind==='first').length,1);
});
test('eligible learner reserves a verified attempt through one atomic SQLite statement',async()=>{
 const env=envFor({reserved:true});
 const response=await onRequestGet({request:request(),env});
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.mode,'verified');
 assert.equal(data.questions.length,40);
 assert.equal(env.operations.length,1);
 const saved=env.operations[0];
 assert.match(saved.sql,/INSERT INTO exam_attempts/);
 assert.match(saved.sql,/WHERE NOT EXISTS/);
 assert.equal(saved.args[3],saved.args[6]);
 assert.equal(saved.args[7].length,64);
 assert.equal(saved.args[8].length,64);
 assert.equal(getCourse(data.courseId).lessons.length,36);
});
test('stable hashed IP key applies across midnight and practice remains separate',async()=>{
 const {readFile}=await import('node:fs/promises');
 const server=await readFile(new URL('../functions/api/exam.js',import.meta.url),'utf8');
 assert.match(server,/limit-v2/);
 assert.match(server,/24\*60\*60\*1000/);
 assert.match(server,/legacyToday,legacyYesterday/);
 assert.doesNotMatch(server,/>=8/);
 const ui=await readFile(new URL('../public/exam-ui.js',import.meta.url),'utf8');
 assert.match(ui,/function renderLimit/);
 assert.match(ui,/startExam\(true\)/);
 assert.match(ui,/EXAM_DAILY_LIMIT/);
});
