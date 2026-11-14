import {test} from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/api/exam.js';
import {getCourse} from '../public/courses.js';

const envFor=(rows)=>{
 const operations=[];
 return {
  CERT_HASH_SECRET:'unit-test-secret-key-exactly-32-chars',
  EASAY_DB:{
   prepare(sql){
    return {bind(...args){
     return {
      async first(){
       operations.push({sql,args});
       if(sql.includes('MAX(created_at)'))return {last_attempt:rows.lastAttempt??null};
       throw Error('Unexpected SELECT query: '+sql);
      },
      async run(){
       operations.push({sql,args});
       if(!sql.startsWith('INSERT INTO exam_attempts'))throw Error('Unexpected INSERT: '+sql);
       return {success:true,meta:{changes:1}};
      }
     }
    }};
   }
  },
  operations
 };
};
function request(){return new Request('https://easay.example/api/exam?course=basics',{headers:{'cf-connecting-ip':'192.0.2.60'}})}
test('server exam rejects second attempt within 24h and provides the exact earliest time',async()=>{
 const timestamp=Date.now()-3*60*60*1000;
 const env=envFor({lastAttempt:timestamp});
 const response=await onRequestGet({request:request(),env});
 assert.equal(response.status,429);
 const data=await response.json();
 assert.equal(data.code,'EXAM_DAILY_LIMIT');
 assert.equal(data.nextAttemptAt,timestamp+24*60*60*1000);
 assert.equal(data.practiceAvailable,true);
 assert.ok(!env.operations.some(x=>x.sql.startsWith('INSERT INTO')));
});
test('after 24h server starts an independently recorded verified exam',async()=>{
 const env=envFor({lastAttempt:null});
 const response=await onRequestGet({request:request(),env});
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.mode,'verified');
 assert.equal(data.questions.length,40);
 const check=env.operations.find(x=>x.sql.includes('MAX(created_at)'));
 const inserted=env.operations.find(x=>x.sql.startsWith('INSERT INTO'));
 assert.ok(check);
 assert.ok(inserted);
 assert.equal(inserted.args[3],check.args[0]);
 assert.equal(check.args[1].length,64);
 assert.equal(check.args[2].length,64);
 assert.equal(getCourse(data.courseId).lessons.length,36);
});
test('verified exam limit is not dependent on changing date-based IP tags',async()=>{
 const file=await import('node:fs/promises');
 const text=await file.readFile(new URL('../functions/api/exam.js',import.meta.url),'utf8');
 assert.match(text,/limit-v2/);
 assert.match(text,/24\*60\*60\*1000/);
 assert.match(text,/legacyToday,legacyYesterday/);
 assert.doesNotMatch(text,/>=8/);
 const ui=await file.readFile(new URL('../public/exam-ui.js',import.meta.url),'utf8');
 assert.match(ui,/function renderLimit/);
 assert.match(ui,/startExam\(true\)/);
 assert.match(ui,/EXAM_DAILY_LIMIT/);
});
