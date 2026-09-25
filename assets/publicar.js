document.addEventListener('DOMContentLoaded',()=>{
  const sb=window.mccSupabase;
  const form=document.getElementById('publicar-form');
  const msg=document.getElementById('submit-message');
  const formStep=document.getElementById('submission-form-step');
  const previewStep=document.getElementById('submission-preview-step');
  const successStep=document.getElementById('submission-success-step');

  if(!sb){
    msg.textContent='Não foi possível conectar ao sistema.';
    msg.classList.remove('hidden');
    return;
  }

  const title=form.elements.title;
  const description=form.elements.description;
  const photoInput=form.elements.photos;

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

  function updateCounters(){
    document.getElementById('title-counter').textContent=title.value.length+'/120 caracteres';
    document.getElementById('description-counter').textContent=description.value.length+' caracteres';
  }

  title.addEventListener('input',updateCounters);
  description.addEventListener('input',updateCounters);
  updateCounters();

  document.getElementById('organize-text').addEventListener('click',()=>{
    title.value=headlineCase(title.value);
    description.value=sentenceCase(description.value);
    form.elements.location.value=normalizeSpaces(form.elements.location.value);
    form.elements.sourceCredit.value=normalizeSpaces(form.elements.sourceCredit.value);
    form.elements.photoAuthor.value=normalizeSpaces(form.elements.photoAuthor.value);
    form.elements.photoSource.value=normalizeSpaces(form.elements.photoSource.value);
    updateCounters();
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
    const fd=new FormData(form);
    const files=[...photoInput.files];
    const cleanTitle=headlineCase(fd.get('title'));
    const cleanText=sentenceCase(fd.get('description'));

    title.value=cleanTitle;
    description.value=cleanText;

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
    window.scrollTo({top:0,behavior:'smooth'});
  });

  document.getElementById('confirm-submit').addEventListener('click',async()=>{
    const button=document.getElementById('confirm-submit');
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
});