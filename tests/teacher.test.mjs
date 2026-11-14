import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ALL_LESSONS} from '../public/courses.js';
import {LESSON_SCRIPTS,teacherFor,timelineFor} from '../public/teacher.js';
test('every one of the 264 lessons has five stage-specific offline messages',()=>{
 assert.equal(Object.keys(LESSON_SCRIPTS).length,264);
 for(const lesson of ALL_LESSONS){
  const item=LESSON_SCRIPTS[lesson.id];
  assert.equal(item.stages.length,5);
  assert.ok(item.stages.every(x=>x.length>95),lesson.id);
  assert.ok(item.stages[0].includes(lesson.title.replace(/[.!?]+$/,'')),lesson.id);
  assert.ok(item.stages[0].includes(lesson.translation.replace(/[.!?]+$/,'')),lesson.id);
  assert.ok(item.stages[0].includes(lesson.tip.replace(/[.!?]+$/,'')),lesson.id);
  assert.equal(item.timeline.samples.length,3);
  assert.ok(item.timeline.samples.every(x=>x.en.length>8));
  assert.equal(teacherFor(lesson.id,2),item.stages[2]);
  assert.match(teacherFor(lesson.id,3),/карточк/);
  assert.ok(teacherFor(lesson.id,4,3).includes('Отличная'));
 }
});
test('timeline uses a safe contextual explanation where conjugation is ambiguous',()=>{
 const note=timelineFor('basics-1');
 assert.equal(note.mode,'context');
 assert.match(note.samples[1].en,/Yesterday I said/);
 const be=timelineFor('basics-4');
 assert.ok(be&&['context','change'].includes(be.mode));
});
