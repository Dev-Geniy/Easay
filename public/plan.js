import { COURSES, getCourse } from './courses.js';
// An offline-first weekly schedule based on real lessons, not hallucinated AI titles.
// Five short lessons + two review days is a sustainable default.
export function makeWeeklyPlan({ courseId='everyday', level='A1', completed={}, startDate, mistakes=[] }={}){
  const course=getCourse(courseId)||COURSES[0];
  const start=/^\d{4}-\d{2}-\d{2}$/.test(startDate||'')?startDate:new Date().toISOString().slice(0,10);
  const remaining=course.lessons.filter(l=>!completed[l.id]);
  const recent=Array.isArray(mistakes)?mistakes.filter(m=>m&&m.id&&course.lessons.some(l=>l.id===m.id)).slice(-5):[];
  const reviewLessonId=recent.length?recent[recent.length-1].id:null;
  let index=0;
  const days=Array.from({length:7},(_,day)=>{
    const date=new Date(start+'T12:00:00');
    date.setDate(date.getDate()+day);
    const dateStr=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
    const isReview=day===3||day===6||index>=remaining.length;
    if(isReview){
      return {date:dateStr,kind:'review',lessonId:reviewLessonId,detail:day===6?'Итог недели: повтори фразы и ошибки.':'Повторение слов и сложных моментов.'};
    }
    const lesson=remaining[index++];
    return {date:dateStr,kind:'lesson',lessonId:lesson.id,detail:lesson.tip};
  });
  return {courseId:course.id,level,start,days,reviewDone:{}};
}
