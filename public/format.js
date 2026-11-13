// Safe, small Markdown renderer for AI replies. No raw HTML from the model is allowed.
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const cells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(x => x.trim());
const divider = line => {
  const parts = cells(line);
  return parts.length > 1 && parts.every(x => /^:?-{3,}:?$/.test(x));
};
function inline(text) {
  let safe = esc(text);
  safe = safe.replace(/\x60([^\x60\n]+)\x60/g, '<code>$1</code>');
  safe = safe.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s).,!?;:])/g, '$1<em>$2</em>');
  return safe;
}
export function renderAssistantText(source) {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').slice(0, 6000).split('\n');
  const output = [];
  let list = null;
  let paragraph = [];
  let code = null;
  const flushList = () => { if(list){output.push('</'+list+'>');list=null;} };
  const flushParagraph = () => {if(paragraph.length){output.push('<p>'+paragraph.map(inline).join('<br>')+'</p>');paragraph=[];}};
  for(let i=0;i<lines.length;i++){
    const line=lines[i], trimmed=line.trim();
    if(code !== null){
      if(/^ *\x60{3}/.test(trimmed)){output.push('<pre><code>'+esc(code.join('\n'))+'</code></pre>');code=null;}
      else code.push(line);
      continue;
    }
    if(/^ *\x60{3}/.test(trimmed)){flushParagraph();flushList();code=[];continue;}
    if(!trimmed){flushParagraph();flushList();continue;}
    if(/^\|.*\|$/.test(trimmed) && i+1<lines.length && divider(lines[i+1])){
      flushParagraph();flushList();
      const heads=cells(trimmed).slice(0,8);
      output.push('<div class="ai-table-wrap"><table class="ai-table"><thead><tr>'+heads.map(h=>'<th>'+inline(h)+'</th>').join('')+'</tr></thead><tbody>');
      i+=1;
      while(i+1<lines.length && /^\|.*\|$/.test(lines[i+1].trim()) && !divider(lines[i+1])){
        const values=cells(lines[++i]).slice(0,heads.length);
        output.push('<tr>'+heads.map((h,k)=>'<td data-label="'+esc(h)+'">'+inline(values[k]??'')+'</td>').join('')+'</tr>');
      }
      output.push('</tbody></table></div>');
      continue;
    }
    const heading=trimmed.match(/^#{1,4}\s+(.+)$/);
    if(heading){flushParagraph();flushList();output.push('<h4>'+inline(heading[1])+'</h4>');continue;}
    const li=trimmed.match(/^([-*•]\s+|\d+[.)]\s+)(.+)$/);
    if(li){
      flushParagraph();
      const type=/^\d/.test(li[1])?'ol':'ul';
      if(list!==type){flushList();list=type;output.push('<'+type+'>');}
      output.push('<li>'+inline(li[2])+'</li>');
      continue;
    }
    flushList();paragraph.push(trimmed);
  }
  if(code!==null)output.push('<pre><code>'+esc(code.join('\n'))+'</code></pre>');
  flushParagraph();flushList();
  return output.join('');
}
