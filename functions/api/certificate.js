// Public verification does not reveal the student name unless opted in.
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
export async function onRequestGet({request,env}){
 if(!env.EASAY_DB)return json({verified:false,error:'Реестр Easay ещё не подключён.'},503);
 const id=new URL(request.url).searchParams.get('id')||'';
 if(!/^ES-[A-Z0-9]{18}$/.test(id))return json({verified:false,error:'Неверный номер сертификата.'},400);
 try{
  const cert=await env.EASAY_DB.prepare('SELECT id,course_title,course_id,score,recipient,publish_name,created_at FROM certificates WHERE id=?').bind(id).first();
  if(!cert)return json({verified:false,error:'Сертификат не найден в реестре Easay.'},404);
  return json({verified:true,id:cert.id,courseId:cert.course_id,courseTitle:cert.course_title,score:cert.score,
   issuedAt:new Date(cert.created_at).toISOString().slice(0,10),recipient:cert.publish_name?cert.recipient:null,
   disclaimer:'Подтверждает сдачу внутреннего экзамена Easay. Не является государственной квалификацией или независимой аккредитацией.'});
 }catch{return json({verified:false,error:'Реестр временно недоступен.'},503)}
}
