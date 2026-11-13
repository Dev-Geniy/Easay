import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const landing=read('../public/index.html');
const app=read('../public/app.html');
const intro=read('../public/intro.js');
test('site exposes a free lesson before app entry and a clearly voluntary donation choice',()=>{
 assert.match(landing,/id="first-lesson"/);
 assert.match(landing,/id="motivationDialog"/);
 assert.match(landing,/id="skipDonation"/);
 assert.match(landing,/Продолжить бесплатно/);
 assert.match(landing,/https:\/\/send\.monobank\.ua\/jar\/9ECZLkLXkq/);
 assert.match(landing,/4874 1000 3574 2876/);
 assert.match(landing,/50%/);
 assert.match(landing,/SkyKids/);
 assert.match(intro,/window\.location\.assign\('\/app\.html'\)/);
 assert.match(app,/app-charity/);
 assert.match(app,/<script type="module" src="\/app\.js"><\/script>/);
});
test('landing references deployable assets and PWA starts in the learning app',()=>{
 for(const path of ['intro.css','intro.js','intro-logic.js','ui.css','icons.js','app.html']){
  assert.ok(existsSync(new URL('../public/'+path,import.meta.url)),path+' is missing');
 }
 const manifest=JSON.parse(read('../public/manifest.webmanifest'));
 assert.equal(manifest.start_url,'/app.html');
});
