// Cloudflare Pages Functions: GET starts one timed exam per rolling 24 hours; POST grades server-side.
// Without an EASAY_DB D1 binding, the browser falls back to a local PRACTICE exam.
// A certificate verifies the final exam, not identity or formal accreditation.
import {buildExam,gradeExam,PASS_SCORE} from '../../public/exam.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
const sameOrigin=req=>{const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin;};
// Stable pseudonymous per-IP hash across dates: a daily salt used to reset at
// UTC midnight and accidentally permitted multiple attempts in <24 hours.
const ATTEMPT_WINDOW_MS=24*60*60*1000;
const digestTag=async(value)=>{
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
};
async function ipTags(request,env,now){
 const ip=request.headers.get('cf-connecting-ip')||'unknown';
 const secret=env.CERT_HASH_SECRET||'';
 if(secret.length<24)throw Error('CERT_HASH_SECRET not configured');
 // Legacy dated tokens are counted during the 24-hour migration period.
 // Nothing stores or exposes the plaintext IP address.
 const today=new Date(now).toISOString().slice(0,10);
 const yesterday=new Date(now-ATTEMPT_WINDOW_MS).toISOString().slice(0,10);
 return Promise.all([digestTag(secret+':'+ip+':limit-v2'),digestTag(secret+':'+ip+':'+today),digestTag(secret+':'+ip+':'+yesterday)]);
}
export async function onRequestGet({request,env}){
 if(!env.EASAY_DB)return json({error:'Серверный экзамен пока не настроен. Доступна тренировка без сертификата.',available:false},503);
 const course=new URL(request.url).searchParams.get('course');
 const seed=crypto.getRandomValues(new Uint32Array(1))[0];
 const exam=buildExam(course,seed);
 if(!exam)return json({error:'Направление не найдено.'},404);
 try{
  const now=Date.now();
  const [ip,legacyToday,legacyYesterday]=await ipTags(request,env,now);
  const latest=await env.EASAY_DB.prepare('SELECT MAX(created_at) as last_attempt FROM exam_attempts WHERE ip_hash IN (?,?,?) AND created_at>?')
   .bind(ip,legacyToday,legacyYesterday,now-ATTEMPT_WINDOW_MS).first();
  if(latest?.last_attempt!=null){
   const nextAttemptAt=Number(latest.last_attempt)+ATTEMPT_WINDOW_MS;
   return json({error:'Серверный экзамен доступен один раз в 24 часа. Следующая попытка — после истечения 24 часов с начала предыдущей.',code:'EXAM_DAILY_LIMIT',nextAttemptAt,available:false,practiceAvailable:true},429);
  }
  const id=crypto.randomUUID();
  await env.EASAY_DB.prepare('INSERT INTO exam_attempts (id,course_id,questions_json,ip_hash,created_at,expires_at) VALUES (?,?,?,?,?,?)')
   .bind(id,exam.courseId,JSON.stringify(exam.questions),ip,now,now+45*60*1000).run();
  return json({mode:'verified',attemptId:id,courseId:exam.courseId,courseTitle:exam.courseTitle,passing:PASS_SCORE,
   expiresAt:now+45*60*1000,questions:exam.questions.map(({id,prompt,options})=>({id,prompt,options}))});
 }catch{return json({error:'Сервер экзамена сейчас недоступен. Попробуй тренировку.'},503)}
}
export async function onRequestPost({request,env}){
 if(!env.EASAY_DB)return json({error:'Для выдачи проверяемого сертификата требуется база Cloudflare D1.'},503);
 if(!sameOrigin(request))return json({error:'Недопустимый источник запроса.'},403);
 if(Number(request.headers.get('content-length')||0)>15000)return json({error:'Слишком большой запрос.'},413);
 let data;try{const raw=await request.text();if(raw.length>15000)return json({error:'Слишком большой запрос.'},413);data=JSON.parse(raw)}catch{return json({error:'Некорректный JSON.'},400)}
 const id=String(data?.attemptId||'');
 if(!/^[a-f0-9-]{36}$/.test(id))return json({error:'Неверный идентификатор попытки.'},400);
 const answers=data?.answers;
 if(!answers||typeof answers!=='object'||Array.isArray(answers))return json({error:'Нет ответов на задания.'},400);
 const name=String(data?.name||'').replace(/[<>\\u0000-\\u001f]/g,'').replace(/\s+/g,' ').trim().slice(0,75);
 if(name.length<2)return json({error:'Для сертификата укажи имя (минимум 2 символа).'},400);
 const publishName=data?.publishName===true;
 try{
  const now=Date.now();
  const record=await env.EASAY_DB.prepare('SELECT * FROM exam_attempts WHERE id=? AND used=0 AND expires_at>?').bind(id,now).first();
  if(!record)return json({error:'Попытка истекла или уже использована. Начни новую.'},409);
  const questions=JSON.parse(record.questions_json);
  const result=gradeExam(questions,answers);
  if(!result)return json({error:'Данные экзамена повреждены.'},500);
  const marked=await env.EASAY_DB.prepare('UPDATE exam_attempts SET used=1 WHERE id=? AND used=0 AND expires_at>?').bind(id,now).run();
  if((marked?.meta?.changes||0)!==1)return json({error:'Эта попытка уже завершена.'},409);
  if(!result.passed)return json({score:result.score,correct:result.correct,passed:false,verified:true,
   message:'Для сертификата Easay необходимо не менее 90 из 100 баллов.'});
  const certificateId='ES-'+crypto.randomUUID().replaceAll('-','').slice(0,18).toUpperCase();
  const cert=buildExam(record.course_id,1);
  await env.EASAY_DB.prepare('INSERT INTO certificates(id,course_id,course_title,score,recipient,publish_name,created_at) VALUES(?,?,?,?,?,?,?)')
   .bind(certificateId,record.course_id,cert?.courseTitle||record.course_id,result.score,name,publishName?1:0,now).run();
  return json({score:result.score,correct:result.correct,passed:true,verified:true,certificateId,
   certificateUrl:'/certificate.html?id='+encodeURIComponent(certificateId),
   verificationUrl:'/certificate.html?id='+encodeURIComponent(certificateId),
   namePublic:publishName});
 }catch{return json({error:'Не удалось проверить экзамен на сервере. Попробуй позже.'},503)}
}
