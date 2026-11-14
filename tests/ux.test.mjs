import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('five learning stages preserve the earlier lesson views and offline teacher',()=>{
 const app=read('../public/app.js'),html=read('../public/app.html');
 assert.match(app,/const lessonStepNames=\['Знакомство','Новые слова','Диалог','Карточки','Проверка'\]/);
 for(const f of ['lessonIntro','lessonWords','lessonDialogue','lessonFlashcards','quizView','syncTeacher','loadOnboarding'])assert.match(app,new RegExp('function '+f+'\\('));
 assert.match(app,/inline-teacher/);
 assert.doesNotMatch(app,/function speakTeacher/);
 assert.match(app,/tensePanel\(l\)/);
 assert.match(app,/SpeechSynthesisUtterance/);
 assert.match(app,/onboardPace/);
 assert.match(app,/invite-friend/);
 assert.match(app,/finalExamCTA/);
 assert.match(app,/lesson-card-flip/);
 assert.match(app,/lesson-card-next/);
 assert.match(html,/\/learning\.css/);
 assert.ok(existsSync(new URL('../public/teacher.js',import.meta.url)));
});
test('learner progress and optional Groq continue to use the same storage key and endpoints',()=>{
 const app=read('../public/app.js');
 assert.match(app,/const KEY='easay:v3:learner'/);
 assert.match(app,/localStorage\.setItem\(KEY/);
 assert.match(app,/function callAI/);
 assert.match(app,/wordCards\(l\)/);
 assert.match(app,/quizQuestions\(l\)/);
 assert.match(app,/state\.completed/);
 assert.match(app,/\/api\/ai/);
});
test('offline cache includes all new course, flashcard and tour assets',()=>{
 const worker=read('../public/sw.js');
 for(const asset of ["'/teacher.js'","'/guided.css'","'/app.html'","'/refine.css'","'/minimal.css'","'/exam.html'","'/exam-ui.js'","'/exam-session.js'","'/exam.js'","'/certificate.html'","'/certificate.js'","'/course-extensions.js'","'/course-chapters.js'","'/learner-identity.js'","'/flashcards.js'","'/learning.css'","'/review-scheduler.js'","'/home-review.css'"]){
  assert.ok(worker.includes(asset),'missing offline asset '+asset);
 }
 assert.match(worker,/easay-static-v6\.3.2/);
});
