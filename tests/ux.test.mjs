import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('guided experience preserves all four learning screens and offline teacher',()=>{
 const app=read('../public/app.js');
 const html=read('../public/app.html');
 assert.match(app,/const lessonStepNames=\['Знакомство','Новые слова','Диалог','Проверка'\]/);
 assert.match(app,/function lessonIntro/);
 assert.match(app,/function lessonWords/);
 assert.match(app,/function lessonDialogue/);
 assert.match(app,/function quizView/);
 assert.match(app,/inline-teacher/);
 assert.doesNotMatch(app,/function speakTeacher/);
 assert.match(app,/tensePanel\(l\)/);
 assert.match(app,/function syncTeacher/);
 assert.match(app,/SpeechSynthesisUtterance/);
 assert.match(app,/function typeTeacher/);
 assert.match(app,/function loadOnboarding/);
 assert.match(app,/onboardPace/);
 assert.doesNotMatch(app,/profileTeacherVoice/);
 assert.match(app,/invite-friend/);
 assert.match(app,/finalExamCTA/);
 assert.match(app,/open-plan/);
 assert.match(html,/\/guided\.css/);
 assert.ok(existsSync(new URL('../public/teacher.js',import.meta.url)));
});
test('progress storage, optional Groq and four-card quiz remain available',()=>{
 const app=read('../public/app.js');
 assert.match(app,/const KEY='easay:v3:learner'/);
 assert.match(app,/localStorage\.setItem\(KEY/);
 assert.match(app,/function callAI/);
 assert.match(app,/lesson\.words|l\.words/);
 assert.match(app,/wordCards\(l\)/);
 assert.match(app,/quizQuestions\(l\)/);
 assert.match(app,/state\.completed/);
 assert.match(app,/\/api\/ai/);
});
test('service worker pre-caches all new teacher assets',()=>{
 const worker=read('../public/sw.js');
 for(const asset of ["'/teacher.js'","'/guided.css'","'/app.html'","'/refine.css'","'/minimal.css'","'/exam.html'","'/exam-ui.js'","'/exam.js'","'/certificate.html'","'/certificate.js'"]){
  assert.ok(worker.includes(asset),'missing offline asset '+asset);
 }
 assert.match(worker,/easay-static-v5.6/);
});
