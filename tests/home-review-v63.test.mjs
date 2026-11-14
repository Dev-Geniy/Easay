import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REVIEW_RATINGS,isReviewDue,nextReviewDelay,reviewDelayLabel,scheduleReview} from '../public/review-scheduler.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const MINUTE=60_000,DAY=24*60*MINUTE;
const reference=Date.parse('2026-11-14T12:00:00Z');
test('three meaningful flashcard choices: no recollection, effortful recall, easy recall',()=>{
 assert.deepEqual(REVIEW_RATINGS.map(r=>r.label),['Не помню','С трудом','Легко']);
 const first=REVIEW_RATINGS.map(r=>nextReviewDelay(null,r.id));
 assert.deepEqual(first,[10*MINUTE,DAY,3*DAY]);
 assert.equal(reviewDelayLabel(first[0]),'через 10 мин');
 assert.equal(reviewDelayLabel(first[1]),'через 1 день');
 assert.equal(reviewDelayLabel(first[2]),'через 3 дня');
});
test('a forgotten word returns after 10 minutes, without an endless immediate review loop',()=>{
 const out=scheduleReview({level:4,due:'2026-11-14',repetitions:9},'again',reference);
 assert.equal(out.level,0);
 assert.equal(out.dueAt,reference+10*MINUTE);
 assert.equal(out.repetitions,10);
 assert.equal(out.lapses,1);
 assert.equal(out.lastRating,'again');
 assert.equal(isReviewDue(out,reference),false);
 assert.equal(isReviewDue(out,reference+10*MINUTE),true);
});
test('effortful recall retains the level, while easy recall increases intervals',()=>{
 const before={level:1,due:'2026-11-14',repetitions:2};
 const hard=scheduleReview(before,'hard',reference);
 const easy=scheduleReview(before,'easy',reference);
 assert.equal(hard.level,1);assert.equal(easy.level,2);
 assert.equal(hard.dueAt,reference+DAY);
 assert.equal(easy.dueAt,reference+7*DAY);
 assert.equal(before.level,1);
 assert.ok(easy.dueAt>hard.dueAt);
});
test('advanced cards have longer easy spacing with an upper level cap',()=>{
 const high={level:5,repetitions:10,lapses:2};
 const next=scheduleReview(high,'easy',reference);
 assert.equal(next.level,5);
 assert.equal(next.dueAt,reference+90*DAY);
 assert.equal(next.lapses,2);
 assert.equal(nextReviewDelay(high,'hard'),14*DAY);
});
test('old {level,due} reviews remain due on their original local date',()=>{
 const date=new Date('2026-11-14T12:00:00');
 assert.equal(isReviewDue({level:2,due:'2026-11-13'},date.getTime()),true);
 assert.equal(isReviewDue({level:2,due:'2026-11-14'},date.getTime()),true);
 assert.equal(isReviewDue({level:2,due:'2026-11-15'},date.getTime()),false);
 assert.equal(isReviewDue(null,date.getTime()),true);
 const migrated=scheduleReview({level:2,due:'2026-11-14'},'hard',date.getTime());
 assert.equal(typeof migrated.dueAt,'number');
 assert.ok(migrated.due>'2026-11-14');
});
test('review scheduler rejects unknown ratings rather than corrupting progress',()=>{
 assert.throws(()=>scheduleReview({level:3},'invalid',reference),RangeError);
 assert.throws(()=>nextReviewDelay(null,'good'),RangeError);
});
test('the new home is contextual, minimal, actionable and shows actual learning metrics',()=>{
 const app=read('../public/app.js'),css=read('../public/home-review.css');
 assert.match(app,/function home\(\)/);
 assert.match(app,/Продолжим обучение\?/);
 assert.match(app,/СЛЕДУЮЩИЙ УРОК/);
 assert.match(app,/class="btn white home-main-button" data-action="lesson"/);
 assert.match(app,/const due=dueReviewItems\(\)\.length/);
 assert.match(app,/class="home-quick-card" data-action="review"/);
 assert.match(app,/class="home-quick-card" data-action="home-stats"/);
 assert.match(app,/aria-expanded="\$\{homeStatsOpen\}"/);
 assert.match(app,/if\(action==='home-stats'\)/);
 assert.match(app,/pct\(completed,primary\.lessons\.length\)/);
 assert.doesNotMatch(app,/home-learning-figure/);
 assert.match(app,/Показатели отражают завершённые уроки/);
 assert.match(css,/home-quick-actions/);
 assert.match(css,/@media\(max-width:620px\)/);
});
test('scheduled reviews use exactly three ratings; free practice does not affect the schedule',()=>{
 const app=read('../public/app.js');
 assert.match(app,/REVIEW_RATINGS\.map/);
 assert.match(app,/data-action="remember"/);
 assert.match(app,/data-action="review-next"/);
 assert.match(app,/if\(reviewPractice&&reviewList\[flashIndex\]\)advanceReviewCard\(\)/);
 assert.match(app,/if\(!item\|\|reviewPractice\|\|!REVIEW_RATINGS/);
 assert.match(app,/scheduleReview\(state\.reviews\[item\.key\],rating\)/);
 assert.match(app,/if\(action==='review-scheduled'\)/);
 assert.match(app,/reviewList=due;reviewInitialized=true/);
 assert.match(app,/const dueReviewItems=\(\)=>Object\.entries\(state\.savedWords\)\.filter\(\(\[key\]\)=>isReviewDue/);
 assert.match(app,/const KEY='easay:v3:learner'/);
 assert.match(app,/state\.reviews\[key\]=\{level:0,due:/);
});
test('PWA precaches the new assets and does not require an external service',()=>{
 const sw=read('../public/sw.js'),html=read('../public/app.html');
 assert.match(sw,/easay-static-v6\.3/);
 assert.match(sw,/['"]\/review-scheduler\.js['"]/);
 assert.match(sw,/['"]\/home-review\.css['"]/);
 assert.match(html,/\/home-review\.css/);
 assert.match(html,/Версия 6\.3/);
 const src=read('../public/review-scheduler.js');
 assert.doesNotMatch(src,/fetch\(|Groq|api\/ai/);
});
