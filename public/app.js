import {COURSES,ALL_LESSONS,TOTAL_LESSONS,getCourse,getLesson} from './courses.js';
import {renderAssistantText} from './format.js';
import {makeWeeklyPlan} from './plan.js';
import {LESSON_SCRIPTS,teacherFor,timelineFor} from './teacher.js';
import {achievements} from './exam.js';
import {glyph} from './icons.js';
import {createTour} from './tour.js';
import {createQuizFeedback} from './quiz-feedback.js';
import {deckForLesson} from './flashcards.js';

const KEY='easay:v3:learner';
const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const escapeHTML = (value='') => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localDay=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const addDays=(d,n)=>{const v=new Date(`${d}T12:00:00`);v.setDate(v.getDate()+n);return localDay(v)};
const initial={version:3,onboarded:false,firstName:'',level:'A1',primary:'everyday',theme:'light',completed:{},reviews:{},savedWords:{},mistakes:[],mentorHistory:[],autoCoach:true,aiUsage:{day:localDay(),count:0},lastPractice:localDay(),studyPlan:null,teacherVoice:false,pace:'regular',inviteHidden:false,savedAt:0};
function readState(){try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(!raw||raw.version!==3)return structuredClone(initial);return {...structuredClone(initial),...raw,theme:'light',completed:raw.completed||{},reviews:raw.reviews||{},savedWords:raw.savedWords||{},mentorHistory:raw.mentorHistory||[]};}catch{return structuredClone(initial)}}
let state=readState();
let reviewInitialized=false;
let showStudyPlan=false;
let activeTeacherKey='',teacherTypingTimer=null;
let pairLessonId=null;
let tour=null;
let quizFeedback=null;
let page='home',filter='all',query='',courseId=state.primary,lessonId=`${state.primary}-1`,step=0,answers={},quizChecked=false,quizScore=0,aiBusy=false,flashIndex=0,flashRevealed=false,reviewList=[],lessonDeckIndex=0,lessonDeckRevealed=false,chatBusy=false,lessonCoach='',lessonCoachId='',coachBusy=false,chatContext='daily';
const navMain=[['home','⌂','Главная'],['catalog','▦','Все курсы'],['review','▤','Повторение'],['practice','◉','Разговорная практика'],['mentor','✦','ИИ-наставник']];
const navExtra=[['profile','⚙','Настройки']];
const filteredCourses=()=>COURSES.filter(c=>(filter==='all'||c.group===filter)&&(!query||`${c.title} ${c.ru} ${c.desc} ${c.level}`.toLowerCase().includes(query.toLowerCase())));
const doneCount=(course)=>course.lessons.filter(l=>state.completed[l.id]).length;
const pct=(a,b)=>b?Math.round(a/b*100):0;
const dailyDone=()=>Object.values(state.completed).filter(x=>x.date===localDay()).length;
const dueReviewItems=()=>Object.entries(state.savedWords).filter(([key])=>!state.reviews[key]||state.reviews[key].due<=localDay()).map(([key,value])=>({key,...value}));
const totalReviewItems=()=>Object.keys(state.savedWords).length;
const createWordKey=(lesson,i)=>`${lesson.id}:${i}`;
const dateLabel=()=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long'}).format(new Date());
const normalized=v=>String(v).toLowerCase().replace(/[’‘]/g,"'").replace(/[.!?,:]/g,'').replace(/\s+/g,' ').trim();
const courseOfLesson=(id)=>getCourse(getLesson(id)?.courseId);
const nextUnfinished=(id)=>{const course=getCourse(id);return course?.lessons.find(l=>!state.completed[l.id])||course?.lessons[course.lessons.length-1]};
const todayUsage=()=>{if(state.aiUsage.day!==localDay())state.aiUsage={day:localDay(),count:0};return state.aiUsage.count};
function save(){try{state.savedAt=Date.now();localStorage.setItem(KEY,JSON.stringify(state));}catch{toast('Не удалось сохранить прогресс. Проверь настройки хранилища браузера.')}}
function toast(msg){const div=document.createElement('div');div.className='toast';div.textContent=msg;$('#toasts').append(div);setTimeout(()=>div.remove(),4300)}
function pageHeading(title,subtitle,small='LEARN WITH EASAY'){return `<div class="page-head"><div><div class="overline">${escapeHTML(small)}</div><h1 class="page-title">${escapeHTML(title)}</h1><p class="page-sub">${escapeHTML(subtitle)}</p></div></div>`}
function avatarText(){return (state.firstName||'E').slice(0,1).toUpperCase()}
function navButton([id,icon,label],mobile=false){const active=page===id||(page==='lesson'&&id==='catalog')||(page==='course'&&id==='catalog');return `<button type="button" class="${mobile?'mobile-btn':'nav-btn'} ${active?'active':''}" data-action="${id}" aria-label="${label}" ${active?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">${glyph(id)}</span><span>${label}</span></button>`}
function navRender(){ $('#sideNav').innerHTML=navMain.map(x=>navButton(x)).join('');$('#sideExtra').innerHTML=navExtra.map(x=>navButton(x)).join('');$('#mobileNav').innerHTML=[navMain[0],navMain[1],navMain[2],navMain[3],navMain[4]].map(x=>navButton(x,true)).join('');$('#avatar').textContent=avatarText();$('#aiQuotaLabel').textContent=`ИИ ${todayUsage()}/8 сегодня (на устройстве)`;document.documentElement.classList.remove('dark');}
function progressStats(){return `<div class="stat-grid"><div class="card stat-card"><span class="stat-icon">${glyph("book")}</span><strong>${Object.keys(state.completed).length}</strong><small>Уроков завершено</small></div><div class="card stat-card"><span class="stat-icon">${glyph("award")}</span><strong>${Object.values(state.completed).reduce((a,b)=>a+(b.score||0),0)}</strong><small>Правильных ответов</small></div><div class="card stat-card"><span class="stat-icon">${glyph("stack")}</span><strong>${totalReviewItems()}</strong><small>Фраз в словаре</small></div><div class="card stat-card"><span class="stat-icon">${glyph("calendar")}</span><strong>${getStreak()}</strong><small>Дней с уроками подряд</small></div></div>`}
function getStreak(){const dates=[...new Set(Object.values(state.completed).map(x=>x.date))].sort().reverse();if(!dates.length)return 0;let cursor=localDay();if(!dates.includes(cursor))cursor=addDays(cursor,-1);let count=0;while(dates.includes(cursor)){count++;cursor=addDays(cursor,-1)}return count}
function courseCard(c){const n=doneCount(c),progress=pct(n,c.lessons.length);return `<article class="card course-card" style="--csoft:${c.tone};--accent:${c.accent}"><div class="course-top"><div class="course-icon">${glyph(c.id)}</div><span class="course-level">${c.level}</span></div><h3>${escapeHTML(c.title)}</h3><p class="course-desc">${escapeHTML(c.ru)} · ${escapeHTML(c.desc)}</p><div class="course-footer"><span>${n} из ${c.lessons.length} уроков</span><button class="text-link" data-action="course" data-id="${c.id}">Открыть ↗</button></div><div class="mini-progress" aria-label="Пройдено ${progress}%"><span style="width:${progress}%"></span></div></article>`}
function badgeStrip(){
 const list=achievements(state.completed,state.savedWords,state.mistakes);
 return '<div class="badge-strip" aria-label="Достижения">'+list.map(b=>'<div class="achievement '+(b.earned?'earned':'pending')+'" title="'+escapeHTML(b.hint)+'"><span class="badge-mark">'+(b.earned?'✓':'○')+'</span><span>'+escapeHTML(b.name)+'</span></div>').join('')+'</div>';
}
function inviteBox(l){
 if(state.inviteHidden||!quizChecked||quizScore<2)return '';
 return '<section class="friend-invite"><div><strong>Практика лучше вдвоём</strong><p>Отправь другу этот урок. Откройте одинаковый диалог, распределите роли A и B и говорите по очереди рядом или во время звонка.</p></div><button class="btn tiny ghost" data-action="invite-friend" data-id="'+escapeHTML(l.id)+'">Пригласить друга ↗</button><button class="invite-hide" data-action="hide-invite">Больше не показывать</button></section>';
}
function pairPractice(l){
 const w=l.words;
 return '<section class="pair-practice"><span class="overline">ПРАКТИКА ВДВОЁМ · 2 РОЛИ</span><h3>Поговорите по очереди</h3><p>Первый читает реплики A, второй — реплики B. Повторите диалог, поменявшись ролями. Внутреннего звонка здесь нет: используйте телефонный или видеозвонок либо занимайтесь рядом.</p><div class="pair-turns">'+w.map((x,i)=>'<div><span>'+((i%2)?'B':'A')+'</span><strong>'+escapeHTML(x[0])+'</strong><small>'+escapeHTML(x[1])+'</small></div>').join('')+'</div></section>';
}
function finalExamCTA(course,completed){
 const available=completed===course.lessons.length;
 return '<section class="course-final"><div><span class="overline">ФИНАЛЬНАЯ ПРОВЕРКА</span><h3>Итоговый экзамен · 100 баллов</h3><p>40 вопросов по всему курсу. Перед экзаменом ты повторишь все фразы. Для сертификата Easay нужно набрать 90 из 100. Серверная проверка сертификата доступна после подключения Cloudflare D1.</p></div>'+(available?'<a class="btn" href="/exam.html?course='+encodeURIComponent(course.id)+'">Пройти экзамен →</a>':'<span class="pill">'+completed+' / '+course.lessons.length+' уроков до экзамена</span>')+'</section>';
}
function home(){
 const primary=getCourse(state.primary)||COURSES[0];
 const next=nextUnfinished(primary.id);
 const completed=doneCount(primary);
 const progress=pct(completed,primary.lessons.length);
 const lastMistake=state.mistakes[state.mistakes.length-1];
 const rhythm=({gentle:'В своём темпе',regular:'Несколько раз в неделю',daily:'Каждый день'})[state.pace]||'В своём темпе';
 const guidance=lastMistake&&getLesson(lastMistake.id)?'Вернись к сложной теме «'+lastMistake.title+'» и повтори её.':next.tip;
 return `<div class="home-quiet"><div class="home-topline"><span class="overline">ТВОЙ АНГЛИЙСКИЙ</span><span class="pill">${escapeHTML(state.level)} · ${escapeHTML(rhythm)}</span></div><h1 class="page-title">${state.firstName?'Привет, '+escapeHTML(state.firstName)+'.':'Привет!'}</h1><p class="page-sub">Продолжим с того места, где ты остановился.</p>
 <section class="home-primary"><div class="home-primary-content"><span class="home-label">СЛЕДУЮЩИЙ УРОК</span><h2>${escapeHTML(next.title)}</h2><p>${escapeHTML(primary.ru)} · Урок ${next.number} из ${primary.lessons.length}</p><button class="btn white home-main-button" data-action="lesson" data-id="${escapeHTML(next.id)}">Продолжить обучение →</button></div><div class="home-learning-figure" aria-hidden="true"><div>EN</div><span>10 минут</span></div></section>
 <div class="home-progress-panel"><div><span class="overline">МОЙ МАРШРУТ</span><strong>${escapeHTML(primary.title)}</strong><small>${completed} из ${primary.lessons.length} уроков пройдено</small></div><div class="home-ring" style="--percent:${progress}%"><span>${progress}%</span></div></div>
 <div class="home-guidance"><span class="guide-icon">${glyph('mentor')}</span><div><strong>Совет преподавателя</strong><p>${escapeHTML(guidance)}</p></div><button class="btn tiny ghost" data-action="open-plan">Мой план →</button></div>
 <div class="home-links"><button class="btn outline" data-action="catalog">Выбрать направление →</button><button class="btn ghost" data-action="review">Повторить фразы</button></div>
 <details class="home-expanded"><summary>Достижения и подробная статистика</summary>${badgeStrip()}${progressStats()}</details></div>`;
}
function catalog(){return `${pageHeading('Выбери свой английский','Не один универсальный курс, а направления под реальные цели. Уроки доступны в любом порядке.',`11 НАПРАВЛЕНИЙ · ${TOTAL_LESSONS} УРОКОВ`)}<div class="row" style="flex-wrap:wrap;margin-bottom:18px"><div class="level-grid"><button class="filter-pill ${filter==='all'?'active':''}" data-action="filter" data-value="all">Все</button><button class="filter-pill ${filter==='start'?'active':''}" data-action="filter" data-value="start">С нуля</button><button class="filter-pill ${filter==='life'?'active':''}" data-action="filter" data-value="life">Для жизни</button><button class="filter-pill ${filter==='career'?'active':''}" data-action="filter" data-value="career">Для карьеры</button><button class="filter-pill ${filter==='study'?'active':''}" data-action="filter" data-value="study">Учёба и B2</button></div><label class="search-field"><span aria-hidden="true">⌕</span><input id="courseSearch" type="search" placeholder="Найти курс..." value="${escapeHTML(query)}" aria-label="Поиск курса"></label></div><div id="courseGrid" class="course-grid">${filteredCourses().map(courseCard).join('')||'<div class="empty"><p>По запросу ничего не нашлось.</p></div>'}</div>`}
function courseView(){const c=getCourse(courseId)||COURSES[0];const next=nextUnfinished(c.id);const n=doneCount(c);const options=c.lessons.map(l=>`<button class="lesson-item" data-action="lesson" data-id="${l.id}"><span class="lesson-index ${state.completed[l.id]?'done':''}">${state.completed[l.id]?'✓':String(l.number).padStart(2,'0')}</span><span class="grow"><b>${escapeHTML(l.title)}</b><small>${escapeHTML(l.words[0][0])} · ~10 минут</small></span><span class="lesson-arrow">→</span></button>`).join('');return `<div class="lesson-shell" style="max-width:1050px"><button class="text-link" data-action="catalog" style="margin-bottom:18px">← Все курсы</button><section class="course-cover" style="--cover:${c.tone};--cover2:#f8f9ff"><div class="cover-emoji">${glyph(c.id)}</div><div><div class="overline">${c.level} · ${c.lessons.length} УРОКОВ</div><h2>${escapeHTML(c.title)}</h2><p>${escapeHTML(c.desc)} ${escapeHTML(c.grammar)}</p><button class="btn" data-action="lesson" data-id="${next.id}">${n===c.lessons.length?'Повторить последний урок':'Продолжить курс'} →</button></div></section><div class="section-heading"><h2 class="h2">Программа курса</h2><span class="pill">${n}/${c.lessons.length} готово · ${pct(n,12)}%</span></div><div class="mini-progress" style="margin:-2px 0 19px;height:8px"><span style="width:${pct(n,12)}%;background:${c.accent}"></span></div><div class="lesson-list">${options}</div>${finalExamCTA(c,n)}</div>`}
const lessonStepNames=['Знакомство','Новые слова','Диалог','Карточки','Проверка'];
function wordCards(l){return `<div class="word-grid">${l.words.map((w,i)=>`<div class="word-card"><div class="word-en">${escapeHTML(w[0])}</div><div class="word-ru">${escapeHTML(w[1])}</div><div class="word-actions"><button data-action="speak" data-text="${escapeHTML(w[0])}" aria-label="Прослушать ${escapeHTML(w[0])}">${glyph("volume")} Слушать</button><button data-action="saveword" data-id="${l.id}" data-index="${i}">${state.savedWords[createWordKey(l,i)]?'✓ В словаре':'+ В словарь'}</button></div></div>`).join('')}</div>`}
function lessonCoachBlock(defaultText='Нужна дополнительная помощь?'){
 if(!state.autoCoach)return '';
 return `<details class="coach-inline"><summary class="coach-toggle">Дополнительная помощь ИИ <span>по желанию</span></summary><div class="coach-content"><div id="lessonCoachContent" class="coach-message">${lessonCoach?renderAssistantText(lessonCoach):escapeHTML(defaultText)}</div><div class="coach-footer"><button class="btn tiny ghost" data-action="coach-explain">Объясни иначе</button><button class="btn tiny ghost" data-action="coach-example">Дай пример</button><button class="btn tiny ghost" data-action="coach-challenge">Дай мини-задание</button></div></div></details>`;
}
function tensePanel(l){
 const t=timelineFor(l.id);if(!t)return '';
 return `<section class="tense-panel" aria-label="Примеры в разных временах"><div class="tense-head"><strong>Сейчас · Было · Будет</strong><span>${t.mode==='change'?'Как меняется глагол':'Как меняется контекст'}</span></div><div class="tense-grid">${t.samples.map(x=>`<div class="tense-card"><span class="tense-tag">${escapeHTML(x.tag)}</span><strong>${escapeHTML(x.en)}</strong><small>${escapeHTML(x.ru)}</small><button class="tense-audio" data-action="speak" data-text="${escapeHTML(x.en)}" aria-label="Прослушать пример">${glyph("volume")}</button></div>`).join('')}</div><p class="tense-note">${escapeHTML(t.note)}</p></section>`;
}
function lessonIntro(l,c){
 return `<div class="lesson-intro-clean"><div class="overline">УРОК ${l.number} · ${escapeHTML(c.title)}</div><h2 class="h2">${escapeHTML(l.title)}</h2><p class="lesson-lead">Сегодня одна полезная фраза, её разбор и практика — без длинной теории.</p><div class="example-box focus-phrase"><div class="overline">ФРАЗА ДНЯ</div><strong>${escapeHTML(l.example)}</strong><p>${escapeHTML(l.translation)}</p><button class="btn tiny ghost" data-action="speak" data-text="${escapeHTML(l.example)}">${glyph("volume")} Прослушать</button></div><div class="phrase-breakdown"><strong>Короткий разбор</strong><p>${escapeHTML(LESSON_SCRIPTS[l.id].breakdown)}</p></div>${tensePanel(l)}</div>${lessonCoachBlock('Нужен ещё один пример или более простое объяснение?')}`;
}
function lessonWords(l,c){return `<div class="overline">ШАГ 2 · НОВЫЕ ФРАЗЫ</div><h2 class="h2" style="margin-top:10px">Говори целыми фразами</h2><p>Нажимай «Слушать», повторяй вслух и сохраняй нужные выражения.</p>${wordCards(l)}<div class="tip-card">${escapeHTML(c.grammar)}</div>${lessonCoachBlock('Повтори четыре выражения вслух. Если какое-то непонятно — попроси объяснить.')}`}
function lessonDialogue(l){const w=l.words;const lines=[['A',w[0][0],w[0][1]],['B',w[1][0],w[1][1]],['A',w[2][0],w[2][1]],['B',w[3][0],w[3][1]]];return `<div class="overline">ШАГ 3 · СИТУАЦИЯ</div><h2 class="h2" style="margin-top:10px">Диалог по теме</h2><p>Это учебная мини-сценка из фраз урока. Попробуй прочитать её за двух собеседников.</p>${pairLessonId===l.id?pairPractice(l):''}<div class="dialogue-chat">${lines.map(([person,en,ru],i)=>`<div class="dialogue-row ${i%2?'right':''}"><span class="dialogue-avatar">${person}</span><div class="dialogue-bubble"><strong>${escapeHTML(en)}</strong><p>${escapeHTML(ru)}</p><button class="text-link" data-action="speak" data-text="${escapeHTML(en)}" style="margin-top:10px;font-size:11px">${glyph("volume")} Слушать</button></div></div>`).join('')}</div><div class="example-box"><strong>${escapeHTML(l.example)}</strong><p>${escapeHTML(l.translation)}</p></div>${lessonCoachBlock('Готов потренировать этот диалог с ИИ? Наставник может сыграть роль собеседника.')}<div style="margin-top:12px"><button class="btn ghost" data-action="roleplay" data-id="${l.id}">◉ Потренировать диалог с ИИ →</button></div>`}
function lessonFlashcards(l){
 const cards=deckForLesson(l),item=cards[lessonDeckIndex]||cards[0];
 return `<div class="lesson-deck"><div class="overline">ШАГ 4 · ЗАКРЕПЛЕНИЕ</div><h2 class="h2" style="margin-top:10px">Вспомни перевод</h2><p class="lesson-deck-intro">Сначала подумай, что означает английская фраза. Затем переверни карточку.</p>
 <div class="lesson-deck-count">Карточка ${lessonDeckIndex+1} из ${cards.length}</div>
 <button type="button" class="lesson-flashcard ${lessonDeckRevealed?'revealed':''}" data-action="lesson-card-flip" aria-label="${lessonDeckRevealed?'Показать английский':'Открыть перевод'}">
  <span class="lesson-deck-language">${lessonDeckRevealed?'РУССКИЙ ПЕРЕВОД':'АНГЛИЙСКАЯ ФРАЗА'}</span>
  <strong>${escapeHTML(lessonDeckRevealed?item.ru:item.en)}</strong>
  <small>${lessonDeckRevealed?'Нажми для английского':'Нажми, чтобы узнать перевод'}</small>
 </button>
 <div class="lesson-deck-buttons">
  <button class="btn outline" data-action="speak" data-text="${escapeHTML(item.en)}">${glyph('volume')} Слушать</button>
  ${lessonDeckRevealed?`<button class="btn" data-action="lesson-card-next">${lessonDeckIndex===cards.length-1?'Перейти к тесту →':'Следующая карточка →'}</button>`:`<button class="btn" data-action="lesson-card-flip">Показать перевод →</button>`}
 </div></div>`;
}
function quizQuestions(l){const c=getCourse(l.courseId);let others=c.lessons.flatMap(x=>x.words).filter(([a,b])=>!l.words.some(w=>w[0]===a||w[1]===b));const pick=(correct,arr,seed)=>{const unique=[...new Set([correct,...arr])].filter(Boolean);const wrong=unique.filter(x=>x!==correct).sort((a,b)=>a.localeCompare(b)).slice(seed,seed+7);const opts=[correct,...wrong.slice(0,3)];while(opts.length<4){const extra=arr.find(x=>!opts.includes(x));if(!extra)break;opts.push(extra)}const index=seed%opts.length;opts.splice(0,1);opts.splice(index,0,correct);return opts};let w=l.words;return [
{q:`Как перевести «${w[0][0]}»?`,opts:pick(w[0][1],w.slice(1).map(x=>x[1]).concat(others.map(x=>x[1])),l.number%3),answer:w[0][1]},
{q:`Выбери английскую фразу для «${w[1][1]}».`,opts:pick(w[1][0],[w[0][0],w[2][0],w[3][0],...others.map(x=>x[0])],(l.number+1)%4),answer:w[1][0]},
{q:`Что означает «${w[2][0]}»?`,opts:pick(w[2][1],[w[0][1],w[1][1],w[3][1],...others.map(x=>x[1])],(l.number+2)%4),answer:w[2][1]}
]}
function quizView(l){const tests=quizQuestions(l);const banner=quizChecked?`<div class="result-banner ${quizScore<2?'fail':''}"><strong>${quizScore>=2?'Отлично! Урок зачтён':'Нужно немного повторить'}</strong><span>Правильных ответов: ${quizScore} из 3. ${quizScore>=2?'Фразы добавлены в твой прогресс.':'Посмотри верные варианты и попробуй снова.'}</span></div>`:'';return `<div class="overline">ШАГ 5 · ПРОВЕРЬ СЕБЯ</div><h2 class="h2" style="margin-top:10px">Закрепим результат</h2><p>Ответь на 3 вопроса. Для зачёта нужно минимум 2 правильных ответа.</p><div class="quiz">${tests.map((q,i)=>`<div class="quiz-card"><div class="quiz-number">Вопрос ${i+1} / 3</div><div class="quiz-question">${escapeHTML(q.q)}</div><div class="quiz-options">${q.opts.map((opt,n)=>`<button class="quiz-option ${answers[i]===opt?'selected':''} ${quizChecked&&opt===q.answer?'correct':''} ${quizChecked&&answers[i]===opt&&opt!==q.answer?'wrong':''}" data-action="answer" data-q="${i}" data-value="${escapeHTML(opt)}" ${quizChecked?'disabled':''}>${String.fromCharCode(65+n)}. ${escapeHTML(opt)}</button>`).join('')}</div></div>`).join('')}</div>${banner}${inviteBox(l)}${lessonCoachBlock(quizChecked&&quizScore<2?'Посмотри верные варианты. Я помогу разобрать ошибки.':'Проверим, что ты запомнил. Можно попросить дополнительную подсказку.')}`}
function lessonView(){
 const l=getLesson(lessonId)||ALL_LESSONS[0],c=getCourse(l.courseId);
 const steps=()=>[lessonIntro(l,c),lessonWords(l,c),lessonDialogue(l),lessonFlashcards(l),quizView(l)];
 const rendered=steps()[step].replace('</h2>','</h2><p class="inline-teacher" id="scriptedTeacherText" aria-label="Подсказка преподавателя"></p>');
 let right='';
 if(step<=2)right='<button class="btn" data-action="step-next">Продолжить →</button>';
 else if(step===3)right='<span class="small-text subtle">Проверь все 4 карточки, затем переходи к тесту.</span>';
 else if(quizChecked&&quizScore>=2)right='<button class="btn" data-action="nextlesson">Следующий шаг →</button>';
 else if(quizChecked)right='<button class="btn" data-action="retry">Повторить тест →</button>';
 else right='<button class="btn" data-action="check" '+(Object.keys(answers).length<3?'disabled':'')+'>Проверить ответы →</button>';
 return `<div class="lesson-shell"><div class="lesson-header"><button class="back-btn" data-action="course" data-id="${c.id}" title="Вернуться к курсу">←</button>
 <div class="stepper" aria-label="Этап ${step+1} из 5">${[0,1,2,3,4].map(i=>`<div class="step ${i<=step?'active':''}"></div>`).join('')}</div><span class="lesson-label">${step+1}/5</span></div>
 <div class="lesson-viewport"><div class="card lesson-topcard">${rendered}</div></div>
 <div class="lesson-controls"><button class="btn outline" data-action="step-prev" ${step===0?'disabled':''}>← Назад</button><span class="small-text subtle">${lessonStepNames[step]}</span>${right}</div>
 <p class="note" style="margin-top:18px">Прогресс сохраняется в браузере. Точность произношения автоматически не оценивается.</p></div>`;
}
function reviewView(){
 const due=dueReviewItems(),count=totalReviewItems();
 if(!reviewInitialized){reviewList=due.length?due:Object.entries(state.savedWords).map(([key,value])=>({key,...value}));reviewInitialized=true;}
 flashIndex=Math.min(flashIndex,Math.max(reviewList.length-1,0));
 const current=reviewList[flashIndex];
 const flash=current?`<div class="review-activity">
   <button type="button" class="flash-card review-card" data-action="flip" aria-label="Перевернуть карточку">
    <span class="flash-counter">${flashIndex+1} / ${reviewList.length}</span>
    <span class="big-word">${escapeHTML(flashRevealed?current.ru:current.en)}</span>
    <span class="flash-hint">${flashRevealed?'Удалось вспомнить?':'Нажми, чтобы увидеть перевод'}</span>
   </button>
   <div class="flash-controls">${flashRevealed?`<button class="btn outline" data-action="remember" data-value="again">Повторить позже</button><button class="btn" data-action="remember" data-value="good">Помню ✓</button>`:`<button class="btn" data-action="flip">Показать перевод →</button>`}</div>
 </div>`:
 `<div class="review-empty"><span class="review-empty-mark" aria-hidden="true">${glyph(count?'award':'book')}</span><h2>${count?'На сегодня всё!':'Здесь появятся твои фразы'}</h2>
 <p>${count?'Ты повторил все карточки на сегодня.':'Добавляй фразы во время уроков, чтобы закреплять их здесь.'}</p>
 <button class="btn" data-action="${count?'review-refresh':'catalog'}">${count?'Повторить ещё →':'Выбрать урок →'}</button></div>`;
 return `<div class="quiet-page review-page">
   <header class="quiet-page-head"><h1>Повторение</h1><p>Немного практики — и фразы остаются с тобой.</p></header>
   <section class="review-surface" aria-label="Карточки для повторения">
    <div class="review-surface-top"><strong>Карточки</strong><span>${due.length} к повторению</span></div>${flash}
   </section>
   <div class="review-secondary"><span>В словаре: ${count}</span>
    <button class="text-link" data-action="catalog">Добавить фразы</button>
    ${count?`<button class="text-link" data-action="review-refresh">Начать заново</button>`:''}
    <details class="review-help"><summary>Как работает повторение?</summary><p>Когда отмечаешь «Помню», интервал до следующей проверки увеличивается. Всё работает без ИИ.</p></details>
   </div>
 </div>`;
}
function conversationCard(){return `<div class="chat-box" id="practiceChat">${practiceMessages.map(m=>`<div class="chat-bubble ${m.role==='user'?'mine':'ai-rich'}">${m.role==='user'?escapeHTML(m.text):renderAssistantText(m.text)}</div>`).join('')}</div>`}
let practiceMessages=[];
function practiceView(){const c=getCourse(chatContext)||getCourse(state.primary);const starters=[['daily','practice','Поговорить о себе'],['work','work','Разговор с коллегой'],['travel','travel','Ситуация в путешествии'],['business','business','Деловая встреча']];return `${pageHeading('Разговорная практика','Потренируй английский без страха ошибиться. Наставник поддержит разговор и даст точечную обратную связь.','SPEAKING LAB')}<div class="mentor-layout"><section class="card"><div class="row"><h2 class="h2">◉ Разговор с ИИ</h2><span class="pill">${state.level} · ${escapeHTML(c.title)}</span></div><p class="note">Используй текст или голосовой ввод, если браузер поддерживает распознавание речи. Это не экзамен по произношению.</p>${conversationCard()}<div class="chat-form"><textarea id="practiceInput" class="chat-input" rows="1" maxlength="1500" placeholder="Напиши или скажи ответ по-английски..."></textarea><button class="btn ghost" data-action="mic" title="Голосовой ввод" aria-label="Голосовой ввод">${glyph("mic")}</button><button class="btn" data-action="practice-send" ${chatBusy?'disabled':''}>→</button></div><div class="row" style="margin-top:12px;flex-wrap:wrap"><button class="text-link" data-action="practice-start">✦ Начать диалог</button><button class="text-link" data-action="speak-last">${glyph("volume")} Последний ответ</button><button class="text-link" data-action="practice-clear">↺ Очистить</button></div></section><aside class="card"><h3 class="h3">Выбери ситуацию</h3><p class="note">Программа подстроит разговор под выбранную тему.</p><div class="quick-grid" style="margin-top:16px">${starters.map(([id,emoji,label])=>`<button class="quick-card" data-action="scenario" data-id="${id}" style="${chatContext===id?'border-color:var(--primary);background:var(--soft)':''}">${glyph(emoji)} ${label}</button>`).join('')}</div><div class="tip-card" style="margin-top:23px">Попробуй отвечать полными предложениями. Если трудно — пиши по-русски и попроси подсказку.</div></aside></div>`}
function ensureStudyPlan(force=false){
  const old=state.studyPlan;
  if(force||!old||old.courseId!==state.primary||old.level!==state.level||!Array.isArray(old.days)){
    state.studyPlan=makeWeeklyPlan({courseId:state.primary,level:state.level,completed:state.completed,mistakes:state.mistakes,startDate:localDay()});
    save();
  }
  showStudyPlan=true;
}
function studyPlanView(){
  const plan=state.studyPlan;
  if(!showStudyPlan||!plan||!Array.isArray(plan.days))return '';
  const course=getCourse(plan.courseId);
  const completed=plan.days.filter(day=>day.kind==='lesson'?!!state.completed[day.lessonId]:!!(plan.reviewDone||{})[day.date]).length;
  const cards=plan.days.map((day,i)=>{
    const lesson=getLesson(day.lessonId);
    const isReview=day.kind==='review';
    const isDone=isReview?!!(plan.reviewDone||{})[day.date]:!!state.completed[day.lessonId];
    const label=new Intl.DateTimeFormat('ru-RU',{weekday:'short',day:'numeric',month:'short'}).format(new Date(day.date+'T12:00:00'));
    const title=isReview?'Повторение и практика':(lesson?lesson.title:'Повторение');
    const detail=isReview?day.detail:(lesson?lesson.example:'Закрепи знакомые фразы');
    const action=isReview?
      '<button class="btn tiny outline" data-action="review">Карточки ↗</button><button class="btn tiny ghost" data-action="plan-review-done" data-date="'+escapeHTML(day.date)+'">'+(isDone?'Отменить отметку':'Готово ✓')+'</button>':
      '<button class="btn tiny '+(isDone?'outline':'')+'" data-action="lesson" data-id="'+escapeHTML(day.lessonId)+'">'+(isDone?'Повторить урок ↗':'Начать урок →')+'</button>';
    return '<article class="plan-day '+(isDone?'is-done':'')+'"><div class="plan-day-top"><span class="plan-day-number">'+(i+1)+'</span><span class="plan-date">'+escapeHTML(label)+'</span><span class="plan-status">'+(isDone?'✓ Пройдено':(isReview?'↺ Повторение':'○ Впереди'))+'</span></div><h4>'+escapeHTML(title)+'</h4><p>'+escapeHTML(detail)+'</p><div class="plan-day-actions">'+action+'</div></article>';
  }).join('');
  return '<section class="weekly-plan" aria-label="План обучения на неделю"><div class="plan-title"><div><div class="overline">ТВОЯ НЕДЕЛЯ · 10 МИНУТ В ДЕНЬ</div><h3>Учебный план на 7 дней</h3><p>'+escapeHTML(course?.ru||'Английский')+' · '+escapeHTML(plan.level)+' · '+completed+' из 7 выполнено</p></div><button class="btn tiny ghost" data-action="plan-close">Свернуть ✕</button></div><div class="plan-progress"><span style="width:'+Math.round(completed/7*100)+'%"></span></div><div class="plan-days">'+cards+'</div><div class="plan-actions"><button class="btn outline small" data-action="plan-refresh">↻ Обновить план</button><button class="btn small" data-action="plan-ai">✦ Советы наставника</button></div><p class="note">План основан на реальных уроках и твоём прогрессе. Он доступен без интернета. ИИ может подсказать, как эффективнее заниматься.</p></section>';
}
function mentorView(){
 const messages=state.mentorHistory.slice(-20);
 const course=getCourse(state.primary);
 const buttons=[
  ['plan','Мой план'],
  ['mistakes','Разобрать ошибки'],
  ['challenge','Дай практику'],
  ['motivate','Что учить дальше?']
 ];
 return `<div class="quiet-page mentor-page">
 <header class="quiet-page-head"><h1>ИИ-наставник</h1><p>Спроси что-нибудь об английском. Я помогу разобраться.</p></header>
 <section class="mentor-surface">
  <div class="mentor-shortcuts" aria-label="Быстрые подсказки">${buttons.map(([id,label])=>`<button type="button" class="mentor-prompt" data-action="mentor-quick" data-type="${id}">${label}</button>`).join('')}</div>
  <div class="chat-box mentor-conversation ${messages.length?'has-messages':'is-empty'}" id="mentorChat" role="log" aria-label="Сообщения наставника" aria-live="polite">
  ${messages.length?messages.map(m=>`<div class="chat-bubble ${m.role==='user'?'mine':'ai-rich'}">${m.role==='user'?escapeHTML(m.text):renderAssistantText(m.text)}</div>`).join(''):
   `<div class="mentor-welcome"><span class="mentor-welcome-mark">e</span><h2>С чего начнём?</h2><p>Напиши вопрос или выбери подсказку выше.</p></div>`}
  </div>
  <div class="chat-form mentor-compose">
   <label class="sr-only" for="mentorInput">Сообщение ИИ-наставнику</label>
   <textarea class="chat-input" id="mentorInput" rows="1" maxlength="1500" placeholder="Например, объясни Present Simple"></textarea>
   <button class="btn mentor-send" data-action="mentor-send" aria-label="Отправить сообщение" ${aiBusy?'disabled':''}>Отправить →</button>
  </div>
  <div class="mentor-meta">
   <span>ИИ иногда ошибается. Не отправляй личные данные.</span>
   <details class="mentor-context"><summary>Мой учебный контекст</summary>
    <p>Цель: ${escapeHTML(course?.ru||'Английский')} · Уровень ${escapeHTML(state.level)} · Пройдено уроков: ${Object.keys(state.completed).length}</p>
    <p>Ошибки в тестах: ${new Set(state.mistakes.map(m=>m.title)).size} темы · ИИ на устройстве: ${todayUsage()}/8</p>
   </details>
  </div>
 </section>
 ${studyPlanView()}
 </div>`;
}
function profileView(){const goal=getCourse(state.primary);return `${pageHeading('Мой профиль','Настрой свой учебный маршрут и приложение под себя.','НАСТРОЙКИ')}<div class="profile-help"><span>Впервые здесь или хочешь освежить навигацию?</span><button class="guide-launch" data-action="tour-start">Показать, как всё работает →</button></div><div class="profile-grid"><div class="card"><h2 class="h2">Обучение</h2><div class="field"><label for="profileName">Как тебя называть (необязательно)</label><input id="profileName" maxlength="32" value="${escapeHTML(state.firstName)}" placeholder="Например, Саша"></div><div class="field"><label for="profileLevel">Твой уровень</label><select id="profileLevel">${['A1','A2','B1','B2'].map(level=>`<option ${state.level===level?'selected':''}>${level}</option>`).join('')}</select></div><div class="field"><label for="profileGoal">Главный курс</label><select id="profileGoal">${COURSES.map(c=>`<option value="${c.id}" ${state.primary===c.id?'selected':''}>${escapeHTML(c.ru)} (${c.level})</option>`).join('')}</select></div><div class="toggle-row"><div><strong>Показывать кнопки Groq в уроке</strong><p class="note" style="margin:5px 0 0">Ненавязчивые объяснения после ошибок и в начале уроков</p></div><input type="checkbox" id="profileAuto" ${state.autoCoach?'checked':''}></div><div class="field"><label for="profilePace">Удобный ритм</label><select id="profilePace"><option value="gentle" ${state.pace==='gentle'?'selected':''}>В своём темпе</option><option value="regular" ${state.pace==='regular'?'selected':''}>Несколько раз в неделю</option><option value="daily" ${state.pace==='daily'?'selected':''}>Каждый день</option></select></div><button class="btn" data-action="save-profile" style="margin-top:24px">Сохранить изменения</button><div style="margin-top:25px" class="row" ><button class="text-link" data-action="export">⇩ Экспорт прогресса</button><button class="text-link" data-action="import">⇧ Импорт JSON</button><input id="importFile" type="file" accept="application/json,.json" style="display:none"></div><button class="text-link" data-action="reset" style="color:#c54f58;margin-top:18px">Очистить локальный прогресс</button></div><aside class="card"><h2 class="h2">Текущий маршрут</h2><span class="profile-glyph">${glyph(goal?.id||"everyday")}</span><h3 class="h3">${escapeHTML(goal?.title||'Everyday English')}</h3><p class="note">${escapeHTML(goal?.desc||'')}</p><div class="free-profile-note" style="margin-top:25px"><strong>Все курсы бесплатны.</strong><p>Поддержка Easay полностью добровольная. 50% донатов мы направляем на питание и развитие детей SkyKids.</p><a href="https://send.monobank.ua/jar/9ECZLkLXkq" target="_blank" rel="noopener noreferrer">Поддержать проект ↗</a></div></aside></div>`}
function render(restoreSearch=false){navRender();$('#breadcrumb').textContent=({home:'Моё обучение',catalog:'Каталог курсов',course:'Программа курса',lesson:'Урок',review:'Повторение',practice:'Разговорная практика',mentor:'ИИ-наставник',profile:'Мой профиль'})[page]||'Easay';let body=page==='home'?home():page==='catalog'?catalog():page==='course'?courseView():page==='lesson'?lessonView():page==='review'?reviewView():page==='practice'?practiceView():page==='mentor'?mentorView():profileView();const active=document.activeElement?.id;const selection=(active==='courseSearch'&&restoreSearch)?$('#courseSearch')?.selectionStart:null;$('#content').innerHTML=body;if(restoreSearch&&active==='courseSearch'){const el=$('#courseSearch');el?.focus();el?.setSelectionRange(selection||0,selection||0)}if(page==='mentor')scrollChat('#mentorChat');if(page==='lesson')syncTeacher();if(page==='practice')scrollChat('#practiceChat');tour?.refreshAfterRender();}
function go(to,id){quizFeedback?.close();if(to==='course'){courseId=id||courseId;if(!getCourse(courseId))courseId=COURSES[0].id;}if(to==='lesson'){lessonId=id||lessonId;if(!getLesson(lessonId))lessonId=ALL_LESSONS[0].id;step=0;answers={};quizChecked=false;quizScore=0;lessonDeckIndex=0;lessonDeckRevealed=false;lessonCoach='';lessonCoachId=lessonId;}if(to!=='lesson'){activeTeacherKey='';stopTeacher();}page=to;render();window.scrollTo({top:0,behavior:'instant'});/* Offline teacher introduces the lesson. Remote Groq help remains optional. */}
function stopTeacher(){
 if(teacherTypingTimer){clearInterval(teacherTypingTimer);teacherTypingTimer=null;}
}
function typeTeacher(target,message){
 if(!target)return;
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){target.textContent=message;return;}
 let position=0;target.textContent='';
 const chunk=Math.max(1,Math.ceil(message.length/105));
 teacherTypingTimer=setInterval(()=>{
  position=Math.min(message.length,position+chunk);
  if(!target.isConnected){clearInterval(teacherTypingTimer);teacherTypingTimer=null;return;}
  target.textContent=message.slice(0,position);
  if(position>=message.length){clearInterval(teacherTypingTimer);teacherTypingTimer=null;}
 },27);
}
function syncTeacher(force=false){
 if(page!=='lesson')return;
 const lesson=getLesson(lessonId);if(!lesson)return;
 const key=lesson.id+':'+step+':'+(step===4&&quizChecked?'score'+quizScore:'new');
 const message=teacherFor(lesson.id,step,step===4&&quizChecked?quizScore:null);
 const target=$('#scriptedTeacherText');if(!target)return;
 if(!force&&key===activeTeacherKey){target.textContent=message;return;}
 activeTeacherKey=key;stopTeacher();typeTeacher(target,message);
}
function speak(text){if(!('speechSynthesis' in window)){toast('Озвучивание недоступно в этом браузере.');return}window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-US';utterance.rate=.84;window.speechSynthesis.speak(utterance)}
function saveWord(lessonId,index){const lesson=getLesson(lessonId);if(!lesson||!lesson.words[index])return;const key=createWordKey(lesson,index);if(state.savedWords[key]){delete state.savedWords[key];delete state.reviews[key];toast('Фраза удалена из словаря.')}else{const [en,ru]=lesson.words[index];state.savedWords[key]={en,ru,lessonId};state.reviews[key]={level:0,due:localDay()};toast('Фраза добавлена в словарь.')}save();render()}
function completeLesson(l,score){const date=localDay();const old=state.completed[l.id];if(!old||score>old.score)state.completed[l.id]={score,date};for(let i=0;i<l.words.length;i++){const key=createWordKey(l,i);if(!state.savedWords[key])state.savedWords[key]={en:l.words[i][0],ru:l.words[i][1],lessonId:l.id};if(!state.reviews[key])state.reviews[key]={level:0,due:addDays(date,1)}}save()}
function checkQuiz(){const l=getLesson(lessonId);if(!l||quizChecked||Object.keys(answers).length<3)return;const qs=quizQuestions(l);quizScore=qs.filter((q,i)=>answers[i]===q.answer).length;quizChecked=true;if(quizScore>=2){completeLesson(l,quizScore);lessonCoach='Отлично! Ты закончил урок. Продолжай в своём темпе — следующий шаг уже доступен.';toast('Урок завершён! +'+quizScore+' правильных ответа.');}else{state.mistakes.push({id:l.id,title:l.title,wrong:qs.filter((q,i)=>answers[i]!==q.answer).map(q=>({question:q.q,expected:q.answer})).slice(0,3),date:localDay()});state.mistakes=state.mistakes.slice(-30);save();lessonCoach='Некоторые ответы не совпали. Посмотри выделенные правильные варианты и повтори тест.';}render();quizFeedback?.open({lesson:l,course:getCourse(l.courseId)?.title||'',questions:qs,answers:{...answers},score:quizScore});}
const online=()=>navigator.onLine!==false;
async function callAI(mode,message,context={}){if(!online())throw new Error('Сейчас нет интернета. Встроенные уроки продолжают работать офлайн.');if(todayUsage()>=8)throw new Error('Сегодня достигнут локальный лимит 8 ИИ-запросов. Уроки и тесты доступны без ограничений.');const payload={mode,level:state.level,message:String(message).slice(0,1300),context:{course:context.course||getCourse(state.primary)?.title||'',lesson:context.lesson||'',tip:context.tip||'',goal:getCourse(state.primary)?.ru||'',mistakes:state.mistakes.slice(-3).map(m=>m.title),history:(context.history||[]).slice(-8).map(m=>({role:m.role,text:String(m.text).slice(0,400)}))}};const controller=new AbortController();const t=setTimeout(()=>controller.abort(),22000);try{const response=await fetch('/api/ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});let data;try{data=await response.json()}catch{throw new Error('Не удалось прочитать ответ сервера.')}if(!response.ok)throw new Error(data.error||`Ошибка подключения (${response.status})`);if(!data.reply)throw new Error('ИИ вернул пустой ответ.');state.aiUsage.count++;save();navRender();return String(data.reply).slice(0,3500);}catch(e){if(e.name==='AbortError')throw new Error('ИИ отвечает слишком долго. Попробуй позже.');throw e;}finally{clearTimeout(t)}}
async function autoExplain(mode,message){if(coachBusy||page!=='lesson')return;const l=getLesson(lessonId);if(!l)return;coachBusy=true;const activeId=lessonId;const target=$('#lessonCoachContent');if(target)target.textContent='✦ Готовлю короткое объяснение…';try{const reply=await callAI(mode,message,{course:getCourse(l.courseId)?.title,lesson:l.title,tip:l.tip});if(activeId===lessonId&&page==='lesson'){lessonCoach=reply;const node=$('#lessonCoachContent');if(node)node.innerHTML=renderAssistantText(reply);}}catch(e){if(activeId===lessonId&&page==='lesson'){lessonCoach=`${l.tip}\n\n(ИИ сейчас недоступен: ${e.message})`;const node=$('#lessonCoachContent');if(node)node.textContent=lessonCoach;}}finally{coachBusy=false}}
const autoVisited=new Set();
function autocoachIntro(){const l=getLesson(lessonId);if(!l)return;const key=l.id+':'+localDay();if(autoVisited.has(key)||todayUsage()>=8)return;autoVisited.add(key);autoExplain('welcome',`Ученик открыл урок «${l.title}». Кратко приветствуй, объясни цель и дай один совет. Пример: ${l.example}.`)}
async function mentorSend(message=null,mode='chat'){if(aiBusy)return;const input=$('#mentorInput');const text=(message??input?.value??'').trim();if(!text)return;if(input)input.value='';state.mentorHistory.push({role:'user',text});state.mentorHistory=state.mentorHistory.slice(-24);save();aiBusy=true;render();const target=$('#mentorChat');const loading=document.createElement('div');loading.className='chat-bubble loading-pulse';loading.textContent='✦ Думаю над ответом…';target?.append(loading);scrollChat('#mentorChat');try{const reply=await callAI(mode,text,{history:state.mentorHistory});state.mentorHistory.push({role:'ai',text:reply});save();}catch(e){state.mentorHistory.push({role:'ai',text:'Не удалось получить ответ ИИ: '+e.message});save();}finally{aiBusy=false;if(page==='mentor')render()}}
function scrollChat(selector){const el=$(selector);if(el)el.scrollTop=el.scrollHeight}
async function practiceStart(){practiceMessages=[];chatBusy=true;render();try{const c=getCourse(chatContext)||getCourse(state.primary);const reply=await callAI('roleplay','Начни учебную ролевую беседу одной короткой фразой по-английски и задай вопрос. Ученик ответит. Не раскрывай все ответы сразу.',{course:c?.title,lesson:`Сценарий: ${c?.ru||'Обычный разговор'}`,history:[]});practiceMessages.push({role:'ai',text:reply});}catch(e){practiceMessages.push({role:'ai',text:`ИИ сейчас недоступен: ${e.message} Можно потренировать встроенные диалоги в уроках.`});}finally{chatBusy=false;if(page==='practice')render()}}
async function practiceSend(){if(chatBusy)return;const input=$('#practiceInput');const value=input?.value.trim();if(!value)return;practiceMessages.push({role:'user',text:value});chatBusy=true;render();const c=getCourse(chatContext)||getCourse(state.primary);try{const reply=await callAI('roleplay',value,{course:c?.title,lesson:c?.ru,history:practiceMessages});practiceMessages.push({role:'ai',text:reply});}catch(e){practiceMessages.push({role:'ai',text:'ИИ временно недоступен: '+e.message});}finally{chatBusy=false;if(page==='practice')render()}}
function speechInput(){const Rec=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Rec){toast('Этот браузер не поддерживает голосовой ввод. Можно писать текстом.');return;}const recognition=new Rec();recognition.lang='en-US';recognition.interimResults=false;recognition.maxAlternatives=1;recognition.onresult=e=>{const input=$('#practiceInput');if(input){input.value=e.results[0][0].transcript;input.focus()}};recognition.onerror=()=>toast('Не удалось распознать речь. Попробуй снова или используй текст.');recognition.onend=()=>{};recognition.start();toast('Слушаю английскую речь…')}
function reviewAdvance(good){const item=reviewList[flashIndex];if(!item)return;const prev=state.reviews[item.key]||{level:0,due:localDay()};const newLevel=good?Math.min(5,prev.level+1):0;const schedule=[1,1,3,7,14,30];state.reviews[item.key]={level:newLevel,due:addDays(localDay(),schedule[newLevel])};save();reviewList.splice(flashIndex,1);if(flashIndex>=reviewList.length)flashIndex=0;flashRevealed=false;render();}
function loadOnboarding(){
 let known=state.firstName||'';
 if(!known)try{known=localStorage.getItem('easay:intro-name:v1')||''}catch{}
 let pace='';try{pace=localStorage.getItem('easay:motivation:v1')||''}catch{}
 if(['gentle','regular','daily'].includes(pace)&&!state.paceFromOnboarding)state.pace=pace;
 const goals=[['everyday','Для общения'],['basics','С самого начала'],['work','Для работы'],['business','Для бизнеса'],['travel','Для путешествий'],['interview','Для собеседования'],['tech','Для IT'],['study','Для учёбы']];
 const html=`<div class="modal-backdrop" id="welcomeModal"><div class="modal onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboardTitle"><div class="overline">ПЕРСОНАЛЬНЫЙ МАРШРУТ · 1/1</div><h2 id="onboardTitle">${known?'Отличное начало, '+escapeHTML(known)+'!':'С чего начнём?'}</h2><p class="page-sub">Выбери цель, уровень и удобный темп. Остальное сделаем мы. Настройки можно изменить позже.</p>${known?'':`<div class="field"><label for="onboardName">Как тебя называть (необязательно)</label><input id="onboardName" maxlength="32" placeholder="Имя"></div>`}<span class="onboard-label">Зачем тебе английский?</span><div class="onboard-options" id="onboardChoices">${goals.map(([id,title])=>`<button type="button" class="goal-select ${state.primary===id?'active':''}" data-action="onboard-goal" data-id="${id}"><span class="goal-svg">${glyph(id)}</span><strong>${title}</strong><small>${getCourse(id)?.level}</small></button>`).join('')}</div><div class="onboard-fields"><div class="field"><label for="onboardLevel">Уровень</label><select id="onboardLevel">${['A1','A2','B1','B2'].map(level=>`<option ${state.level===level?'selected':''}>${level}</option>`).join('')}</select><small>Если сомневаешься — начни с A1.</small></div><div class="field"><label for="onboardPace">Ритм</label><select id="onboardPace"><option value="gentle" ${state.pace==='gentle'?'selected':''}>В своём темпе</option><option value="regular" ${state.pace==='regular'?'selected':''}>Несколько раз в неделю</option><option value="daily" ${state.pace==='daily'?'selected':''}>Каждый день</option></select></div></div><div class="modal-actions"><span class="note">Без регистрации и оплаты</span><button class="btn" data-action="onboard-finish">Открыть мои уроки →</button></div></div></div>`;
 $('#modalRoot').innerHTML=html;
}
function completeOnboarding(){
 let introName='';try{introName=localStorage.getItem('easay:intro-name:v1')||''}catch{}
 state.firstName=($('#onboardName')?.value||state.firstName||introName).trim().slice(0,32);
 state.level=$('#onboardLevel')?.value||'A1';
 state.pace=$('#onboardPace')?.value||state.pace||'regular';
 state.paceFromOnboarding=true;state.onboarded=true;save();
 $('#modalRoot').innerHTML='';const deepLesson=new URLSearchParams(location.search).get('lesson');if(getLesson(deepLesson)){go('lesson',deepLesson);if(new URLSearchParams(location.search).get('pair')==='1'){step=2;render();}}else go('home');toast('Маршрут готов. Начинай в своём темпе!');
 if(!deepLesson&&tour?.shouldAutoStart())requestAnimationFrame(()=>tour.start());
}
function offerReturnReview(){
 if(!state.onboarded||Object.keys(state.completed).length===0)return false;
 try{
  if(sessionStorage.getItem('easay:return-review:v1')==='shown')return false;
  sessionStorage.setItem('easay:return-review:v1','shown');
 }catch{}
 const name=state.firstName?'С возвращением, '+state.firstName+'!':'С возвращением в Easay!';
 const completed=Object.keys(state.completed).length;
 $('#modalRoot').innerHTML=`<div class="modal-backdrop return-backdrop" id="returnReviewDialog">
 <section class="modal return-modal" role="dialog" aria-modal="true" aria-labelledby="returnTitle" aria-describedby="returnDescription">
  <div class="return-eyebrow">EASAY · ТВОЙ ПРОГРЕСС СОХРАНЁН</div>
  <h2 id="returnTitle">${escapeHTML(name)}</h2>
  <p id="returnDescription">У тебя уже ${completed} ${completed===1?'пройденный урок':'пройденных уроков'}. Короткое повторение поможет вспомнить знакомые фразы перед новыми темами.</p>
  <div class="return-actions"><button type="button" class="btn ghost" data-action="return-skip">Пропустить</button>
  <button type="button" class="btn" data-action="return-review">В раздел «Повторение» →</button></div>
 </section></div>`;
 $('#returnReviewDialog [data-action="return-review"]')?.focus({preventScroll:true});
 return true;
}
function downloadJSON(){const data=JSON.stringify(state,null,2);const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='easay-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),700)}
async function importJSON(file){if(!file)return;if(file.size>1000000)return toast('Файл больше 1 МБ.');try{const data=JSON.parse(await file.text());if(data.version!==3||typeof data.completed!=='object'||!data.completed||!Array.isArray(data.mistakes)||typeof data.savedWords!=='object')throw Error('Неподходящий формат');if(!confirm('Заменить текущий прогресс данными из файла?'))return;state={...structuredClone(initial),...data,firstName:String(data.firstName||'').slice(0,32),primary:getCourse(data.primary)?data.primary:'everyday',mentorHistory:[],completed:Object.fromEntries(Object.entries(data.completed).filter(([key])=>getLesson(key))),savedWords:Object.fromEntries(Object.entries(data.savedWords||{}).filter(([key])=>/^(?:[a-z]+)-\d+:\d$/.test(key)))};save();go('home');toast('Прогресс импортирован.')}catch(e){toast('Файл не подходит для импорта: '+e.message)}}

// All navigation and lesson controls are event-delegated, avoiding orphaned event handlers.
document.addEventListener('click',async event=>{
const el=event.target.closest('[data-action]');if(!el)return;const action=el.dataset.action;
if(action==='tour-start'){tour?.start();return;}
if(action==='return-skip'){$('#modalRoot').innerHTML='';return;}
if(action==='return-review'){$('#modalRoot').innerHTML='';reviewList=[];reviewInitialized=false;flashIndex=0;flashRevealed=false;go('review');return;}
if(['home','catalog','review','practice','mentor','profile'].includes(action)){if(action==='review'){reviewList=[];reviewInitialized=false;flashIndex=0;flashRevealed=false}go(action);return;}
if(action==='course'){go('course',el.dataset.id);return;}
if(action==='lesson'){go('lesson',el.dataset.id);return;}
if(action==='filter'){filter=el.dataset.value;render();return;}
if(action==='step-next'){step=Math.min(3,step+1);if(step===3){lessonDeckIndex=0;lessonDeckRevealed=false;}lessonCoach='';render();return;}
if(action==='lesson-card-flip'){if(step!==3)return;lessonDeckRevealed=!lessonDeckRevealed;render();return;}
if(action==='lesson-card-next'){if(step!==3||!lessonDeckRevealed)return;const cards=deckForLesson(getLesson(lessonId));if(lessonDeckIndex<cards.length-1){lessonDeckIndex++;lessonDeckRevealed=false;}else step=4;render();return;}
if(action==='step-prev'){step=Math.max(0,step-1);lessonCoach='';render();return;}
if(action==='speak'){speak(el.dataset.text);return;}
if(action==='open-plan'){go('mentor');ensureStudyPlan();render();return;}
if(action==='saveword'){saveWord(el.dataset.id,Number(el.dataset.index));return;}
if(action==='answer'){if(quizChecked)return;answers[Number(el.dataset.q)]=el.dataset.value;render();return;}
if(action==='check'){checkQuiz();return;}
if(action==='retry'){quizFeedback?.close();answers={};quizChecked=false;quizScore=0;lessonCoach='';render();return;}
if(action==='hide-invite'){state.inviteHidden=true;save();render();return;}
if(action==='invite-friend'){
 const l=getLesson(el.dataset.id);if(!l)return;
 const url=new URL('/app.html',location.origin);url.searchParams.set('lesson',l.id);url.searchParams.set('pair','1');
 const title='Практикуем английский вместе в Easay';
 try{
  if(navigator.share)await navigator.share({title,text:'Давай вместе потренируем диалог на английском!',url:url.href});
  else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url.href);toast('Ссылка на урок скопирована. Отправь её другу.');}
  else prompt('Скопируй ссылку и отправь другу:',url.href);
 }catch(e){if(e.name!=='AbortError')prompt('Отправь другу эту ссылку:',url.href);}
 return;
}
if(action==='pair-practice'){pairLessonId=el.dataset.id;step=2;render();return;}
if(action==='nextlesson'){pairLessonId=null;const l=getLesson(lessonId);const c=getCourse(l?.courseId);const next=c.lessons[l.number];if(next)go('lesson',next.id);else{go('course',c.id);toast('Курс завершён! Перед экзаменом повтори фразы курса.');}return;}
if(['coach-explain','coach-example','coach-challenge'].includes(action)){const l=getLesson(lessonId);if(!l)return;const mode=action==='coach-challenge'?'practice':'explain';const prefix=action==='coach-explain'?'Объясни другими простыми словами и приведи пример':action==='coach-example'?'Приведи два новых примера с переводом':'Дай один короткий вопрос для практики, ответ пока не показывай';autoExplain(mode,`${prefix}. Тема: ${l.title}. Пример: ${l.example}`);return;}
if(action==='roleplay'){chatContext=getLesson(el.dataset.id)?.courseId||state.primary;practiceMessages=[];go('practice');await practiceStart();return;}
if(action==='flip'){flashRevealed=!flashRevealed;render();return;}
if(action==='remember'){reviewAdvance(el.dataset.value==='good');return;}
if(action==='review-refresh'){reviewInitialized=true;reviewList=Object.entries(state.savedWords).map(([key,value])=>({key,...value}));flashIndex=0;flashRevealed=false;render();return;}
if(action==='scenario'){chatContext=el.dataset.id;practiceMessages=[];render();return;}
if(action==='practice-start'){practiceStart();return;}
if(action==='practice-send'){practiceSend();return;}
if(action==='practice-clear'){practiceMessages=[];render();return;}
if(action==='mic'){speechInput();return;}
if(action==='speak-last'){const last=[...practiceMessages].reverse().find(m=>m.role==='ai');if(last)speak(last.text);else toast('Сначала начни разговор.');return;}
if(action==='mentor-send'){mentorSend();return;}
if(action==='mentor-quick'&&el.dataset.type==='plan'){ensureStudyPlan();render();return;}
if(action==='plan-close'){showStudyPlan=false;render();return;}
if(action==='plan-refresh'){ensureStudyPlan(true);render();toast('Маршрут обновлён по твоему текущему прогрессу.');return;}
if(action==='plan-review-done'){const plan=state.studyPlan;if(plan){plan.reviewDone=plan.reviewDone||{};plan.reviewDone[el.dataset.date]=!plan.reviewDone[el.dataset.date];save();render();}return;}
if(action==='plan-ai'){const p=state.studyPlan;if(!p)return;const lessons=p.days.map((d,i)=>{const l=getLesson(d.lessonId);return (i+1)+': '+(d.kind==='review'?'Повторение':(l?.title||'Практика'))}).join('; ');mentorSend('Вот мой план: '+lessons+'. Уровень '+state.level+'. Кратко посоветуй, как заниматься по нему. Без таблиц и выдуманных достижений.','plan');return;}
if(action==='mentor-quick'){const prompts={plan:'Составь мой учебный план на неделю исходя из моих целей и изученных уроков.',mistakes:'Помоги мне разобрать последние ошибки и дай упражнение без готового ответа.',challenge:'Дай одно небольшое задание по английскому моего уровня и проверь мой следующий ответ.',motivate:'Какая следующая тема сейчас принесёт больше пользы моей цели?'};mentorSend(prompts[el.dataset.type]||'Подскажи следующий шаг','plan');return;}
if(action==='save-profile'){state.studyPlan=null;showStudyPlan=false;state.firstName=$('#profileName')?.value.trim().slice(0,32)||'';state.level=$('#profileLevel')?.value||'A1';state.primary=$('#profileGoal')?.value||'everyday';state.autoCoach=!!$('#profileAuto')?.checked;state.pace=$('#profilePace')?.value||'regular';save();render();toast('Настройки сохранены.');return;}
if(action==='export'){downloadJSON();return;}
if(action==='import'){$('#importFile')?.click();return;}
if(action==='reset'){if(confirm('Удалить весь локальный прогресс Easay? Вернуть его можно только из ранее сохранённого файла.')){state=structuredClone(initial);save();go('home');loadOnboarding();}return;}
if(action==='onboard-goal'){state.primary=el.dataset.id;$$('.goal-select').forEach(b=>b.classList.toggle('active',b.dataset.id===state.primary));return;}
if(action==='onboard-finish'){completeOnboarding();return;}
});
document.addEventListener('input',event=>{if(event.target.id==='courseSearch'){query=event.target.value;const html=filteredCourses().map(courseCard).join('')||'<div class="empty"><p>Ничего не нашлось.</p></div>';$('#courseGrid').innerHTML=html;}});
document.addEventListener('change',event=>{if(event.target.id==='importFile')importJSON(event.target.files?.[0]);});
document.addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.target.id==='mentorInput'||event.target.id==='practiceInput')&&!event.shiftKey){event.preventDefault();if(event.target.id==='mentorInput')mentorSend();else practiceSend();}if(event.key==='Enter'&&event.target.classList.contains('flash-card')){flashRevealed=!flashRevealed;render();}});
quizFeedback=createQuizFeedback({
 callAI:(mode,message,context)=>callAI(mode,message,context),
 onRetry:()=>{answers={};quizChecked=false;quizScore=0;lessonCoach='';step=4;render();},
 onContinue:passed=>{
  if(!passed){toast('Урок пока не зачтён. Можешь пересдать тест позже.');return;}
  const lesson=getLesson(lessonId),course=getCourse(lesson?.courseId);
  if(!lesson||!course)return;
  const next=course.lessons[lesson.number];
  if(next)go('lesson',next.id);
  else{go('course',course.id);toast('Курс завершён! Перед экзаменом повтори фразы курса.');}
 }
});
tour=createTour({
 getPage:()=>page,
 navigate:target=>{
  if(target==='course')go('course',state.primary);
  else if(target==='lesson')go('lesson',nextUnfinished(state.primary)?.id);
  else go(target);
 }
});
render();
const deepParams=new URLSearchParams(location.search);
const deepLesson=deepParams.get('lesson');
if(getLesson(deepLesson)){
 if(deepParams.get('pair')==='1')pairLessonId=deepLesson;
 if(state.onboarded){go('lesson',deepLesson);if(deepParams.get('pair')==='1'){step=2;render();}}
 else loadOnboarding();
}else if(!state.onboarded)loadOnboarding();
if(!deepLesson&&state.onboarded){if(!offerReturnReview()&&tour.shouldAutoStart())requestAnimationFrame(()=>tour.start());}
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('/sw.js').catch(()=>{});
