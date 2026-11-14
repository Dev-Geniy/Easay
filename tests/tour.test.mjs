import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TOUR_STEPS,TOUR_KEY,createTour} from '../public/tour.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('tour visits app sections in order without actions that call AI or write progress',()=>{
 const visited=new Set(TOUR_STEPS.map(s=>s.page));
 for(const name of ['home','catalog','course','lesson','review','practice','mentor','profile'])assert.ok(visited.has(name),name);
 assert.equal(TOUR_STEPS[0].page,'home');
 assert.equal(TOUR_STEPS.at(-1).page,'home');
 assert.equal(TOUR_STEPS.length,16);
 assert.ok(TOUR_STEPS.every(s=>s.title&&s.description&&s.target));
 assert.ok(!TOUR_STEPS.some(s=>/data-action="(check|mentor-send|reset|save-profile)"/.test(s.target)));
});
test('tour is optional and marks completion separately from learning data',()=>{
 assert.equal(TOUR_KEY,'easay:tour:v1');
 const source=read('../public/tour.js');
 assert.match(source,/getItem\(TOUR_KEY\)/);
 assert.match(source,/setItem\(TOUR_KEY,'done'\)/);
 assert.doesNotMatch(source,/localStorage\.removeItem/);
 assert.doesNotMatch(source,/fetch\(/);
 assert.match(source,/event\.key==='Escape'/);
 assert.match(source,/prefers-reduced-motion|requestAnimationFrame/);
 assert.equal(typeof createTour,'function');
});
test('learner app includes a restart button and separate accessible spotlight',()=>{
 const app=read('../public/app.js'),html=read('../public/app.html'),style=read('../public/tour.css');
 assert.match(app,/data-action="tour-start"/);
 assert.match(app,/createTour\(/);
 assert.match(app,/shouldAutoStart/);
 assert.match(html,/\/tour\.css/);
 assert.match(style,/\.tour-highlight/);
 assert.match(style,/\.tour-popover/);
 assert.match(style,/prefers-reduced-motion:reduce/);
});

test('penultimate tour step highlights the actual support card and keeps donation voluntary',()=>{
 const step=TOUR_STEPS.at(-2);
 assert.equal(step.page,'profile');
 assert.equal(step.target,'.app-charity');
 assert.match(step.title,/Бесплатно/);
 assert.match(step.description,/50%/);
 assert.match(step.description,/SkyKids/);
 assert.match(step.description,/по желанию/);
 const html=read('../public/app.html');
 assert.match(html,/class="app-charity"/);
 assert.match(html,/https:\/\/send\.monobank\.ua\/jar\/9ECZLkLXkq/);
 const css=read('../public/tour.css');
 assert.match(css,/data-spotlight="charity"/);
 const tour=read('../public/tour.js');
 assert.match(tour,/scrollIntoView/);
});
