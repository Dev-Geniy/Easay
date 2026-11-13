import {test} from 'node:test';
import assert from 'node:assert/strict';
import {COURSES,ALL_LESSONS,TOTAL_LESSONS,getLesson,getCourse} from '../public/courses.js';
test('all lessons have complete content',()=>{
 assert.equal(COURSES.length,11);
 assert.equal(TOTAL_LESSONS,132);
 assert.equal(new Set(ALL_LESSONS.map(l=>l.id)).size,TOTAL_LESSONS);
 for(const c of COURSES){assert.equal(c.lessons.length,12);assert.equal(getCourse(c.id).id,c.id);for(const l of c.lessons){assert.equal(l.words.length,4);assert.ok(l.tip.length>15);assert.ok(l.example.length>5);assert.ok(l.translation.length>5);assert.equal(getLesson(l.id),l);for(const [en,ru]of l.words){assert.ok(en.length>0&&ru.length>0)}}}
});
