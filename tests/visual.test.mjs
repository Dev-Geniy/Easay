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
 assert.match(worker,/easay-static-v6\.3.3/);
 for(const asset of ["'/visual.css'","'/intro.css'","'/images/hero-ai.avif'","'/images/speaking.webp'","'/images/certificate.webp'"])assert.ok(worker.includes(asset));
 assert.ok(worker.includes('webp|avif'));
});

test('illustration edges fully feather into white and do not crop on narrow mobile devices',()=>{
 const html=read('../public/index.html'),css=read('../public/visual.css');
 for(const name of ['hero-ai.avif','speaking.webp','certificate.webp'])assert.ok(html.includes('/images/'+name));
 const heroImage=readFileSync(new URL('../public/images/hero-ai.avif',import.meta.url));
 assert.equal(heroImage.toString('ascii',4,12),'ftypavif');
 assert.ok(html.includes('href="/images/hero-ai.avif"'));
 assert.ok(css.includes('@media(max-width:600px){'));
 assert.ok(css.includes('position:absolute;z-index:0;top:57px'));
 assert.match(css,/ellipse closest-side at 50% 50%/);
 assert.match(css,/transparent 100%/);
 assert.match(css,/-webkit-mask-image:radial-gradient/);
 assert.match(css,/\.speaking-media img,\.certificate-media img\{width:100%;left:0\}/);
 assert.match(css,/\.hero-art>img,\.speaking-media img,\.certificate-media img\{-webkit-mask-repeat:no-repeat/);
 assert.match(html,/visual\.css\?v=6\.3\.4/);
});
test('new slogans stay coherent through the landing journey',()=>{
 const html=read('../public/index.html');
 for(const phrase of ['Говори по-английски.','Начни с одной фразы.','Первая фраза. Первый разговор.','Учи. Повторяй.','Применяй в жизни.','Не только знать слова.','Английский под твою цель','Результат, который можно проверить.'])assert.ok(html.includes(phrase),phrase);
});
