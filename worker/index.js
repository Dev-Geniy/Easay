import ai from '../netlify/functions/ai.mjs';
import {onRequestGet as getExam,onRequestPost as submitExam} from '../functions/api/exam.js';
import {onRequestGet as getCertificate} from '../functions/api/certificate.js';
const json=(message,status=404)=>new Response(JSON.stringify({error:message}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
export default {
 async fetch(request,env,ctx){
  const path=new URL(request.url).pathname;
  if(path==='/api/ai')return ai(request,env);
  if(path==='/api/exam'){
   if(request.method==='GET')return getExam({request,env,ctx});
   if(request.method==='POST')return submitExam({request,env,ctx});
   return json('Разрешены только GET и POST.',405);
  }
  if(path==='/api/certificate'){
   if(request.method==='GET')return getCertificate({request,env,ctx});
   return json('Разрешён только GET.',405);
  }
  if(path.startsWith('/api/'))return json('Неизвестный API-маршрут.');
  if(env.ASSETS?.fetch)return env.ASSETS.fetch(request);
  return json('Статические файлы не настроены для Worker.',503);
 }
};
