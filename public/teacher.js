import {ALL_LESSONS} from './courses.js';

// Offline, deterministic teacher scripts: one tailored message for every
// lesson and every stage; no Groq requests needed.
const tidy = text => String(text||'').replace(/\s+/g,' ').trim().replace(/[.!?]+$/,'');
function quote(text){return '«'+tidy(text)+'»';}
function grammarTimeline(lesson){
 const source=tidy(lesson.example);
 const base=source.replace(/\s+(today|yesterday|tomorrow|right now|at the moment)$/i,'').trim();
 const rules=[
  [/^(I) am (.+)$/i,(_,s,x)=>[s+' am '+x,s+' was '+x,s+' will be '+x]],
  [/^(He|She|It|This) is (.+)$/i,(_,s,x)=>[s+' is '+x,s+' was '+x,s+' will be '+x]],
  [/^(You|We|They) are (.+)$/i,(_,s,x)=>[s+' are '+x,s+' were '+x,s+' will be '+x]],
  [/^(I|You|We|They) have (.+)$/i,(_,s,x)=>[s+' have '+x,s+' had '+x,s+' will have '+x]],
  [/^(He|She) has (.+)$/i,(_,s,x)=>[s+' has '+x,s+' had '+x,s+' will have '+x]],
  [/^(I|You|We|They) need (.+)$/i,(_,s,x)=>[s+' need '+x,s+' needed '+x,s+' will need '+x]],
  [/^(I|You|We|They) work (.+)$/i,(_,s,x)=>[s+' work '+x,s+' worked '+x,s+' will work '+x]]
 ];
 const safe=rules.find(([pattern])=>pattern.test(base));
 let phrases,mode,note;
 if(safe && !(/[?!]/.test(source))){
  const matched=base.match(safe[0]);
  phrases=safe[1](...matched);
  mode='change';
  note='Сравни, как меняется глагол. Это три учебных варианта одной мысли — не обязательно использовать каждый в реальной ситуации.';
 }else{
  // Most examples are fragments, idioms, requests or questions. Mechanical
  // conjugation would teach incorrect English. Use a truthful context frame.
  const spoken=source.replace(/[“”]/g,'"');
  phrases=[
   'Today I say: “'+spoken+'”.',
   'Yesterday I said: “'+spoken+'”.',
   'Tomorrow I will say: “'+spoken+'”.'
  ];
  mode='context';
  note='Эту фразу нельзя надёжно изменять по временам без контекста. Здесь меняется глагол say: говорю → сказал → скажу.';
 }
 return {
  mode,note,
  samples:phrases.map((en,i)=>({tag:['Сейчас','Было','Будет'][i],en,ru:mode==='context'?
   ['Сейчас я говорю эту фразу.','Вчера я сказал эту фразу.','Завтра я скажу эту фразу.'][i]:
   ['Настоящее время','Прошедшее время','Будущее время'][i]}))
 };
}
function lessonScripts(lesson){
 const name=quote(lesson.title),ru=quote(lesson.translation);
 const [first,second,third,fourth]=lesson.words;
 return [
  'Привет! Сегодня тема '+name+'. Фраза дня означает '+ru+'. Прослушай английский пример и произнеси его вслух. Подсказка: '+tidy(lesson.tip)+'.',
  'Теперь четыре выражения. Первое — '+quote(first[1])+'. Второе — '+quote(second[1])+'. Послушай каждую английскую фразу и повтори своим голосом. Если что-то непонятно, вернись к переводу.',
  'Переходим к диалогу. Сначала читай за первого участника, затем за второго. Используй выражения '+quote(third[1])+' и '+quote(fourth[1])+'. Для уверенности прослушай реплики по одной.',
  'Пора проверить знания по теме '+name+'. Ответь на три коротких вопроса. Если ошибёшься, увидишь верный вариант и сможешь повторить тест.'
 ];
}
export const LESSON_SCRIPTS=Object.freeze(Object.fromEntries(ALL_LESSONS.map(lesson=>[
 lesson.id,Object.freeze({lessonId:lesson.id,stages:Object.freeze(lessonScripts(lesson)),timeline:grammarTimeline(lesson),breakdown:tidy(lesson.tip)+'. Сначала повтори фразу целиком, затем обрати внимание на ключевые слова и порядок слов.'})
])));
export function teacherFor(lessonId,stage=0,score=null){
 const data=LESSON_SCRIPTS[lessonId];
 if(!data)return '';
 if(stage===3&&typeof score==='number'){
  if(score>=2)return 'Отличная работа! Правильных ответов: '+score+' из трёх. Урок пройден. Можешь продолжить или повторить изученные выражения.';
  return 'Ты ответил правильно на '+score+' из трёх вопросов. Это часть обучения. Посмотри выделенные ответы и попробуй ещё раз — я рядом.';
 }
 return data.stages[Math.max(0,Math.min(3,stage))];
}
export function timelineFor(lessonId){return LESSON_SCRIPTS[lessonId]?.timeline||null;}
