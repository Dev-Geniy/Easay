// Small motion layer for Easay marketing page. UI remains readable without JS.
const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)');
const finePointer=window.matchMedia?.('(pointer:fine)');
const parallax=[...document.querySelectorAll('[data-parallax]')];
if(reduce&&!reduce.matches&&'IntersectionObserver' in window){
  const items=[...document.querySelectorAll('[data-reveal]')];
  const io=new IntersectionObserver(entries=>{
    for(const e of entries)if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}
  },{threshold:.08,rootMargin:'40px 0px 30px 0px'});
  for(const item of items)io.observe(item);
  document.documentElement.classList.add('visual-motion');
}
if(reduce&&!reduce.matches&&finePointer?.matches&&parallax.length){
  let frame=0;
  const update=()=>{
    frame=0;const mid=innerHeight/2;
    for(const el of parallax){
      const rect=el.getBoundingClientRect(),speed=Number(el.dataset.parallax)||0;
      if(rect.bottom<-120||rect.top>innerHeight+120)continue;
      const offset=Math.max(-18,Math.min(18,(mid-(rect.top+rect.height/2))*speed));
      el.style.setProperty('--parallax-y',offset.toFixed(1)+'px');
    }
  };
  const schedule=()=>{if(frame)return;frame=requestAnimationFrame(update)};
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  reduce.addEventListener?.('change',()=>{for(const el of parallax)el.style.removeProperty('--parallax-y')},{once:true});
  schedule();
}
