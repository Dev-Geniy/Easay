import {safeNickname,isCorrect} from './intro-logic.js';
const $=id=>document.getElementById(id);
const key='easay:intro:v1';
let step=0,answered={1:false,2:false};
function localSave(k,v){try{localStorage.setItem(k,v)}catch{}}
function localRead(k){try{return localStorage.getItem(k)}catch{return null}}
function feedback(id,message){$(id).textContent=message}
function showStep(){
 document.querySelectorAll('[data-step]').forEach(x=>x.hidden=Number(x.dataset.step)!==step);
 $('lessonProgress').style.width=String(Math.min(100,step*100/3))+'%';
 $('lessonStepLabel').textContent=step===3?'Урок завершён':'Шаг '+String(step+1)+' из 3';
 const ready=step===0||step===3||Boolean(answered[step]);
 $('lessonNext').disabled=!ready;
 $('lessonNext').textContent=step===3?'Завершить урок →':'Продолжить →';
 $('lessonHint').textContent=step===3?'Твои следующие уроки уже готовы.':'';
 if(step===3)$('resultName').textContent=safeNickname($('learnerName').value);
}
function speak(text){
 if(!('speechSynthesis' in window)){feedback('lessonHint','Озвучивание не поддерживается этим браузером. Прочитай фразу вслух.');return}
 speechSynthesis.cancel();
 const utter=new SpeechSynthesisUtterance(text);utter.lang='en-US';utter.rate=.86;speechSynthesis.speak(utter);
}
$('speakHello').addEventListener('click',()=>speak('Hello! My name is Alex.'));
$('learnerName').addEventListener('input',()=>{$('previewName').textContent=safeNickname($('learnerName').value)});
document.querySelectorAll('.choice-list').forEach(list=>{
 list.addEventListener('click',event=>{
  const button=event.target.closest('button[data-answer]');
  if(!button)return;
  const s=list.id==='choiceOne'?1:2;
  const correct=isCorrect(s,button.dataset.answer);
  list.querySelectorAll('button').forEach(el=>el.classList.remove('correct','incorrect'));
  button.classList.add(correct?'correct':'incorrect');
  answered[s]=correct;
  feedback(s===1?'feedbackOne':'feedbackTwo',correct?'Правильно! Отличный ответ.':'Почти! Попробуй ещё раз — ты справишься.');
  showStep();
 });
});
$('lessonNext').addEventListener('click',()=>{
 if(step===1&&!answered[1]||step===2&&!answered[2])return;
 if(step===3){openMotivation();return}
 step+=1;showStep();
 const card=document.querySelector('.lesson-card');if(card)card.scrollIntoView({behavior:'smooth',block:'center'});
});
function openMotivation(){
 const dialog=$('motivationDialog');if(dialog.open)return;
 if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
 const first=dialog.querySelector('input[name=motivation]');if(first)first.focus();
}
function finish(){
 const selected=document.querySelector('input[name=motivation]:checked');
 localSave(key,'done');
 const chosen=$('learnerName')?.value.trim();if(chosen)localSave('easay:intro-name:v1',chosen.slice(0,30));
 localSave('easay:motivation:v1',selected?.value||'gentle');
 window.location.assign('/app.html');
}
$('skipDonation').addEventListener('click',finish);
$('donateThenContinue').addEventListener('click',()=>{
 // Never treat an open donation link as proof that a donation happened.
 window.open('https://send.monobank.ua/jar/9ECZLkLXkq','_blank','noopener,noreferrer');
 finish();
});
$('motivationDialog').addEventListener('cancel',event=>{event.preventDefault();finish()});
document.querySelectorAll('[data-copy-bank]').forEach(button=>button.addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText('4874100035742876');button.textContent='Скопировано ✓'}
 catch{button.textContent='Выдели номер карты, чтобы скопировать'}
}));
if(localRead(key)==='done')$('enterApp').textContent='Продолжить учёбу ↗';
showStep();
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('/sw.js').catch(()=>{});
