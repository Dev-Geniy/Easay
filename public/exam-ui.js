import {getCourse} from './courses.js';
import {getOrCreateLearnerId} from './learner-identity.js';
import {deckForCourse} from './flashcards.js';
import {buildExam,gradeExam,EXAM_QUESTIONS,PASS_SCORE} from './exam.js';
const $=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const courseId=new URLSearchParams(location.search).get('course')||'';
const course=getCourse(courseId);
const exam={mode:'loading',questions:[],attemptId:null,answers:{},index:0,result:null,busy:false,blocked:null};
const review={cards:deckForCourse(course),index:0,flipped:false};
$('back').href='/app.html';
if(!course){$('exam').innerHTML='<p>Курс не найден. <a href="/app.html">Вернуться к урокам</a></p>';}
else{
 $('title').textContent=course.title;
 start();
}
function start(){
 review.index=0;review.flipped=false;renderPreExam();
}
function renderPreExam(){
 const item=review.cards[review.index];
 if(!item)return startExam();
 const last=review.index===review.cards.length-1;
 $('exam').innerHTML='<div class="fade pre-exam"><div class="exam-top"><span class="badge">ПОВТОРЕНИЕ ПЕРЕД ЭКЗАМЕНОМ</span><span class="badge gray">'+(review.index+1)+' / '+review.cards.length+'</span></div><div class="bar"><span style="width:'+Math.round((review.index+1)*100/review.cards.length)+'%"></span></div><h2 class="pre-exam-title">Вспомни перевод</h2><p class="subtle">Переверни карточку и проверь себя. Это тренировка, она не влияет на баллы.</p><p class="subtle">На этом браузере доступна одна серверная попытка в 24 часа. После старта она действительна 45 минут.</p><button class="pre-exam-card" type="button" id="examFlip" aria-label="'+(review.flipped?'Показать английский':'Открыть перевод')+'"><span>'+(review.flipped?'ПЕРЕВОД':'АНГЛИЙСКАЯ ФРАЗА')+'</span><strong>'+escape(review.flipped?item.ru:item.en)+'</strong><small>'+(review.flipped?'Нажми, чтобы увидеть английский':'Как это переводится? Нажми, чтобы проверить')+'</small></button><div class="buttons pre-exam-actions"><button class="btn secondary" id="examSkip">Начать экзамен</button><button class="btn" id="examNext" '+(review.flipped?'':'disabled')+'>'+(last?'К экзамену →':'Следующая →')+'</button></div></div>';
 $('examFlip').addEventListener('click',()=>{review.flipped=!review.flipped;renderPreExam()});
 $('examNext').addEventListener('click',()=>{if(!review.flipped)return;if(last)startExam();else{review.index++;review.flipped=false;renderPreExam()}});
 $('examSkip').addEventListener('click',startExam);
}
async function startExam(practiceOnly=false){
 exam.mode='loading';exam.questions=[];exam.answers={};exam.index=0;exam.result=null;exam.busy=false;exam.blocked=null;
 $('exam').innerHTML='<div class="loading">Готовим '+EXAM_QUESTIONS+' вопросов по материалу курса…</div>';
 if(practiceOnly){const local=buildExam(courseId,(Date.now()>>>0)^4556);exam.mode='practice';exam.questions=local.questions;render();return;}
 const learnerId=getOrCreateLearnerId();
 if(!learnerId){
  exam.blocked={code:'LEARNER_ID_REQUIRED'};
  renderIdentityUnavailable();
  return;
 }
 try{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),6500);
  let response;
  try{response=await fetch('/api/exam?course='+encodeURIComponent(courseId),{cache:'no-store',signal:controller.signal,headers:{'x-easay-learner-id':learnerId}})}finally{clearTimeout(timeout)}
  if(!response.ok){
   if(response.status===429||response.status===400){
    const data=await response.json();
    if(data.code==='EXAM_DAILY_LIMIT'){exam.blocked=data;renderLimit();return;}
    if(data.code==='LEARNER_ID_REQUIRED'){renderIdentityUnavailable();return;}
   }
   throw Error('Сервер пока не подключён');
  }
  const data=await response.json();
  if(data.mode!=='verified'||!Array.isArray(data.questions)||data.questions.length!==EXAM_QUESTIONS)throw Error('Серверный экзамен недоступен');
  exam.mode='verified';exam.questions=data.questions;exam.attemptId=data.attemptId;
 }catch{
  const local=buildExam(courseId,(Date.now()>>>0) ^ 4556);
  exam.mode='practice';exam.questions=local.questions;exam.attemptId=null;
 }
 render();
}
function renderIdentityUnavailable(){
 $('exam').innerHTML='<div class="fade"><span class="badge gray">СЕРВЕРНЫЙ ЭКЗАМЕН</span><h2 class="final-title">Не удалось сохранить данные браузера</h2><p class="subtle">Для отдельной попытки без регистрации Easay нужно сохранить анонимный идентификатор в браузере. Проверь, что сохранение данных сайта разрешено. Можно продолжить тренировку без сертификата.</p><div class="buttons"><a href="/app.html" class="btn secondary">← К урокам</a><button class="btn" id="practiceInstead">Тренироваться без сертификата →</button></div></div>';
 $('practiceInstead').addEventListener('click',()=>startExam(true));
}
function renderLimit(){
 const until=Number(exam.blocked?.nextAttemptAt);
 const date=Number.isFinite(until)&&until>Date.now()
  ?new Intl.DateTimeFormat('ru-RU',{dateStyle:'long',timeStyle:'short'}).format(new Date(until))
  :'через 24 часа после начала прошлой попытки';
 $('exam').innerHTML='<div class="fade"><span class="badge gray">СЕРВЕРНЫЙ ЭКЗАМЕН</span><h2 class="final-title">Попытка уже использована</h2><p class="subtle">Сертификат Easay можно получить после серверной проверки. Разрешена одна серверная попытка за 24 часа на этот браузер. Другие ученики в общей сети не используют твой лимит.</p><div class="notice warn"><strong>Следующая попытка: '+escape(date)+'</strong><p>Пока можно повторять слова и пройти тренировочный экзамен. Он не выдаёт сертификат.</p></div><div class="buttons"><a class="btn secondary" href="/app.html">← К урокам</a><button class="btn" id="practiceInstead">Тренироваться без сертификата →</button></div></div>';
 $('practiceInstead').addEventListener('click',()=>startExam(true));
}
function render(){
 const root=$('exam');
 if(exam.result){renderResult();return;}
 if(exam.index>=EXAM_QUESTIONS){renderFinish();return;}
 const q=exam.questions[exam.index],selected=exam.answers[q.id];
 root.innerHTML='<div class="fade"><div class="exam-top"><span class="badge">'+(exam.mode==='verified'?'Серверный экзамен':'Тренировочный режим')+'</span><span class="badge gray">Вопрос '+(exam.index+1)+' / '+EXAM_QUESTIONS+'</span></div><div class="bar"><span style="width:'+((exam.index+1)/EXAM_QUESTIONS*100)+'%"></span></div><div class="question">'+escape(q.prompt)+'</div><div class="options">'+q.options.map((choice,i)=>'<button type="button" class="choice '+(selected===choice?'selected':'')+'" data-exam-answer="'+i+'"><span class="choice-letter">'+String.fromCharCode(65+i)+'</span>'+escape(choice)+'</button>').join('')+'</div><div class="buttons"><button class="btn secondary" id="prev" '+(exam.index===0?'disabled':'')+'>← Назад</button><button class="btn" id="next" '+(selected===undefined?'disabled':'')+'>'+(exam.index===EXAM_QUESTIONS-1?'Завершить ответы →':'Далее →')+'</button></div></div>';
 root.querySelectorAll('[data-exam-answer]').forEach(btn=>btn.addEventListener('click',()=>{
  exam.answers[q.id]=q.options[Number(btn.dataset.examAnswer)];render();
 }));
 root.querySelector('#prev').addEventListener('click',()=>{exam.index=Math.max(0,exam.index-1);render()});
 root.querySelector('#next').addEventListener('click',()=>{if(exam.answers[q.id]===undefined)return;exam.index++;render()});
}
function renderFinish(){
 const v=exam.mode==='verified';
 $('exam').innerHTML='<div class="fade"><span class="badge">'+(v?'Подтверждение данных':'Тренировочный режим')+'</span><h2 class="final-title">Все '+EXAM_QUESTIONS+' ответов готовы</h2><p class="subtle">Теперь можно получить результат. Каждый верный ответ приносит 2,5 балла. Проходной уровень — 90/100.</p>'+(v?'<div class="field"><label for="recipient">Имя для сертификата Easay</label><input id="recipient" autocomplete="name" maxlength="75" placeholder="Как указать имя на сертификате" required></div><label class="check-line"><input id="publishName" type="checkbox"><span>Разрешаю показывать указанное имя на общедоступной странице проверки сертификата. Если не отмечать, имя будет видно только на моей локальной копии PDF.</span></label>':'<div class="notice warn">Сервер сертификатов ещё не подключён. Это тренировочный экзамен: результат доступен, но подтверждённый PDF и публичная проверка пока не выдаются.</div>')+'<div class="buttons"><button class="btn secondary" id="back">← К вопросам</button><button class="btn" id="submit">Показать результат →</button></div><p class="subtle" id="failure" role="alert"></p></div>';
 $('exam').querySelector('#back').addEventListener('click',()=>{exam.index=EXAM_QUESTIONS-1;render()});
 $('exam').querySelector('#submit').addEventListener('click',submit);
}
async function submit(){
 if(exam.busy)return;
 const verified=exam.mode==='verified';
 const name=verified?$('recipient').value.replace(/\s+/g,' ').trim():'';
 const publishName=verified?$('publishName').checked:false;
 if(verified&&name.length<2){$('failure').textContent='Укажи имя для сертификата (минимум два символа).';return}
 exam.busy=true;$('submit').disabled=true;
 if(!verified){exam.result={...gradeExam(exam.questions,exam.answers),verified:false};render();return}
 try{
  const response=await fetch('/api/exam',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({attemptId:exam.attemptId,answers:exam.answers,name,publishName})});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Не удалось проверить ответы');
  exam.result=data;
  if(data.certificateId)try{const old=JSON.parse(localStorage.getItem('easay:cert-names:v1')||'{}');old[data.certificateId]=name;localStorage.setItem('easay:cert-names:v1',JSON.stringify(old))}catch{}
  render();
 }catch(e){exam.busy=false;$('submit').disabled=false;$('failure').textContent=e.message+' — результаты и сертификат не подтверждены.'}
}
function renderResult(){
 const data=exam.result,passed=Boolean(data?.passed),verified=Boolean(data?.verified);
 const certificate=verified&&data.certificateId?'<a class="certificate-link" href="'+escape(data.certificateUrl)+'">Открыть сертификат и сохранить PDF ↗</a>':'';
 $('exam').innerHTML='<div class="fade"><span class="badge">'+(verified?'Проверено сервером Easay':'Тренировочный результат')+'</span><div class="big-score">'+Number(data.score)+'<span class="score-out"> / 100</span></div><h2 class="result-title">'+(passed?(verified?'Экзамен сдан. Поздравляем!':'Отличный тренировочный результат!'):'Есть что повторить — это нормально.')+'</h2><p class="subtle">Правильных ответов: '+Number(data.correct)+' из '+EXAM_QUESTIONS+'. Для подтверждённого сертификата нужен результат от '+PASS_SCORE+' баллов.</p>'+certificate+'<div class="notice '+(passed?'good':'warn')+'">'+(verified?(passed?'Сертификат выдан Easay на основании проверенных сервером ответов. Ссылка открывает страницу с публичной проверкой.':'Для следующей попытки повтори сложные фразы курса.'): 'Это не подтверждённый сертификат. Чтобы получить документ с проверкой по ссылке, потребуется подключить Cloudflare D1.')+'</div><div class="buttons"><a class="btn secondary" href="/app.html">← Вернуться в Easay</a><button class="btn" id="restart">Пройти ещё раз →</button></div></div>';
 $('restart').addEventListener('click',start);
}
