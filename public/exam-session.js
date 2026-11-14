// Safely persist an in-progress server exam on this browser.
// The answer key is NEVER stored here: only the selected choices returned by the learner.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const examSessionKey=courseId=>'easay:verified-exam:v1:'+String(courseId||'');
export function readExamSession(courseId,storage=globalThis.localStorage,now=Date.now()){
 try{
  const record=JSON.parse(storage.getItem(examSessionKey(courseId))||'null');
  if(!record)return null;
  if(record.version!==1||record.courseId!==courseId||!UUID.test(record.attemptId||'')||!Number.isFinite(record.expiresAt)||record.expiresAt<=now){
   storage.removeItem(examSessionKey(courseId));return null;
  }
  return {attemptId:record.attemptId,courseId,expiresAt:record.expiresAt,index:Number.isInteger(record.index)?Math.max(0,Math.min(40,record.index)):0,
   answers:record.answers&&typeof record.answers==='object'&&!Array.isArray(record.answers)?record.answers:{}};
 }catch{return null}
}
export function saveExamSession(data,storage=globalThis.localStorage){
 try{
  if(!data||!UUID.test(data.attemptId||'')||!Number.isFinite(data.expiresAt)||data.expiresAt<=Date.now())return false;
  const answers=Object.fromEntries(Object.entries(data.answers||{}).filter(([id,value])=>/^q(?:[0-9]|[1-3][0-9])$/.test(id)&&typeof value==='string'&&value.length<256).slice(0,40));
  const record={version:1,courseId:data.courseId,attemptId:data.attemptId,expiresAt:data.expiresAt,
   index:Number.isInteger(data.index)?Math.max(0,Math.min(40,data.index)):0,answers};
  storage.setItem(examSessionKey(data.courseId),JSON.stringify(record));return true;
 }catch{return false}
}
export function clearExamSession(courseId,storage=globalThis.localStorage){
 try{storage.removeItem(examSessionKey(courseId))}catch{}
}
