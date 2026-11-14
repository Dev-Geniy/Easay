import {test} from 'node:test';
import assert from 'node:assert/strict';
import {COURSES,ALL_LESSONS,TOTAL_LESSONS,getLesson,getCourse} from '../public/courses.js';
import {deckForLesson,deckForCourse} from '../public/flashcards.js';
test('11 tracks contain 24 complete authored lessons with stable legacy IDs',()=>{
 assert.equal(COURSES.length,11);
 assert.equal(TOTAL_LESSONS,264);
 assert.equal(new Set(ALL_LESSONS.map(l=>l.id)).size,TOTAL_LESSONS);
 for(const c of COURSES){
  assert.equal(c.lessons.length,24,c.id);
  assert.equal(getCourse(c.id).id,c.id);
  assert.equal(c.lessons[0].id,c.id+'-1');
  assert.equal(c.lessons[11].id,c.id+'-12');
  assert.equal(c.lessons[12].id,c.id+'-13');
  assert.equal(c.lessons[23].id,c.id+'-24');
  assert.equal(deckForCourse(c).length,96);
  for(const l of c.lessons){
   assert.equal(l.words.length,4,l.id);
   assert.ok(l.title.length>3,l.id);
   assert.ok(l.tip.length>15,l.id);
   assert.ok(l.example.length>5,l.id);
   assert.ok(l.translation.length>5,l.id);
   assert.equal(getLesson(l.id),l);
   assert.equal(deckForLesson(l).length,4);
   for(const [en,ru]of l.words){assert.ok(en.length>0&&ru.length>0,l.id)}
  }
 }
});
