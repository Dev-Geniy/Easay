/* Easay guided product tour.
 * Runs only in the learner app after onboarding. Does not mutate progress,
 * submit answers, call AI, or require external packages.
 */
export const TOUR_KEY='easay:tour:v1';
export const TOUR_STEPS=Object.freeze([
 {page:'home',target:'.home-main-button',title:'Продолжить обучение',description:'Главная кнопка Easay. Нажимай сюда, чтобы начать следующий урок.'},
 {page:'home',target:'[data-action="catalog"]',title:'Все курсы',description:'Здесь находятся направления английского для разных целей.'},
 {page:'catalog',target:'#courseGrid .course-card',title:'Выбор направления',description:'Открой понравившийся курс. Ты можешь менять направление в любой момент.'},
 {page:'course',target:'.course-cover [data-action="lesson"]',title:'Уроки курса',description:'Здесь видны все уроки. Продолжение открывает следующий по порядку.'},
 {page:'lesson',target:'.focus-phrase',title:'Сначала — одна фраза',description:'Послушай фразу, прочитай перевод и попробуй повторить вслух.'},
 {page:'lesson',target:'.lesson-controls [data-action="step-next"]',title:'Пять шагов урока',description:'Сначала фраза и новые выражения, затем диалог, карточки закрепления и тест с разбором ответов.'},
 {page:'lesson',target:'[data-action="review"]',title:'Повторение',description:'Сохранённые фразы можно повторять отдельно. Это помогает запомнить их надолго.'},
 {page:'review',target:'.review-surface',title:'Карточки для памяти',description:'Когда здесь появятся фразы, нажми на карточку, чтобы увидеть перевод.'},
 {page:'review',target:'[data-action="practice"]',title:'Разговорная практика',description:'Здесь можно потренировать английский на реальных жизненных ситуациях.'},
 {page:'practice',target:'.quick-grid',title:'Выбери ситуацию',description:'Например, знакомство, работа или путешествие. Потом начни разговор.'},
 {page:'practice',target:'[data-action="mentor"]',title:'ИИ-наставник',description:'Он объясняет правила и помогает разобрать сложные темы.'},
 {page:'mentor',target:'.mentor-compose',title:'Задай любой вопрос',description:'Напиши вопрос здесь. Наставник использует твой учебный контекст.'},
 {page:'mentor',target:'#avatar',title:'Настройки',description:'Здесь можно поменять цель, уровень и удобный ритм обучения.'},
 {page:'profile',target:'#profilePace',title:'Твой темп',description:'Выбери комфортный ритм. Все изменения сохраняются по кнопке ниже.'},
 {page:'profile',target:'.app-charity',title:'Бесплатно — с добрым делом',description:'Easay остаётся бесплатным благодаря добровольной поддержке. 50% донатов мы направляем на питание и развитие детей детского клуба и подросткового центра SkyKids. Поддержка — только по желанию.'},
 {page:'home',target:'.home-main-button',title:'Готово. Можно начинать!',description:'Теперь ты знаешь главное. Возвращайся к этой кнопке, когда захочешь продолжить.'}
]);
export function createTour({navigate,getPage,storage=window.localStorage}){
 let index=0,active=false,root=null,marked=null,raf=0,previousFocus=null;
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
 const getStored=()=>{try{return storage.getItem(TOUR_KEY)==='done'}catch{return false}};
 const remember=()=>{try{storage.setItem(TOUR_KEY,'done')}catch{}};
 const isMobile=()=>window.matchMedia('(max-width: 760px)').matches;
 function pick(selector){
  let matches=[...document.querySelectorAll(selector)].filter(el=>{
   if(el.closest('#easay-tour-root'))return false;
   const style=getComputedStyle(el),r=el.getBoundingClientRect();
   return style.display!=='none'&&style.visibility!=='hidden'&&r.width>0&&r.height>0;
  });
  if(matches.length>1&&selector.includes('data-action')){
   matches.sort((a,b)=>{
    const score=x=>isMobile()?Number(!!x.closest('.mobile-bottom')):Number(!!x.closest('.sidebar'));
    return score(b)-score(a);
   });
  }
  return matches[0]||null;
 }
 function schedule(){if(!active)return;cancelAnimationFrame(raf);raf=requestAnimationFrame(position);}
 function position(){
  if(!active||!root)return;
  const info=TOUR_STEPS[index],highlight=root.querySelector('.tour-highlight'),tip=root.querySelector('.tour-popover');
  const target=pick(info.target);
  if(!target){
   highlight.style.display='none';tip.style.left='max(14px, calc(50vw - 175px))';tip.style.top='max(90px, calc(50dvh - 160px))';
   return;
  }
  const r=target.getBoundingClientRect(),pad=7;
  highlight.style.display='block';
  highlight.style.left=(r.left-pad)+'px';highlight.style.top=(r.top-pad)+'px';
  highlight.style.width=(r.width+2*pad)+'px';highlight.style.height=(r.height+2*pad)+'px';
  const p=tip.getBoundingClientRect();
  const vw=window.innerWidth,vh=window.innerHeight,gutter=14,space=15;
  const pw=p.width,ph=p.height;
  let x,y;
  // Prefer right for desktop menu items, otherwise below or above.
  if(vw>960&&r.right+pw+28<vw){x=r.right+22;y=clamp(r.top,vh-ph-gutter>=gutter?gutter:0,Math.max(gutter,vh-ph-gutter));}
  else{
   x=clamp(r.left+(r.width-pw)/2,gutter,Math.max(gutter,vw-pw-gutter));
   y=r.bottom+space;
   if(y+ph>vh-gutter)y=r.top-ph-space;
   if(y<gutter)y=clamp((vh-ph)/2,gutter,Math.max(gutter,vh-ph-gutter));
  }
  tip.style.left=Math.round(x)+'px';tip.style.top=Math.round(y)+'px';
 }
 function draw(){
  if(!active)return;
  if(!root){
   root=document.createElement('div');
   root.id='easay-tour-root';
   root.innerHTML='<div class="tour-capture" aria-hidden="true"></div><div class="tour-highlight" aria-hidden="true"></div><section class="tour-popover" role="dialog" aria-modal="true" aria-labelledby="tourTitle" aria-describedby="tourDescription" tabindex="-1"><div class="tour-count" id="tourCount"></div><h2 id="tourTitle"></h2><p id="tourDescription"></p><div class="tour-progress" aria-hidden="true"><span></span></div><div class="tour-controls"><button type="button" class="tour-skip" data-tour="skip">Пропустить</button><div class="tour-move"><button type="button" class="tour-back" data-tour="back">Назад</button><button type="button" class="tour-next" data-tour="next">Далее →</button></div></div></section>';
   root.addEventListener('click',event=>{
    const button=event.target.closest('button[data-tour]');if(!button)return;
    if(button.dataset.tour==='next')next();
    if(button.dataset.tour==='back')back();
    if(button.dataset.tour==='skip')stop();
   });
   document.body.append(root);
   document.documentElement.classList.add('tour-active');
   window.addEventListener('resize',schedule,{passive:true});
   window.addEventListener('scroll',schedule,{passive:true,capture:true});
   window.visualViewport?.addEventListener('resize',schedule,{passive:true});
   document.addEventListener('keydown',keyHandler,true);
  }
  const s=TOUR_STEPS[index];
  root.dataset.spotlight=s.target==='.app-charity'?'charity':'regular';
  root.querySelector('#tourTitle').textContent=s.title;
  root.querySelector('#tourDescription').textContent=s.description;
  root.querySelector('#tourCount').textContent='ЗНАКОМСТВО · '+(index+1)+' / '+TOUR_STEPS.length;
  root.querySelector('.tour-progress span').style.width=((index+1)*100/TOUR_STEPS.length)+'%';
  root.querySelector('.tour-back').disabled=index===0;
  root.querySelector('.tour-next').textContent=index===TOUR_STEPS.length-1?'Завершить ✓':'Далее →';
  const target=pick(s.target);
  if(target){
   // Keep active navigation and focusable controls in view without activating them.
   target.scrollIntoView({block:s.target==='.app-charity'?'center':'nearest',inline:'nearest',behavior:'instant'});
  }
  schedule();
  root.querySelector('.tour-next').focus({preventScroll:true});
 }
 function show(){
  if(!active)return;
  const s=TOUR_STEPS[index];
  if(getPage()!==s.page)navigate(s.page);
  draw();
 }
 function next(){if(!active)return;if(index===TOUR_STEPS.length-1)return stop();index++;show();}
 function back(){if(!active||index===0)return;index--;show();}
 function start(){
  if(active)return;
  if(document.querySelector('#welcomeModal'))return;
  previousFocus=document.activeElement;
  index=0;active=true;show();
 }
 function stop(){
  if(!active)return;
  remember();active=false;
  cancelAnimationFrame(raf);
  window.removeEventListener('resize',schedule);
  window.removeEventListener('scroll',schedule,true);
  window.visualViewport?.removeEventListener('resize',schedule);
  document.removeEventListener('keydown',keyHandler,true);
  root?.remove();root=null;
  document.documentElement.classList.remove('tour-active');
  // Always return to a useful starting point, never submit tests or modify progress.
  if(getPage()!=='home')navigate('home');
  const resume=document.querySelector('.home-main-button')||previousFocus;
  if(resume?.isConnected)resume.focus({preventScroll:true});
 }
 function keyHandler(event){
  if(!active)return;
  if(event.key==='Escape'){event.preventDefault();stop();return;}
  if(event.key==='ArrowRight'){event.preventDefault();next();return;}
  if(event.key==='ArrowLeft'){event.preventDefault();back();return;}
  if(event.key==='Tab'){
   const choices=[...root.querySelectorAll('button:not(:disabled)')];
   if(!choices.length)return;
   const i=choices.indexOf(document.activeElement);
   if(event.shiftKey&&i<=0){event.preventDefault();choices[choices.length-1].focus();}
   else if(!event.shiftKey&&i===choices.length-1){event.preventDefault();choices[0].focus();}
  }
 }
 return Object.freeze({
  start,next,back,stop,
  shouldAutoStart:()=>!getStored(),
  refreshAfterRender:()=>{if(active)requestAnimationFrame(draw);},
  get active(){return active}
 });
}
