import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,statSync} from 'node:fs';
const source=path=>readFileSync(new URL('../public/'+path,import.meta.url),'utf8');
test('homepage uses all four optimized generated images',()=>{
 const home=source('index.html');
 for(const name of ['hero','speaking','certificate','flag']){
  const path='../public/images/'+name+'.webp';
  assert.ok(existsSync(new URL(path,import.meta.url)),path);
  const bytes=readFileSync(new URL(path,import.meta.url));
  assert.equal(bytes.subarray(0,4).toString('ascii'),'RIFF');
  assert.equal(bytes.subarray(8,12).toString('ascii'),'WEBP');
  assert.ok(bytes.length<50000,'image exceeds 50KB: '+name);
  assert.ok(home.includes('/images/'+name+'.webp'),'homepage missing '+name);
 }
});
test('accessible scroll effects respect reduced motion and are self contained',()=>{
 const css=source('visual.css'),js=source('visual.js'),home=source('index.html');
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(js,/IntersectionObserver/);
 assert.match(js,/requestAnimationFrame/);
 assert.match(js,/pointer:fine/);
 assert.match(home,/visual\.css/);
 assert.match(home,/visual\.js/);
});
