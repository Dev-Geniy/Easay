import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {socialShareUrls,populateSocialShareLinks,copyPublicLink,sharePublicLink,SOCIAL_NETWORKS} from '../public/share.js';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const example='https://easay.example/certificate.html?id=ES-ABCDEFGHIJKLMNOPQR';
test('all three social networks open the intended certificate verification URL',()=>{
 const links=socialShareUrls(example,'Мой подтверждённый результат');
 assert.deepEqual(SOCIAL_NETWORKS.map(n=>n.label),['Telegram','WhatsApp','Facebook']);
 const telegram=new URL(links.telegram),whatsapp=new URL(links.whatsapp),facebook=new URL(links.facebook);
 assert.equal(telegram.host,'t.me');
 assert.equal(telegram.searchParams.get('url'),example);
 assert.equal(telegram.searchParams.get('text'),'Мой подтверждённый результат');
 assert.equal(whatsapp.host,'wa.me');
 assert.ok(whatsapp.searchParams.get('text').includes(example));
 assert.equal(facebook.host,'www.facebook.com');
 assert.equal(facebook.searchParams.get('u'),example);
 for(const dest of Object.values(links))assert.equal(new URL(dest).protocol,'https:');
 assert.throws(()=>socialShareUrls('javascript:alert(1)','oops'),TypeError);
});
test('links are populated only for three recognized networks and open safely',()=>{
 const anchors=['telegram','whatsapp','facebook','unknown'].map(key=>{
  const fields={};
  return {getAttribute:n=>n==='data-share-network'?key:null,set href(v){fields.href=v},get href(){return fields.href},set target(v){fields.target=v},get target(){return fields.target},set rel(v){fields.rel=v},get rel(){return fields.rel}};
 });
 const scope={querySelectorAll:()=>anchors};
 assert.equal(populateSocialShareLinks(scope,example,'Hello'),3);
 for(const a of anchors.slice(0,3)){assert.match(a.href,/^https:\/\//);assert.equal(a.target,'_blank');assert.equal(a.rel,'noopener noreferrer')}
 assert.equal(anchors[3].href,undefined);
});
test('system share and manual copy fallback handle cancellation, missing support and permissions',async()=>{
 const calls=[];
 const good={navigator:{share:async payload=>calls.push(payload),clipboard:{writeText:async text=>calls.push(text)}}};
 assert.equal(await sharePublicLink({url:example,title:'Certificate',text:'Score'},good),'shared');
 assert.equal(calls[0].url,example);
 assert.equal(await copyPublicLink(example,good),'copied');
 assert.equal(calls[1],example);
 assert.equal(await sharePublicLink({url:example},{}),'unsupported');
 assert.equal(await sharePublicLink({url:example},{navigator:{share:async()=>{const e=new Error('Cancelled');e.name='AbortError';throw e}}}),'cancelled');
 const manual=[];
 assert.equal(await copyPublicLink(example,{prompt:(title,url)=>manual.push(url)}),'manual');
 assert.deepEqual(manual,[example]);
});
test('social sharing in the app footer sits below donation and does not publish user progress',()=>{
 const app=read('../public/app.html'),js=read('../public/social-footer.js');
 const donation=app.indexOf('class="app-charity"'),share=app.indexOf('id="appShare"');
 assert.ok(donation>=0&&share>donation);
 for(const network of ['telegram','whatsapp','facebook'])assert.match(app,new RegExp('data-share-network="'+network+'"'));
 assert.match(app,/\/social-footer\.js/);
 assert.match(js,/new URL\('\/',location\.href\)\.href/);
 assert.match(js,/populateSocialShareLinks/);
 assert.doesNotMatch(js,/state\.completed|state\.reviews|cert-names/);
});
test('only verified registry certificates become publicly shareable; no names in share message',()=>{
 const html=read('../public/certificate.html'),client=read('../public/certificate.js'),api=read('../functions/api/certificate.js');
 assert.match(html,/id="certificateSharePanel"[^>]*hidden/);
 assert.match(client,/if\(!response\.ok\|\|!cert\.verified\)throw/);
 assert.match(client,/populateSocialShareLinks\(\$\('certificateSharePanel'\)/);
 assert.match(client,/\$\('certificateSharePanel'\)\.hidden=false/);
 assert.match(client,/\$\('shareNative'\)\.hidden=typeof navigator\.share/);
 assert.match(html,/id="shareNative"/);
 assert.match(html,/id="copy"/);
 assert.match(api,/recipient:cert\.publish_name\?cert\.recipient:null/);
 assert.doesNotMatch(client,/sharePublicLink\(\{[^}]*localName/);
 assert.doesNotMatch(client,/populateSocialShareLinks\([^;]*localName/);
});
test('result sharing is restricted to verified passing certificates, not practice exams',()=>{
 const source=read('../public/exam-ui.js');
 assert.match(source,/verified&&passed&&\/\^ES-\[A-Z0-9\]\{18\}\$\//);
 assert.match(source,/const shareBlock=certificateUrl\?/);
 assert.match(source,/socialShareUrls\(certificateUrl,message\)/);
 assert.match(source,/examCopyCertificate/);
 assert.match(source,/examNativeShare/);
 assert.match(source,/sharePublicLink/);
 assert.doesNotMatch(source,/name\+'[^']*telegram/i);
});
test('sharing code and styles included in the offline PWA and all three app entry points',()=>{
 const worker=read('../public/sw.js');
 for(const asset of ["'/share.js'","'/share.css'","'/social-footer.js'"])assert.ok(worker.includes(asset),asset);
 for(const path of ['../public/app.html','../public/exam.html','../public/certificate.html'])assert.match(read(path),/\/share\.css/);
 assert.match(worker,/easay-static-v6\.3\.3/);
 const css=read('../public/share.css');
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media print/);
 assert.match(css,/:focus-visible/);
});
