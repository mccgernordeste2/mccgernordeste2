document.addEventListener('DOMContentLoaded',()=>{
  const sb=window.mccSupabase;
  const form=document.getElementById('publicar-form');
  const msg=document.getElementById('submit-message');
  const formStep=document.getElementById('submission-form-step');
  const previewStep=document.getElementById('submission-preview-step');
  const successStep=document.getElementById('submission-success-step');
  const title=form.elements.title;
  const descriptionHidden=document.getElementById('description-hidden');
  const editor=document.getElementById('description-editor');
  const suggestionsBox=document.getElementById('proofread-suggestions');
  const proofStatus=document.getElementById('proofread-status');
  const photoInput=form.elements.photos;

  let lastMatches=[];
  let reviewTimer=null;
  let lastReviewedText='';

  if(!sb){
    msg.textContent='Não foi possível conectar ao sistema.';
    msg.classList.remove('hidden');
    return;
  }

  function normalizeSpaces(text){
    return String(text||'')
      .replace(/\r/g,'')
      .replace(/[ \t]+/g,' ')
      .replace(/ *([,.;:!?]) */g,'$1 ')
      .replace(/\s+\n/g,'\n')
      .replace(/\n\s+/g,'\n')
      .replace(/\n{3,}/g,'\n\n')
      .replace(/ {2,}/g,' ')
      .trim();
  }

  function sentenceCase(text){
    let out=normalizeSpaces(text);
    out=out.replace(/(^|[.!?]\s+)([a-záàâãéêíóôõúç])/g,(m,prefix,char)=>prefix+char.toUpperCase());
    return out;
  }

  function headlineCase(text){
    let value=normalizeSpaces(text);
    if(!value)return '';
    if(value===value.toUpperCase()&&value.length>6){
      value=value.toLocaleLowerCase('pt-BR');
    }
    value=value.replace(/\b(mcc|ged|ger)\b/gi,m=>m.toUpperCase());
    return value.charAt(0).toLocaleUpperCase('pt-BR')+value.slice(1);
  }

  function paragraphs(text){
    const clean=sentenceCase(text);
    return clean
      .split(/\n{2,}|(?<=[.!?])\s+(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ])/)
      .map(x=>x.trim())
      .filter(Boolean);
  }

  function formatDate(value){
    if(!value)return '';
    return new Date(value+'T12:00:00').toLocaleDateString('pt-BR');
  }

  function getEditorText(){
    return editor.innerText.replace(/\u00a0/g,' ').replace(/\n{3,}/g,'\n\n').trimEnd();
  }

  function syncEditorToHidden(){
    descriptionHidden.value=getEditorText();
  }

  function updateCounters(){
    syncEditorToHidden();
    document.getElementById('title-counter').textContent=title.value.length+'/120 caracteres';
    document.getElementById('description-counter').textContent=descriptionHidden.value.length+' caracteres';
  }

  function escapeHtml(text){
    return String(text||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  }

  function getCaretOffset(){
    const sel=window.getSelection();
    if(!sel||!sel.rangeCount||!editor.contains(sel.anchorNode))return null;
    const range=sel.getRangeAt(0).cloneRange();
    const pre=range.cloneRange();
    pre.selectNodeContents(editor);
    pre.setEnd(range.endContainer,range.endOffset);
    return pre.toString().length;
  }

  function setCaretOffset(offset){
    if(offset===null||offset===undefined)return;
    const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);
    let pos=0,node;
    while((node=walker.nextNode())){
      const next=pos+node.nodeValue.length;
      if(offset<=next){
        const range=document.createRange();
        range.setStart(node,Math.max(0,offset-pos));
        range.collapse(true);
        const sel=window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      pos=next;
    }
    editor.focus();
  }

  function renderHighlighted(text,matches){
    const caret=getCaretOffset();
    const usable=[...matches]
      .filter(m=>m.length>0&&m.offset>=0&&m.offset+m.length<=text.length)
      .sort((a,b)=>a.offset-b.offset);

    let html='',cursor=0,issue=0;
    for(const m of usable){
      if(m.offset<cursor)continue;
      html+=escapeHtml(text.slice(cursor,m.offset));
      const wrong=text.slice(m.offset,m.offset+m.length);
      html+='<span class="proof-error" data-proof-index="'+issue+'" title="'+escapeHtml(m.message||'Sugestão de correção')+'">'+escapeHtml(wrong)+'</span>';
      cursor=m.offset+m.length;
      issue++;
    }
    html+=escapeHtml(text.slice(cursor)).replace(/\n/g,'<br>');
    editor.innerHTML=html;
    setCaretOffset(caret);
  }

  function localProperNounSuggestions(text){
    const results=[];
    const rules=[
      {re:/\bmcc\b/g,rep:'MCC',msg:'Sigla institucional deve ficar em maiúsculas.'},
      {re:/\bged\b/g,rep:'GED',msg:'Sigla institucional deve ficar em maiúsculas.'},
      {re:/\bger\b/g,rep:'GER',msg:'Sigla institucional deve ficar em maiúsculas.'},
      {re:/\bnordeste 2\b/gi,rep:'Nordeste 2',msg:'Padronização do nome regional.'}
    ];
    for(const rule of rules){
      let m;
      while((m=rule.re.exec(text))){
        if(m[0]===rule.rep)continue;
        results.push({offset:m.index,length:m[0].length,replacements:[rule.rep],message:rule.msg,category:'Padronização'});
      }
    }
    return results;
  }

  function mergeMatches(remote,local){
    const all=[...remote,...local].sort((a,b)=>a.offset-b.offset||b.length-a.length);
    const out=[];
    for(const m of all){
      if(out.some(x=>Math.max(x.offset,m.offset)<Math.min(x.offset+x.length,m.offset+m.length)))continue;
      out.push(m);
    }
    return out;
  }

  function renderSuggestions(matches,text){
    suggestionsBox.innerHTML='';
    if(!matches.length){
      proofStatus.textContent='Nenhuma correção importante encontrada.';
      proofStatus.className='proofread-status ok';
      return;
    }

    proofStatus.textContent=matches.length+' sugestão'+(matches.length>1?'ões':'')+' encontrada'+(matches.length>1?'s':'')+'.';
    proofStatus.className='proofread-status has-issues';

    matches.forEach((m,index)=>{
      const wrong=text.slice(m.offset,m.offset+m.length);
      const card=document.createElement('div');
      card.className='proof-suggestion';

      const info=document.createElement('div');
      info.className='proof-suggestion-info';

      const line=document.createElement('div');
      line.className='proof-suggestion-line';

      const bad=document.createElement('span');
      bad.className='proof-bad';
      bad.textContent=wrong||'trecho';

      const arrow=document.createElement('span');
      arrow.className='proof-arrow';
      arrow.textContent='→';

      line.appendChild(bad);

      if(m.replacements?.length){
        line.appendChild(arrow);
        const good=document.createElement('strong');
        good.className='proof-good';
        good.textContent=m.replacements[0];
        line.appendChild(good);
      }

      const desc=document.createElement('small');
      desc.textContent=m.message||'Sugestão de correção';

      info.append(line,desc);
      card.appendChild(info);

      if(m.replacements?.length){
        const actions=document.createElement('div');
        actions.className='proof-actions';

        m.replacements.slice(0,3).forEach(rep=>{
          const btn=document.createElement('button');
          btn.type='button';
          btn.className='proof-apply';
          btn.textContent=rep;
          btn.addEventListener('click',()=>applySuggestion(index,rep));
          actions.appendChild(btn);
        });

        const ignore=document.createElement('button');
        ignore.type='button';
        ignore.className='proof-ignore';
        ignore.textContent='Ignorar';
        ignore.addEventListener('click',()=>{
          lastMatches.splice(index,1);
          const current=getEditorText();
          renderHighlighted(current,lastMatches);
          renderSuggestions(lastMatches,current);
        });
        actions.appendChild(ignore);
        card.appendChild(actions);
      }

      suggestionsBox.appendChild(card);
    });
  }

  function applySuggestion(index,replacement){
    const m=lastMatches[index];
    if(!m)return;
    const text=getEditorText();
    const updated=text.slice(0,m.offset)+replacement+text.slice(m.offset+m.length);
    editor.textContent=updated;
    syncEditorToHidden();
    updateCounters();
    reviewText(true);
  }

  async function reviewText(force=false){
    const text=getEditorText();
    if(text.length<3){
      lastMatches=[];
      proofStatus.textContent='Comece a escrever para receber sugestões.';
      proofStatus.className='proofread-status';
      suggestionsBox.innerHTML='';
      return;
    }
    if(!force&&text===lastReviewedText)return;

    proofStatus.textContent='Revisando ortografia e gramática...';
    proofStatus.className='proofread-status checking';

    try{
      const {data,error}=await sb.functions.invoke('proofread',{body:{text}});
      if(error)throw error;

      const remote=Array.isArray(data?.matches)?data.matches:[];
      const local=localProperNounSuggestions(text);
      lastMatches=mergeMatches(remote,local);
      lastReviewedText=text;

      renderHighlighted(text,lastMatches);
      renderSuggestions(lastMatches,text);
    }catch(err){
      console.error(err);
      proofStatus.textContent='Não foi possível revisar automaticamente agora. O corretor nativo do navegador continua ativo.';
      proofStatus.className='proofread-status warning';
    }
  }

  title.addEventListener('input',()=>{
    updateCounters();
    clearTimeout(reviewTimer);
    reviewTimer=setTimeout(()=>reviewText(false),1500);
  });

  editor.addEventListener('input',()=>{
    syncEditorToHidden();
    updateCounters();
    clearTimeout(reviewTimer);
    reviewTimer=setTimeout(()=>reviewText(false),1400);
  });

  editor.addEventListener('paste',e=>{
    e.preventDefault();
    const text=(e.clipboardData||window.clipboardData).getData('text/plain');
    document.execCommand('insertText',false,text);
  });

  document.getElementById('organize-text').addEventListener('click',()=>{
    syncEditorToHidden();
    title.value=headlineCase(title.value);
    form.elements.location.value=normalizeSpaces(form.elements.location.value);
    form.elements.sourceCredit.value=normalizeSpaces(form.elements.sourceCredit.value);
    form.elements.photoAuthor.value=normalizeSpaces(form.elements.photoAuthor.value);
    form.elements.photoSource.value=normalizeSpaces(form.elements.photoSource.value);
    updateCounters();
    reviewText(true);
  });

  photoInput.addEventListener('change',()=>{
    const box=document.getElementById('selected-photos');
    const files=[...photoInput.files];
    box.innerHTML='';
    files.slice(0,10).forEach((file,index)=>{
      const card=document.createElement('div');
      card.className='selected-photo';
      const img=document.createElement('img');
      img.src=URL.createObjectURL(file);
      img.alt='Foto '+(index+1);
      const span=document.createElement('span');
      span.textContent=(index===0?'Foto principal • ':'')+file.name;
      card.append(img,span);
      box.appendChild(card);
    });
  });

  function setStep(step){
    document.querySelectorAll('[data-step-indicator]').forEach(el=>{
      el.classList.toggle('active',el.dataset.stepIndicator===String(step));
      el.classList.toggle('done',Number(el.dataset.stepIndicator)<step);
    });
  }

  function buildPreview(){
    syncEditorToHidden();
    const fd=new FormData(form);
    const files=[...photoInput.files];
    const cleanTitle=headlineCase(fd.get('title'));
    const cleanText=sentenceCase(fd.get('description'));

    title.value=cleanTitle;
    descriptionHidden.value=cleanText;
    editor.textContent=cleanText;

    document.getElementById('preview-ged').textContent=fd.get('ged')||'GER Nordeste 2';
    document.getElementById('preview-title').textContent=cleanTitle;

    const meta=[
      fd.get('date')?formatDate(fd.get('date')):'',
      normalizeSpaces(fd.get('location'))
    ].filter(Boolean).join(' • ');
    document.getElementById('preview-meta').textContent=meta;

    const body=document.getElementById('preview-body');
    body.innerHTML='';
    paragraphs(cleanText).forEach(p=>{
      const el=document.createElement('p');
      el.textContent=p;
      body.appendChild(el);
    });

    const coverWrap=document.getElementById('preview-cover-wrap');
    const cover=document.getElementById('preview-cover');
    if(files[0]){
      cover.src=URL.createObjectURL(files[0]);
      coverWrap.classList.remove('hidden');
    }else{
      coverWrap.classList.add('hidden');
      cover.removeAttribute('src');
    }

    const gallery=document.getElementById('preview-gallery');
    gallery.innerHTML='';
    files.slice(1,7).forEach(file=>{
      const img=document.createElement('img');
      img.src=URL.createObjectURL(file);
      img.alt='Foto do evento';
      gallery.appendChild(img);
    });

    const credits=[
      ['preview-source-row','preview-source',normalizeSpaces(fd.get('sourceCredit'))],
      ['preview-photo-author-row','preview-photo-author',normalizeSpaces(fd.get('photoAuthor'))],
      ['preview-photo-date-row','preview-photo-date',fd.get('photoDate')?formatDate(fd.get('photoDate')):''],
      ['preview-photo-source-row','preview-photo-source',normalizeSpaces(fd.get('photoSource'))]
    ];
    credits.forEach(([rowId,valueId,value])=>{
      const row=document.getElementById(rowId);
      document.getElementById(valueId).textContent=value;
      row.classList.toggle('hidden',!value);
    });
  }

  form.addEventListener('submit',e=>{
    e.preventDefault();
    syncEditorToHidden();

    if(!descriptionHidden.value.trim()){
      proofStatus.textContent='Digite o texto da matéria antes de continuar.';
      proofStatus.className='proofread-status warning';
      editor.focus();
      return;
    }

    if(!form.reportValidity())return;

    const files=[...photoInput.files];
    if(files.length>10){
      msg.textContent='Envie no máximo 10 fotos por publicação.';
      msg.classList.remove('hidden');
      return;
    }
    if(files.some(file=>file.size>8*1024*1024)){
      msg.textContent='Uma das imagens ultrapassa 8 MB.';
      msg.classList.remove('hidden');
      return;
    }
    msg.classList.add('hidden');

    buildPreview();
    formStep.classList.add('hidden');
    previewStep.classList.remove('hidden');
    successStep.classList.add('hidden');
    setStep(2);
    window.scrollTo({top:0,behavior:'smooth'});
  });

  document.getElementById('back-to-form').addEventListener('click',()=>{
    previewStep.classList.add('hidden');
    formStep.classList.remove('hidden');
    setStep(1);
    editor.textContent=descriptionHidden.value;
    reviewText(true);
    window.scrollTo({top:0,behavior:'smooth'});
  });

  document.getElementById('confirm-submit').addEventListener('click',async()=>{
    const button=document.getElementById('confirm-submit');
    syncEditorToHidden();
    const fd=new FormData(form);
    const files=[...photoInput.files];

    button.disabled=true;
    button.textContent='Enviando...';

    try{
      const {data:postId,error:submitError}=await sb.rpc('submit_public_post_v2',{
        p_title:headlineCase(fd.get('title')),
        p_ged_name:String(fd.get('ged')||''),
        p_event_date:fd.get('date')||null,
        p_location:normalizeSpaces(fd.get('location')),
        p_description:sentenceCase(fd.get('description')),
        p_sender_name:normalizeSpaces(fd.get('sender')),
        p_sender_email:String(fd.get('email')||'').trim(),
        p_sender_whatsapp:normalizeSpaces(fd.get('whatsapp')),
        p_source_credit:normalizeSpaces(fd.get('sourceCredit')),
        p_photo_author:normalizeSpaces(fd.get('photoAuthor')),
        p_photo_date:fd.get('photoDate')||null,
        p_photo_source:normalizeSpaces(fd.get('photoSource'))
      });

      if(submitError)throw submitError;

      let order=0;
      for(const file of files){
        const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
        const safeExt=['jpg','jpeg','png','webp'].includes(ext)?ext:'jpg';
        const path=postId+'/'+crypto.randomUUID()+'.'+safeExt;

        const {error:uploadError}=await sb.storage
          .from('submissions')
          .upload(path,file,{contentType:file.type,upsert:false});

        if(uploadError)throw uploadError;

        const {error:imgError}=await sb.rpc('register_submission_image',{
          p_post_id:postId,
          p_storage_path:path,
          p_sort_order:order++
        });

        if(imgError)throw imgError;
      }

      previewStep.classList.add('hidden');
      successStep.classList.remove('hidden');
      setStep(3);
      form.reset();
      editor.innerHTML='';
      lastMatches=[];
      suggestionsBox.innerHTML='';
      proofStatus.textContent='Comece a escrever para receber sugestões.';
      proofStatus.className='proofread-status';
      document.getElementById('selected-photos').innerHTML='';
      window.scrollTo({top:0,behavior:'smooth'});
    }catch(err){
      console.error(err);
      button.disabled=false;
      button.textContent='Concluir e enviar para análise';
      alert('Não foi possível enviar agora. '+(err.message||'Tente novamente.'));
      return;
    }

    button.disabled=false;
    button.textContent='Concluir e enviar para análise';
  });

  document.getElementById('new-submission').addEventListener('click',()=>{
    successStep.classList.add('hidden');
    formStep.classList.remove('hidden');
    setStep(1);
    updateCounters();
    window.scrollTo({top:0,behavior:'smooth'});
  });

  updateCounters();
});