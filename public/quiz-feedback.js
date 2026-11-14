// Easay: accessible interactive correction dialog for ordinary 3-question lesson quizzes.
// The app grades the quiz deterministically. AI only explains; it never changes the score.
export function createQuizFeedback({callAI,onRetry,onContinue,onClose}){
 const root=document.getElementById('modalRoot');
 let session=null,typingTimer=null,previousFocus=null;
 const escapeHTML=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const reducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const get=(sel)=>root.querySelector(sel);
 const scroll=()=>{const log=get('#quizFeedbackLog');if(log)log.scrollTop=log.scrollHeight;};
 const stopTyping=()=>{if(typingTimer){clearInterval(typingTimer);typingTimer=null;}};
 const factsText=(s)=>s.items.map((item,i)=>(i+1)+'. '+item.question+'\nОтвет ученика: '+item.selected+'\nВерный ответ: '+item.correct+'\n'+(item.ok?'Верно.':'Ошибка.')).join('\n');
 const renderMessage=(role,value,animate=false)=>{
  if(!session)return;
  const log=get('#quizFeedbackLog');if(!log)return;
  const article=document.createElement('article');
  article.className='quiz-feedback-bubble '+(role==='user'?'from-learner':'from-mentor');
  const label=document.createElement('strong');label.className='quiz-feedback-author';label.textContent=role==='user'?'Ты':'Наставник';
  const message=document.createElement('div');message.className='quiz-feedback-text';article.append(label,message);log.append(article);
  const text=String(value||'');
  if(!animate||reducedMotion()||text.length<40){message.textContent=text;scroll();return;}
  let count=0;const size=Math.max(3,Math.ceil(text.length/100));stopTyping();
  const reveal=()=>{message.textContent=text;stopTyping();scroll();};
  const skip=document.createElement('button');skip.className='quiz-feedback-reveal';skip.type='button';skip.textContent='Показать весь текст';
  skip.addEventListener('click',()=>{reveal();skip.remove()});article.append(skip);
  typingTimer=setInterval(()=>{
   if(!message.isConnected||!session){stopTyping();return;}
   count=Math.min(text.length,count+size);message.textContent=text.slice(0,count);scroll();
   if(count===text.length){stopTyping();skip.remove();}
  },18);
 };
 const summaryHTML=s=>s.items.map((item,i)=>'<div class="quiz-feedback-fact '+(item.ok?'is-correct':'is-incorrect')+'"><span class="quiz-feedback-mark" aria-hidden="true">'+(item.ok?'✓':'!')+'</span><div><strong>Вопрос '+(i+1)+' · '+(item.ok?'Верно':'Нужно повторить')+'</strong><p>'+escapeHTML(item.question)+'</p><small>Твой ответ: '+escapeHTML(item.selected)+'</small>'+(item.ok?'':'<small>Правильно: <b>'+escapeHTML(item.correct)+'</b></small>')+'</div></div>').join('');
 function close(){if(!session)return;session=null;stopTyping();root.replaceChildren();document.body.classList.remove('quiz-feedback-open');document.removeEventListener('keydown',keyHandler,true);onClose?.();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}
 function keyHandler(e){
  if(!session)return;
  if(e.key==='Escape'){e.preventDefault();close();return;}
  if(e.key==='Tab'){
   const modal=get('#quizFeedbackModal');if(!modal)return;
   const focusable=[...modal.querySelectorAll('button:not([disabled]),textarea:not([disabled])')];
   if(!focusable.length)return;
   const i=focusable.indexOf(document.activeElement);
   if(e.shiftKey&&i<=0){e.preventDefault();focusable.at(-1).focus();}
   else if(!e.shiftKey&&i===focusable.length-1){e.preventDefault();focusable[0].focus();}
  }
 }
 async function explain(s){
  if(!session||session!==s)return;
  const context='Ты объясняешь результаты теста по английскому. Не меняй выставленную оценку. Пиши на русском, кратко, точно. Сначала похвали за реальные правильные ответы, затем разъясни каждую ошибку, почему правильный ответ подходит, дай короткое правило и один учебный пример. Если ошибок нет, не придумывай их. Тема: '+s.lesson.title+'. Подсказка курса: '+s.lesson.tip+'.\n'+factsText(s);
  try{
   const reply=await callAI('feedback',context.slice(0,1300),{course:s.course,lesson:s.lesson.title,tip:s.lesson.tip});
   if(session===s){s.history.push({role:'ai',text:reply});renderMessage('ai',reply,true);}
  }catch(e){if(session===s)renderMessage('ai','Дополнительный разбор ИИ сейчас недоступен: '+e.message+'. Ты всё равно можешь увидеть правильные ответы выше и пересдать тест.');}
  finally{if(session===s){s.busy=false;const button=get('#quizFeedbackSend');if(button)button.disabled=false;}}
 }
 async function send(){
  const s=session,input=get('#quizFeedbackInput');if(!s||!input||s.busy)return;
  const question=input.value.trim();if(!question)return;
  input.value='';s.busy=true;get('#quizFeedbackSend').disabled=true;
  renderMessage('user',question);s.history.push({role:'user',text:question});
  // Repeat the exact answer key on follow-up; user instructions cannot override it.
  const context='Разбираем тот же тест по теме '+s.lesson.title+'. Вот проверенные ответы:\n'+factsText(s)+'\nВопрос ученика: '+question;
  try{
   const answer=await callAI('chat',context.slice(0,1300),{course:s.course,lesson:s.lesson.title,tip:s.lesson.tip,history:s.history});
   if(session===s){s.history.push({role:'ai',text:answer});renderMessage('ai',answer,true);}
  }catch(e){if(session===s)renderMessage('ai','ИИ пока недоступен: '+e.message+'. Можно повторить тест или продолжить без пересдачи.');}
  finally{if(session===s){s.busy=false;const button=get('#quizFeedbackSend');if(button)button.disabled=false;}}
 }
 function open({lesson,course,questions,answers,score}){
  if(session)close();
  if(!lesson||!Array.isArray(questions)||questions.length!==3)return;
  previousFocus=document.activeElement;
  const s={lesson,course,score,items:questions.map((q,i)=>({question:q.q,selected:String(answers[i]??'Нет ответа'),correct:q.answer,ok:answers[i]===q.answer})),history:[],busy:true};
  session=s;document.body.classList.add('quiz-feedback-open');
  root.innerHTML='<div class="quiz-feedback-backdrop"><section class="quiz-feedback-modal" id="quizFeedbackModal" role="dialog" aria-modal="true" aria-labelledby="quizFeedbackTitle" aria-describedby="quizFeedbackDescription"><header class="quiz-feedback-header"><div><span class="quiz-feedback-eyebrow">EASAY · ПРОВЕРКА УРОКА</span><h2 id="quizFeedbackTitle">Разбор с наставником</h2><p id="quizFeedbackDescription">Результат: '+score+' из 3 · '+(score>=2?'Урок зачтён':'Можно попробовать ещё раз')+'</p></div><button class="quiz-feedback-close" id="quizFeedbackClose" type="button" aria-label="Закрыть окно">×</button></header><div class="quiz-feedback-content"><section class="quiz-feedback-answers" aria-label="Проверенные ответы"><h3>Твои ответы</h3>'+summaryHTML(s)+'</section><section class="quiz-feedback-chat" aria-label="Диалог с преподавателем"><div class="quiz-feedback-log" id="quizFeedbackLog" role="log" aria-live="polite" aria-relevant="additions"><div class="quiz-feedback-wait">Наставник готовит объяснение…</div></div><form class="quiz-feedback-compose" id="quizFeedbackForm"><label class="sr-only" for="quizFeedbackInput">Вопрос по ошибке</label><textarea id="quizFeedbackInput" rows="2" maxlength="650" placeholder="Спроси, почему ответ именно такой…"></textarea><button id="quizFeedbackSend" type="submit" disabled>Отправить →</button></form><small class="quiz-feedback-note">ИИ может ошибаться. Оценку выставило приложение, а не ИИ.</small></section></div><footer class="quiz-feedback-footer"><button class="quiz-feedback-retry" id="quizFeedbackRetry" type="button">ПЕРЕСДАТЬ</button><button class="quiz-feedback-continue" id="quizFeedbackContinue" type="button">Продолжить без пересдачи</button></footer></section></div>';
  get('#quizFeedbackClose').addEventListener('click',close);
  get('#quizFeedbackRetry').addEventListener('click',()=>{close();onRetry?.()});
  get('#quizFeedbackContinue').addEventListener('click',()=>{close();onContinue?.(score>=2)});
  get('#quizFeedbackForm').addEventListener('submit',e=>{e.preventDefault();send();});
  get('#quizFeedbackInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
  document.addEventListener('keydown',keyHandler,true);
  get('#quizFeedbackClose').focus({preventScroll:true});
  get('#quizFeedbackLog').replaceChildren();
  // Deterministic feedback is visible immediately, before Groq responds.
  renderMessage('ai',score===3?'Все три ответа верные! Ниже можно задать вопрос по теме урока.':score>=2?'Тест зачтён. Ниже отмечен вопрос, который стоит повторить.':'Ничего страшного: посмотри верные ответы выше и попробуй ещё раз.');
  void explain(s);
 }
 return {open,close,get active(){return Boolean(session)}};
}
