import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL(path,import.meta.url),'utf8');
test('hero and marketing media are integrated without rectangular card cuts',()=>{
 const html=read('../public/index.html'), css=read('../public/visual.css');
 for(const cls of ['hero-art','speaking-media','certificate-media'])assert.match(html,new RegExp('class="'+cls+'(?: |")'));
 assert.match(css,/mask-image:radial-gradient/);
 assert.match(css,/\.hero-art>img/);
 assert.match(css,/mix-blend-mode:multiply/);
 assert.doesNotMatch(html,/speaking-floating-pill/);
 assert.doesNotMatch(html,/hero-floating-note/);
});
test('first lesson has a clear single input and keeps functional learning controls',()=>{
 const html=read('../public/index.html'),js=read('../public/intro.js'),css=read('../public/intro.css');
 assert.match(html,/class="lesson-focus-phrase"/);
 assert.match(html,/class="lesson-answer"/);
 assert.match(html,/id="learnerName"/);
 assert.match(html,/placeholder="Введи своё имя"/);
 assert.match(html,/id="speakHello"/);
 assert.match(html,/id="lessonNext"/);
 assert.match(html,/id="previewName"/);
 assert.match(html,/id="choiceOne"/);
 assert.match(html,/id="choiceTwo"/);
 assert.match(html,/id="motivationDialog"/);
 assert.match(css,/\.lesson-answer>input:focus/);
 assert.match(js,/showStep/);
});
test('motion respects user preference and service worker refreshes design',()=>{
 const css=read('../public/intro.css')+read('../public/visual.css');
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 const worker=read('../public/sw.js');
 assert.match(worker,/easay-static-v5\.6/);
 for(const asset of ["'/visual.css'","'/intro.css'","'/images/hero.webp'","'/images/speaking.webp'","'/images/certificate.webp'"])assert.ok(worker.includes(asset));
});
