// Cloudflare Pages Functions: one timed exam per browser every rolling 24h; POST grades server-side.
// Without an EASAY_DB D1 binding, the browser falls back to a local PRACTICE exam.
// A certificate verifies the final exam, not identity or formal accreditation.
import {buildExam,gradeExam,PASS_SCORE} from '../../public/exam.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
const sameOrigin=req=>{const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin;};
// Rate-limiting pseudonymous IDs separates pupils sharing a public IP.
// Stored in the existing ip_hash D1 column for zero-migration deployment.
// This is intentionally per-browser, not authenticated per-person enforcement.
const ATTEMPT_WINDOW_MS=24*60*60*1000;
const LEARNER_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function learnerTag(request,env){
 const id=request.headers.get('x-easay-learner-id')||'';
 if(!LEARNER_ID.test(id))return null;
 const secret=env.CERT_HASH_SECRET||'';
 if(secret.length<24)throw Error('CERT_HASH_SECRET not configured');
 const bytes=new TextEncoder().encode(secret+':learner-v1:'+id.toLowerCase());
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
const isAttemptId=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
function activeExamPayload(record,courseTitle,resumed=false){
 const questions=JSON.parse(record.questions_json);
 return {mode:'verified',attemptId:record.id,courseId:record.course_id,courseTitle,passing:PASS_SCORE,
  expiresAt:record.expires_at,resumed,questions:questions.map(({id,prompt,options})=>({id,prompt,options}))};
}
export async function onRequestGet({request,env}){
 if(!env.EASAY_DB)return json({error:'Серверный экзамен пока не настроен. Доступна тренировка без сертификата.',available:false},503);
 const url=new URL(request.url);
 const course=url.searchParams.get('course');
 const seed=crypto.getRandomValues(new Uint32Array(1))[0];
 const exam=buildExam(course,seed);
 if(!exam)return json({error:'Направление не найдено.'},404);
 try{
  const now=Date.now();
  const learner=await learnerTag(request,env);
  if(!learner)return json({code:'LEARNER_ID_REQUIRED',error:'Не удалось определить постоянный идентификатор этого браузера. Для серверного экзамена включи хранение данных сайта.',practiceAvailable:true},400);
  // Resume belongs to this browser and does not consume another daily attempt.
  const resume=url.searchParams.get('resume');
  if(resume!==null){
   if(!isAttemptId(resume))return json({code:'EXAM_SESSION_INVALID',error:'Неверный идентификатор экзамена.'},400);
   const existing=await env.EASAY_DB.prepare('SELECT id,course_id,questions_json,expires_at,created_at,used FROM exam_attempts WHERE id=? AND ip_hash=?').bind(resume,learner).first();
   if(!existing||existing.course_id!==exam.courseId)return json({code:'EXAM_SESSION_INVALID',error:'Эта экзаменационная попытка не найдена для текущего браузера.'},404);
   if(existing.used||existing.expires_at<=now)return json({code:'EXAM_SESSION_EXPIRED',error:'Экзамен завершён или время истекло. Новая серверная попытка станет доступна через 24 часа после старта предыдущей.',nextAttemptAt:existing.created_at+ATTEMPT_WINDOW_MS,practiceAvailable:true},409);
   return json(activeExamPayload(existing,exam.courseTitle,true));
  }
  // Check-and-insert happen in one SQLite statement so two simultaneous tabs
  // cannot both reserve a certificate attempt within the same rolling window.
  const id=crypto.randomUUID();
  const reserved=await env.EASAY_DB.prepare(
   'INSERT INTO exam_attempts (id,course_id,questions_json,ip_hash,created_at,expires_at) '+
   'SELECT ?,?,?,?,?,? WHERE NOT EXISTS ('+
   'SELECT 1 FROM exam_attempts WHERE ip_hash=? AND created_at>?)')
   .bind(id,exam.courseId,JSON.stringify(exam.questions),learner,now,now+45*60*1000,
    learner,now-ATTEMPT_WINDOW_MS).run();
  if((reserved?.meta?.changes||0)!==1){
   // A second tab can continue the *same* unsubmitted, unexpired attempt.
   const existing=await env.EASAY_DB.prepare('SELECT id,course_id,questions_json,expires_at FROM exam_attempts WHERE ip_hash=? AND course_id=? AND used=0 AND expires_at>? ORDER BY created_at DESC LIMIT 1')
    .bind(learner,exam.courseId,now).first();
   if(existing)return json(activeExamPayload(existing,exam.courseTitle,true));
   const latest=await env.EASAY_DB.prepare('SELECT MAX(created_at) as last_attempt FROM exam_attempts WHERE ip_hash=? AND created_at>?')
    .bind(learner,now-ATTEMPT_WINDOW_MS).first();
   const nextAttemptAt=latest?.last_attempt!=null?Number(latest.last_attempt)+ATTEMPT_WINDOW_MS:now+ATTEMPT_WINDOW_MS;
   return json({error:'Серверный экзамен доступен один раз в 24 часа. Следующая попытка — после истечения 24 часов с начала предыдущей.',code:'EXAM_DAILY_LIMIT',nextAttemptAt,available:false,practiceAvailable:true},429);
  }
  return json(activeExamPayload({id,course_id:exam.courseId,questions_json:JSON.stringify(exam.questions),expires_at:now+45*60*1000},exam.courseTitle));
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
 const name=String(data?.name||'').replace(/[<>\\u0000-\\u001f]/g,'').replace(/\s+/g,' ').trim().slice(0,100);
 if(name.length<5||name.split(/\s+/).length<2)return json({error:'Для сертификата укажи минимум фамилию и имя. Отчество — при наличии.'},400);
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
