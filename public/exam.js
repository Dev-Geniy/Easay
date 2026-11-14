import {getCourse,COURSES} from './courses.js';

export const EXAM_QUESTIONS=40;
export const PASS_SCORE=90;
function rng(seed){let s=(Number(seed)>>>0)||17;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
function shuffle(list,rand){const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
export function buildExam(courseId,seed=17){
 const course=getCourse(courseId);if(!course)return null;
 const random=rng(seed);
 const pool=course.lessons.flatMap(lesson=>lesson.words.map(([en,ru],index)=>({en,ru,lessonId:lesson.id,key:lesson.id+':'+index})));
 // One question from every lesson, then fill the rest across the course.
 const chosen=shuffle(course.lessons,random).map(l=>shuffle(pool.filter(p=>p.lessonId===l.id),random)[0]);
 const used=new Set(chosen.map(p=>p.key));
 chosen.push(...shuffle(pool.filter(p=>!used.has(p.key)),random).slice(0,EXAM_QUESTIONS-chosen.length));
 const questions=shuffle(chosen,random).map((word,index)=>{
  const distractors=[...new Set(pool.filter(item=>item.ru!==word.ru).map(item=>item.ru))];
  const options=shuffle([word.ru,...shuffle(distractors,random).slice(0,3)],random);
  return {id:'q'+index,prompt:'Как перевести «'+word.en+'»?',options,correct:word.ru,lessonId:word.lessonId};
 });
 return {courseId:course.id,courseTitle:course.title,questions};
}
export function gradeExam(questions,answers){
 if(!Array.isArray(questions)||questions.length!==EXAM_QUESTIONS)return null;
 const a=answers&&typeof answers==='object'?answers:{};
 const correct=questions.filter(q=>q.correct===a[q.id]).length;
 const score=Math.round(correct*100/EXAM_QUESTIONS);
 return {correct,total:EXAM_QUESTIONS,score,passed:score>=PASS_SCORE};
}
export function achievements(completed={},savedWords={},mistakes=[]){
 const done=Object.keys(completed).filter(id=>!!completed[id]).length;
 const vocab=Object.keys(savedWords).length;
 const full=COURSES.filter(c=>c.lessons.every(l=>completed[l.id])).length;
 return [
  {id:'first',name:'Первый шаг',hint:'Заверши первый урок',earned:done>=1},
  {id:'steady',name:'В ритме',hint:'Пройди 10 уроков',earned:done>=10},
  {id:'words',name:'Мастер фраз',hint:'Собери 25 выражений',earned:vocab>=25},
  {id:'course',name:'Первый курс',hint:'Заверши все уроки направления',earned:full>=1}
 ];
}
