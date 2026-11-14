import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('review queue is exactly due items and optional full-deck practice is a separate action',()=>{
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(app,/if\(!reviewInitialized\)\{reviewList=due;reviewInitialized=true;\}/);
 assert.doesNotMatch(app,/reviewList=due\.length\?due:/);
 assert.match(app,/Тренироваться дополнительно|Тренироваться дополнительно →/);
 assert.match(app,/data-action="review-refresh"/);
});
