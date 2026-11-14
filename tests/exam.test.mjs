import {test} from 'node:test';
import assert from 'node:assert/strict';
import {COURSES} from '../public/courses.js';
import {buildExam,gradeExam,achievements,EXAM_QUESTIONS,PASS_SCORE} from '../public/exam.js';
test('40-question, 100-point exam covers every lesson in every course',()=>{
 for(const course of COURSES){
  const exam=buildExam(course.id,13);
  assert.equal(exam.questions.length,40);
  assert.equal(new Set(exam.questions.map(q=>q.lessonId)).size,36);
  for(const q of exam.questions){assert.equal(q.options.length,4);assert.ok(q.options.includes(q.correct))}
 }
 assert.equal(EXAM_QUESTIONS,40);
 assert.equal(PASS_SCORE,90);
});
test('passing needs 36 correct answers (90 of 100)',()=>{
 const questions=buildExam('basics',24).questions;
 const answers=Object.fromEntries(questions.map(q=>[q.id,q.correct]));
 assert.deepEqual(gradeExam(questions,answers),{score:100,correct:40,total:40,passed:true});
 for(const q of questions.slice(0,4))answers[q.id]=q.options.find(x=>x!==q.correct);
 assert.equal(gradeExam(questions,answers).score,90);
 assert.equal(gradeExam(questions,answers).passed,true);
 answers[questions[4].id]=questions[4].options.find(x=>x!==questions[4].correct);
 assert.equal(gradeExam(questions,answers).passed,false);
});
test('four achievements remain and full course requires all 36 lessons',()=>{
 const b=achievements();assert.equal(b.length,4);assert.ok(b.every(x=>!x.earned));
 const complete=Object.fromEntries(COURSES[0].lessons.map(l=>[l.id,{score:3}]));
 assert.equal(achievements(complete).filter(x=>x.earned).length,3);
 const partial=Object.fromEntries(COURSES[0].lessons.slice(0,12).map(l=>[l.id,{score:3}]));
 assert.ok(!achievements(partial).find(x=>x.id==='course').earned);
});
test('verification fails closed without a D1 registry',async()=>{
 const m=await import('../functions/api/certificate.js');
 const r=await m.onRequestGet({request:new Request('https://example.test/api/certificate?id=ES-123456789012345678'),env:{}});
 assert.equal(r.status,503);assert.equal((await r.json()).verified,false);
});
