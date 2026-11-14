import {populateSocialShareLinks} from './share.js';
const footer=document.querySelector('#appShare');
if(footer){
 const easayHome=new URL('/',location.href).href;
 populateSocialShareLinks(footer,easayHome,'Изучай английский с Easay: уроки, разговорная практика и повторение бесплатно.');
}
