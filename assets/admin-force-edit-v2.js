(()=>{
  const sb=window.mccSupabase;
  if(!sb)return;
  let editingId=null;
  let currentPost=null;

  function byName(form,name){return form.querySelector('[name="'+name+'"]')}

  function ensureEditUI(){
    const form=document.getElementById('news-form');
    if(!form)return;
    const coverInput=byName(form,'cover');
    const coverField=coverInput?.closest('.field');
    if(coverField&&!document.getElementById('forced-current-cover')){
      const box=document.createElement('div');
      box.id='forced-current-cover';
      box.className='hidden';
      box.style.cssText='margin:10px 0 14px;padding:12px;border:1px solid #dce6ef;border-radius:12px;background:#f8fbfe';
      box.innerHTML='<strong style="display:block;margin-bottom:8px;color:#0b2d59">Imagem de capa atual</strong><img id="forced-current-cover-img" alt="Capa atual" style="max-width:320px;width:100%;height:auto;border-radius:10px;display:block"><small style="display:block;margin-top:8px;color:#6a7b90">Escolha uma nova imagem abaixo para substituir a capa.</small>';
      coverField.insertBefore(box,coverInput.closest('.upload-box'));
    }
    if(!document.getElementById('forced-cancel-edit')){
      const actions=form.querySelector('.form-actions');
      const btn=document.createElement('button');
      btn.type='button';btn.id='forced-cancel-edit';btn.className='btn secondary hidden';btn.textContent='Cancelar edição';
      btn.onclick=()=>resetEdit();
      actions?.appendChild(btn);
    }
  }

  async function loadPublished(){
    const {data,error}=await sb.from('posts').select('id,title,category,event_date,location,author_name,summary,body_html,cover_caption,cover_url,published_at,ged_id,geds(name)').eq('status','published').order('published_at',{ascending:false});
    if(error)return [];
    return data||[];
  }

  function fillForm(p){
    const form=document.getElementById('news-form');
    const editor=document.getElementById('post-editor');
    if(!form||!editor)return;
    byName(form,'title').value=p.title||'';
    byName(form,'category').value=p.category||'GER NE2';
    const ged=byName(form,'ged');
    if(ged){[...ged.options].forEach(o=>o.selected=o.text===((p.geds&&p.geds.name)||'GER Nordeste 2'))}
    byName(form,'date').value=p.event_date||'';
    byName(form,'location').value=p.location||'';
    byName(form,'author').value=p.author_name||'';
    byName(form,'summary').value=p.summary||'';
    byName(form,'caption').value=p.cover_caption||'';
    editor.innerHTML=p.body_html||'';
    form.querySelector('button[type="submit"]').textContent='Salvar alterações';
    document.querySelector('#section-posts .admin-panel h2').textContent='Editar postagem';
    document.getElementById('forced-cancel-edit')?.classList.remove('hidden');
    const box=document.getElementById('forced-current-cover'),img=document.getElementById('forced-current-cover-img');
    if(box&&img){
      if(p.cover_url){img.src=p.cover_url;box.classList.remove('hidden')}else box.classList.add('hidden');
    }
    if(typeof window.showSection==='function')window.showSection('posts');
    setTimeout(()=>form.scrollIntoView({behavior:'smooth',block:'start'}),50);
  }

  async function startEdit(id){
    const {data,error}=await sb.from('posts').select('id,title,category,event_date,location,author_name,summary,body_html,cover_caption,cover_url,published_at,ged_id,geds(name)').eq('id',id).single();
    if(error||!data){alert('Não foi possível abrir a postagem para edição.');return}
    editingId=id;currentPost=data;ensureEditUI();fillForm(data);
  }

  function resetEdit(){
    editingId=null;currentPost=null;
    const form=document.getElementById('news-form'),editor=document.getElementById('post-editor');
    form?.reset();if(editor)editor.innerHTML='';
    const submit=form?.querySelector('button[type="submit"]');if(submit)submit.textContent='Publicar';
    const h=document.querySelector('#section-posts .admin-panel h2');if(h)h.textContent='Nova postagem';
    document.getElementById('forced-cancel-edit')?.classList.add('hidden');
    document.getElementById('forced-current-cover')?.classList.add('hidden');
  }

  async function uploadCover(postId,file){
    if(!file)return null;
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
    const path=postId+'/cover-'+crypto.randomUUID()+'.'+ext;
    const {error}=await sb.storage.from('post-media').upload(path,file,{contentType:file.type,upsert:false});
    if(error)throw error;
    const {data:pub}=sb.storage.from('post-media').getPublicUrl(path);
    return pub?.publicUrl||null;
  }

  function bindSubmit(){
    const form=document.getElementById('news-form');
    if(!form||form.dataset.forceEditBound==='1')return;
    form.dataset.forceEditBound='1';
    form.addEventListener('submit',async e=>{
      if(!editingId)return;
      e.preventDefault();e.stopImmediatePropagation();
      const editor=document.getElementById('post-editor');
      const fd=new FormData(form);
      const gedName=String(fd.get('ged')||'');
      let gedId=null;
      if(gedName&&gedName!=='GER Nordeste 2'){
        const {data:g}=await sb.from('geds').select('id').eq('name',gedName).maybeSingle();gedId=g?.id||null;
      }
      const payload={
        title:String(fd.get('title')||'').trim(),category:fd.get('category')||null,ged_id:gedId,
        event_date:fd.get('date')||null,location:String(fd.get('location')||'').trim()||null,
        author_name:String(fd.get('author')||'').trim()||null,summary:String(fd.get('summary')||'').trim()||null,
        body_html:editor?.innerHTML||'',cover_caption:String(fd.get('caption')||'').trim()||null,
        status:'published',published_at:currentPost?.published_at||new Date().toISOString(),updated_at:new Date().toISOString()
      };
      const file=byName(form,'cover')?.files?.[0];
      try{
        if(file){const url=await uploadCover(editingId,file);if(url)payload.cover_url=url}
        const {error}=await sb.from('posts').update(payload).eq('id',editingId);
        if(error)throw error;
        alert('Postagem atualizada com sucesso.');
        resetEdit();
        if(typeof window.loadData==='function')await window.loadData();
        decorateList();
      }catch(err){alert('Não foi possível salvar: '+(err?.message||err))}
    },true);
  }

  async function decorateList(){
    const list=document.getElementById('news-list');
    if(!list)return;
    const posts=await loadPublished();
    const items=[...list.querySelectorAll('.item')];
    items.forEach((item,i)=>{
      const p=posts[i];if(!p)return;
      let actions=item.querySelector('.forced-post-actions');
      if(!actions){
        actions=document.createElement('div');actions.className='forced-post-actions';actions.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap';
        const del=item.querySelector('.delete');
        if(del){item.insertBefore(actions,del);actions.appendChild(del)}else item.appendChild(actions);
      }
      if(!actions.querySelector('.forced-edit-btn')){
        const b=document.createElement('button');b.type='button';b.className='btn secondary forced-edit-btn';b.textContent='Editar';
        b.onclick=()=>startEdit(p.id);
        actions.insertBefore(b,actions.firstChild);
      }
    });
  }

  function init(){
    ensureEditUI();bindSubmit();decorateList();
    const list=document.getElementById('news-list');
    if(list){new MutationObserver(()=>decorateList()).observe(list,{childList:true,subtree:true})}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
