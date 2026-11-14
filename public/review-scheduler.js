// Easay spaced-repetition scheduler v2.
// Keeps existing {level,due} entries readable; adds dueAt for minute accuracy.
export const REVIEW_RATINGS=Object.freeze([
 {id:'again',label:'Не помню',className:'rating-again'},
 {id:'hard',label:'С трудом',className:'rating-hard'},
 {id:'easy',label:'Легко',className:'rating-easy'}
]);
const MINUTE=60*1000;
const DAY=24*60*MINUTE;
const EASY_DAYS=[3,7,14,30,60,90];
const HARD_DAYS=[1,1,2,4,7,14];
const clampLevel=previous=>{
 const level=Number(previous?.level);
 return Number.isFinite(level)?Math.max(0,Math.min(5,Math.floor(level))):0;
};
const localDate=timestamp=>{
 const d=new Date(timestamp);
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
};
export function isReviewDue(review,now=Date.now()){
 if(!review||typeof review!=='object')return true;
 if(typeof review.dueAt==='number'&&Number.isFinite(review.dueAt))return review.dueAt<=now;
 if(typeof review.due==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(review.due))return review.due<=localDate(now);
 return true;
}
export function nextReviewDelay(previous,rating){
 const level=clampLevel(previous);
 if(rating==='again')return 10*MINUTE;
 if(rating==='hard')return HARD_DAYS[level]*DAY;
 if(rating==='easy')return EASY_DAYS[Math.min(5,level+1)]*DAY;
 throw new RangeError('Unknown review rating');
}
export function reviewDelayLabel(milliseconds){
 const minutes=Math.round(milliseconds/MINUTE);
 if(minutes<60)return 'через '+minutes+' мин';
 const days=Math.round(milliseconds/DAY);
 if(days===1)return 'через 1 день';
 if(days>=2&&days<=4)return 'через '+days+' дня';
 return 'через '+days+' дней';
}
export function scheduleReview(previous,rating,now=Date.now()){
 const old=previous&&typeof previous==='object'?previous:{};
 const level=clampLevel(old);
 const newLevel=rating==='again'?0:rating==='easy'?Math.min(5,level+1):level;
 const dueAt=now+nextReviewDelay(old,rating);
 return {...old,level:newLevel,dueAt,due:localDate(dueAt),lastRating:rating,
  reviewedAt:now,repetitions:(Number.isInteger(old.repetitions)&&old.repetitions>=0?old.repetitions:0)+1,
  lapses:(Number.isInteger(old.lapses)&&old.lapses>=0?old.lapses:0)+(rating==='again'?1:0)};
}
