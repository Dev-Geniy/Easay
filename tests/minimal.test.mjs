import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('theme choice and duplicate level badge are removed but learner state is preserved',()=>{
 const h=read('../public/app.html'),s=read('../public/app.js');
 assert.doesNotMatch(h,/id="themeBtn"/);
 assert.doesNotMatch(h,/id="levelTag"/);
 assert.doesNotMatch(h,/data-action="theme"/);
 assert.match(s,/const KEY='easay:v3:learner'/);
 assert.match(s,/theme:'light'/);
 assert.match(s,/classList\.remove\('dark'\)/);
 assert.doesNotMatch(s,/if\(action==='theme'\)/);
 assert.match(s,/state\.level/);
});
test('mentor is clean single-column with intact study-plan and chat controls',()=>{
 const s=read('../public/app.js');
 assert.match(s,/class="quiet-page mentor-page"/);
 assert.match(s,/id="mentorChat"/);
 assert.match(s,/id="mentorInput"/);
 assert.match(s,/data-action="mentor-send"/);
 assert.match(s,/data-action="mentor-quick"/);
 assert.match(s,/class="mentor-context"/);
 assert.match(s,/studyPlanView\(\)/);
 assert.doesNotMatch(s.slice(s.indexOf('function mentorView(){'),s.indexOf('function profileView(){')),/<aside class="card">/);
 assert.match(s,/navMain\[4\]\]\.map\(x=>navButton\(x,true\)\)/);
});
test('review empty icon is constrained and original review controls remain',()=>{
 const s=read('../public/app.js'),c=read('../public/minimal.css');
 assert.match(s,/function reviewView\(\)/);
 assert.match(s,/class="review-empty-mark"/);
 assert.match(c,/\.review-empty-mark svg,\.empty-symbol svg/);
 assert.match(c,/width:25px!important;height:25px!important/);
 assert.match(s,/data-action="review-refresh"/);
 assert.match(s,/data-action="remember"/);
 assert.match(s,/data-action="flip"/);
});
test('new stylesheet and assets are included in PWA cache',()=>{
 const h=read('../public/app.html'),w=read('../public/sw.js');
 assert.match(h,/\/minimal\.css/);
 assert.match(w,/easay-static-v6\.3.3/);
 assert.match(w,/['"]\/minimal\.css['"]/);
 assert.match(read('../public/minimal.css'),/@media\(prefers-reduced-motion:reduce\)/);
});
