// Stable per-browser pseudonymous learner ID; no account or personal data required.
// Using a new browser or clearing site data creates a new identity.
export const LEARNER_ID_KEY='easay:exam-learner:v1';
export const LEARNER_ID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function getOrCreateLearnerId(storage=globalThis.localStorage,cryptoApi=globalThis.crypto){
 try{
  const existing=storage.getItem(LEARNER_ID_KEY);
  if(LEARNER_ID_PATTERN.test(existing||''))return existing.toLowerCase();
  if(typeof cryptoApi?.randomUUID!=='function')return null;
  const next=cryptoApi.randomUUID().toLowerCase();
  if(!LEARNER_ID_PATTERN.test(next))return null;
  storage.setItem(LEARNER_ID_KEY,next);
  const saved=storage.getItem(LEARNER_ID_KEY);
  return LEARNER_ID_PATTERN.test(saved||'')?saved.toLowerCase():null;
 }catch{return null}
}
