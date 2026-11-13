export const FIRST_LESSON={
 count:3,
 translations:{nice:'Рад знакомству',good:"I'm good, thanks!"}
};
export function safeNickname(value){
 const clean=String(value??'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,30);
 return clean||'Sam';
}
export function isCorrect(step,choice){
 return step===1?choice==='nice':step===2?choice==='good':false;
}
export function lessonComplete(step){return step===3}
