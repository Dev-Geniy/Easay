import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FIRST_LESSON,safeNickname,isCorrect,lessonComplete} from '../public/intro-logic.js';
test('first lesson is three clear tasks and has safe, local nickname',()=>{
 assert.equal(FIRST_LESSON.count,3);
 assert.equal(safeNickname('<script> Sam </script>'),'script Sam /script');
 assert.equal(safeNickname('  '),'Sam');
 assert.equal(safeNickname('x'.repeat(100)).length,30);
});
test('feedback requires correct answers before progressing',()=>{
 assert.equal(isCorrect(1,'nice'),true);
 assert.equal(isCorrect(1,'wrong'),false);
 assert.equal(isCorrect(2,'good'),true);
 assert.equal(isCorrect(2,'where'),false);
 assert.equal(lessonComplete(3),true);
 assert.equal(lessonComplete(2),false);
});
