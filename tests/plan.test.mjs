import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeWeeklyPlan} from '../public/plan.js';
import {getCourse,getLesson} from '../public/courses.js';
test('plan uses only real lessons and has seven sessions',()=>{
 const plan=makeWeeklyPlan({courseId:'everyday',level:'A1',startDate:'2026-11-13'});
 assert.equal(plan.days.length,7);
 assert.equal(plan.days.filter(d=>d.kind==='lesson').length,5);
 assert.equal(plan.days.filter(d=>d.kind==='review').length,2);
 for(const d of plan.days)if(d.kind==='lesson')assert.ok(getLesson(d.lessonId));
});
test('plan skips completed lessons and stays in the selected course',()=>{
 const course=getCourse('work'),completed={[course.lessons[0].id]:{score:3,date:'2026-11-12'}};
 const plan=makeWeeklyPlan({courseId:'work',completed,startDate:'2026-11-13'});
 assert.equal(plan.days.find(d=>d.kind==='lesson').lessonId,course.lessons[1].id);
 assert.ok(plan.days.filter(d=>d.kind==='lesson').every(d=>getLesson(d.lessonId)?.courseId==='work'));
});
test('plan uses review when course fully completed',()=>{
 const course=getCourse('travel'),completed=Object.fromEntries(course.lessons.map(l=>[l.id,{score:3}]));
 const plan=makeWeeklyPlan({courseId:'travel',completed,startDate:'2026-11-13'});
 assert.equal(plan.days.filter(d=>d.kind==='review').length,7);
});
