import {populateSocialShareLinks,copyPublicLink,sharePublicLink} from './share.js';
const $=id=>document.getElementById(id);const id=new URLSearchParams(location.search).get('id')||'';
const error=message=>{$('error').textContent=message;$('error').hidden=false;$('certificate').hidden=true};
const link=()=>location.origin+'/certificate.html?id='+encodeURIComponent(id);
if(!/^ES-[A-Z0-9]{18}$/.test(id))error('Неверный номер сертификата.');
else{
 try{
  const response=await fetch('/api/certificate?id='+encodeURIComponent(id),{cache:'no-store'});
  const cert=await response.json();
  if(!response.ok||!cert.verified)throw Error(cert.error||'Не найден в реестре.');
  let localName='';try{localName=JSON.parse(localStorage.getItem('easay:cert-names:v1')||'{}')[id]||''}catch{}
  $('name').textContent=cert.recipient||localName||'Имя не опубликовано';
  $('course').textContent=cert.courseTitle;
  $('score').textContent=Number(cert.score)+'%';
  $('date').textContent=new Intl.DateTimeFormat('ru-RU',{dateStyle:'long'}).format(new Date(cert.issuedAt+'T12:00:00'));
  $('id').textContent=cert.id;$('link').textContent='Проверка: '+link();
  $('error').hidden=true;$('certificate').hidden=false;$('copy').hidden=false;$('print').hidden=false;
  populateSocialShareLinks($('certificateSharePanel'),link(),'Мой результат внутреннего экзамена Easay — проверь сертификат по ссылке.');
  $('certificateSharePanel').hidden=false;
  $('shareNative').hidden=typeof navigator.share!=='function';
 }catch(e){error('Проверка не удалась: '+e.message+' Не публикуй документ как подтверждённый без реестра.')}
}
$('print').addEventListener('click',()=>window.print());
$('copy').addEventListener('click',async()=>{
 const result=await copyPublicLink(link());
 $('copy').textContent=result==='copied'?'Ссылка скопирована ✓':result==='manual'?'Скопируй ссылку в окне':'Копирование недоступно';
});
$('shareNative').addEventListener('click',async()=>{
 try{
  const result=await sharePublicLink({url:link(),title:'Сертификат Easay',text:'Мой результат внутреннего экзамена Easay'});
  if(result==='unsupported'){
   const copied=await copyPublicLink(link());
   $('shareNative').textContent=copied==='copied'?'Ссылка скопирована ✓':'Скопируй ссылку';
  }
 }catch{$('shareNative').textContent='Не удалось поделиться. Скопируй ссылку.';}
});
