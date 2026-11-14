import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('quiz feedback is only part of ordinary lesson and leaves final exam code untouched',()=>{
 const app=read('../public/app.js'),exam=read('../public/exam-ui.js'),html=read('../public/app.html');
 assert.match(app,/createQuizFeedback/);
 assert.match(app,/quizFeedback\?\.open/);
 assert.match(html,/\/quiz-feedback\.css/);
 assert.doesNotMatch(exam,/createQuizFeedback|quizFeedback/);
 assert.match(exam,/restart/);
});
test('quiz grade remains deterministic and exact answer key is sent to AI',()=>{
 const m=read('../public/quiz-feedback.js'),app=read('../public/app.js');
 assert.match(m,/selected:.*answers\[i\]/);
 assert.match(m,/correct:q\.answer/);
 assert.match(m,/ok:answers\[i\]===q\.answer/);
 assert.match(m,/callAI\('feedback'/);
 assert.match(m,/callAI\('chat'/);
 assert.match(m,/onRetry\?\.\(\)/);
 assert.match(m,/onContinue\?\.\(score>=2\)/);
 assert.match(app,/completeLesson\(l,quizScore\)/);
 assert.match(app,/const KEY='easay:v3:learner'/);
});
test('review modal supports typing, escape, reduced motion and a clear secondary action',()=>{
 const m=read('../public/quiz-feedback.js'),css=read('../public/quiz-feedback.css');
 assert.match(m,/setInterval/);
 assert.match(m,/reducedMotion/);
 assert.match(m,/role="dialog" aria-modal="true"/);
 assert.match(m,/event\.key==='Escape'|e\.key==='Escape'/);
 assert.match(m,/Продолжить без пересдачи/);
 assert.match(m,/ПЕРЕСДАТЬ/);
 assert.match(css,/quiz-feedback-retry/);
 assert.match(css,/prefers-reduced-motion/);
});
