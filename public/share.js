// Shared, dependency-free social links for Easay and verified certificates.
// Certificate shares contain only a public verification URL, never a local FIO.
export const SOCIAL_NETWORKS=Object.freeze([
 {key:'telegram',label:'Telegram',glyph:'✈'},
 {key:'whatsapp',label:'WhatsApp',glyph:'◉'},
 {key:'facebook',label:'Facebook',glyph:'f'}
]);
export function socialShareUrls(url,text=''){
 const parsed=new URL(String(url));
 if(parsed.protocol!=='https:'&&parsed.protocol!=='http:')throw new TypeError('Only public HTTP(S) pages can be shared');
 const cleanUrl=parsed.href;
 const message=String(text||'').trim();
 return {
  telegram:'https://t.me/share/url?url='+encodeURIComponent(cleanUrl)+'&text='+encodeURIComponent(message),
  whatsapp:'https://wa.me/?text='+encodeURIComponent([message,cleanUrl].filter(Boolean).join(' ')),
  facebook:'https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(cleanUrl)
 };
}
export function populateSocialShareLinks(scope,url,text){
 const targets=socialShareUrls(url,text);
 let assigned=0;
 for(const a of scope.querySelectorAll('[data-share-network]')){
  const name=a.getAttribute('data-share-network');
  if(!Object.prototype.hasOwnProperty.call(targets,name))continue;
  a.href=targets[name];
  a.target='_blank';
  a.rel='noopener noreferrer';
  assigned++;
 }
 return assigned;
}
export async function copyPublicLink(url,environment=globalThis){
 const clip=environment.navigator?.clipboard;
 if(typeof clip?.writeText==='function'){
  try{await clip.writeText(String(url));return 'copied'}catch{}
 }
 // User explicitly requests copying: allow a manual selection prompt as fallback.
 if(typeof environment.prompt==='function'){
  environment.prompt('Скопируй ссылку:',String(url));
  return 'manual';
 }
 return 'unavailable';
}
export async function sharePublicLink({url,title,text},environment=globalThis){
 if(typeof environment.navigator?.share!=='function')return 'unsupported';
 try{
  await environment.navigator.share({title:String(title||'Easay'),text:String(text||''),url:String(url)});
  return 'shared';
 }catch(error){
  if(error?.name==='AbortError')return 'cancelled';
  throw error;
 }
}
