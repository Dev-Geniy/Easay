import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderAssistantText as render} from '../public/format.js';
test('renders Markdown table into rows with mobile labels',()=>{
 const r=render('**План**\n\n| День | Тема |\n| --- | --- |\n| Пн | Приветствие |');
 assert.match(r,/<strong>План<\/strong>/);
 assert.match(r,/<table class="ai-table">/);
 assert.match(r,/data-label="День"/);
 assert.match(r,/Приветствие/);
});
test('renders lists without raw Markdown markers',()=>{
 const r=render('## Советы\n- Говори вслух\n- Повторяй\n\n1. Первый\n2. Второй');
 assert.match(r,/<h4>Советы<\/h4>/);
 assert.match(r,/<ul>/);
 assert.match(r,/<ol>/);
});
test('escapes hostile AI HTML and HTML in table cells',()=>{
 const r=render('<img src=x onerror=alert(1)>\n\n| <script> | Тема |\n| --- | --- |\n| <svg/onload=alert(1)> | **Привет** |');
 assert.doesNotMatch(r,/<img|<script|<svg/i);
 assert.match(r,/&lt;script&gt;/);
 assert.match(r,/<strong>Привет<\/strong>/);
});
