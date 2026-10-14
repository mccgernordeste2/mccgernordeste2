(()=>{
  let editingId=null;
  let currentPost=null;

  function getSb(){return window.mccSupabase||null}
  function getForm(){return document.getElementById('news-form')}
  function getList(){return document.getElementById('news-list')}
  function getEditor(){return document.getElementById('post-editor')}

  function ensureCancel(){
    const form=getForm();
    if(!form)return null;
    let btn=document.getElementById('cancel-post-edit');
    if(btn)return btn;
    btn=document.createElement('button');
    btn.type='button';
    btn.id='cancel-post-edit';
    btn.className='btn secondary';
    btn.textContent='Cancelar edição';
    btn.addEventListener('click',resetEdit);
    form.querySelector('.form-actions')?.appendChild(btn);
    return btn;
  }

  function resetEdit(){
    const form=getForm(),editor=getEditor();
    editingId=null;
    currentPost=null;
    if(form)form.reset();
    if(editor)editor.innerHTML='';
    const submit=form?.querySelector('button[type="submit"]');
    if(submit)submit.textContent='Publicar';
    const cancel=document.getElementById('cancel-post-edit');
    if(cancel)cancel.classList.add('hidden');
    const h2=document.querySelector('#section-posts .admin-panel h2');
    if(h2)h2.textContent='Nova postagem';
    document.getElementById('current-cover-preview')?.remove();
  }

  function setGed(name){
    const sel=getForm()?.querySelector('[name="ged"]');
    if(!sel)return;
    [...sel.options].forEach(o=>{o.selected=o.text===name});
  }

  function showCoverPreview(url){
    const form=getForm();
    const input=form?.querySelector('input[name="cover"]');
    const box=input?.closest('.upload-box');
    if(!box)return;
    document.getElementById('current-cover-preview')?.remove();
    const wrap=document.createElement('div');
    wrap.id='current-cover-preview';
    wrap.style.marginBottom='12px';
    wrap.innerHTML=url
      ? '<div style="font-size:12px;font-weight:800;color:#0b2d59;margin-bottom:7px">Imagem de capa atual</div><img src="'+String(url).replace(/"/g,'&quot;')+'" alt="Capa atual" style="width:min(340px,100%);max-height:190px;object-fit:cover;border-radius:12px;border:1px solid #dce6ef"><p style="margin:7px 0 0;font-size:12px;color:#6a7b90">Escolha um novo arquivo abaixo somente se quiser substituir esta capa.</p>'
      : '<div style="font-size:12px;font-weight:800;color:#0b2d59;margin-bottom:7px">Esta postagem ainda não possui imagem de capa.</div><p style="margin:0 0 8px;font-size:12px;color:#6a7b90">Escolha uma imagem abaixo para adicionar a capa.</p>';
    box.parentNode.insertBefore(wrap,box);
  }

  async function startEdit(id){
    const sb=getSb(),form=getForm(),editor=getEditor();
    if(!sb||!form||!editor)return;
    const {data:p,error}=await sb.from('posts').select('*,geds(name)').eq('id',id).single();
    if(error||!p){alert('Não foi possível abrir esta postagem para edição.');return}
    editingId=id;
    currentPost=p;
    form.title.value=p.title||'';
    form.category.value=p.category||'GER NE2';
    setGed(p.geds?.name||'GER Nordeste 2');
    form.date.value=p.event_date||'';
    form.location.value=p.location||'';
    form.author.value=p.author_name||'';
    form.summary.value=p.summary||'';
    form.caption.value=p.cover_caption||'';
    editor.innerHTML=p.body_html||'';
    showCoverPreview(p.cover_url||'');
    const submit=form.querySelector('button[type="submit"]');
    if(submit)submit.textContent='Salvar alterações';
    ensureCancel()?.classList.remove('hidden');
    const h2=document.querySelector('#section-posts .admin-panel h2');
    if(h2)h2.textContent='Editar postagem';
    if(typeof showSection==='function')showSection('posts');
    form.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function uploadCover(postId,file){
    if(!file)return null;
    const sb=getSb();
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
    const path=postId+'/cover-'+crypto.randomUUID()+'.'+ext;
    const {error}=await sb.storage.from('post-media').upload(path,file,{contentType:file.type||'image/jpeg',upsert:false});
    if(error)throw error;
    const {data:pub}=sb.storage.from('post-media').getPublicUrl(path);
    return pub?.publicUrl||null;
  }

  async function saveEdit(e){
    if(!editingId)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const sb=getSb(),form=getForm(),editor=getEditor();
    if(!sb||!form||!editor)return;
    const fd=new FormData(form);
    const gedName=String(fd.get('ged')||'');
    let gedId=null;
    if(gedName&&gedName!=='GER Nordeste 2'){
      const {data:g}=await sb.from('geds').select('id').eq('name',gedName).maybeSingle();
      gedId=g?.id||null;
    }
    const payload={
      title:String(fd.get('title')||'').trim(),
      category:fd.get('category')||null,
      ged_id:gedId,
      event_date:fd.get('date')||null,
      location:String(fd.get('location')||'').trim()||null,
      author_name:String(fd.get('author')||'').trim()||null,
      summary:String(fd.get('summary')||'').trim()||null,
      body_html:editor.innerHTML,
      cover_caption:String(fd.get('caption')||'').trim()||null,
      status:'published',
      published_at:currentPost?.published_at||new Date().toISOString(),
      updated_at:new Date().toISOString()
    };
    const submit=form.querySelector('button[type="submit"]');
    const oldText=submit?.textContent;
    if(submit){submit.disabled=true;submit.textContent='Salvando...'}
    try{
      const cover=form.querySelector('input[name="cover"]')?.files?.[0];
      if(cover){
        const url=await uploadCover(editingId,cover);
        if(url)payload.cover_url=url;
      }
      const {error}=await sb.from('posts').update(payload).eq('id',editingId);
      if(error)throw error;
      alert('Postagem atualizada com sucesso.');
      resetEdit();
      if(typeof loadData==='function')await loadData();
      else location.reload();
    }catch(err){
      alert('Não foi possível salvar: '+(err?.message||err));
      if(submit){submit.disabled=false;submit.textContent=oldText||'Salvar alterações'}
    }
  }

  function decorate(){
    const list=getList();
    if(!list)return;
    list.querySelectorAll('.item').forEach(item=>{
      if(item.querySelector('.edit-post-btn'))return;
      const del=item.querySelector('.delete');
      if(!del)return;
      const match=(del.getAttribute('onclick')||'').match(/deletePost\('([^']+)'\)/);
      if(!match)return;
      const id=match[1];
      let actions=item.querySelector('.item-actions');
      if(!actions){
        actions=document.createElement('div');
        actions.className='item-actions';
        actions.style.display='flex';
        actions.style.gap='8px';
        actions.style.alignItems='center';
        del.parentNode.insertBefore(actions,del);
        actions.appendChild(del);
      }
      const edit=document.createElement('button');
      edit.type='button';
      edit.className='btn secondary edit-post-btn';
      edit.textContent='Editar';
      edit.style.border='1px solid #dce6ef';
      edit.addEventListener('click',()=>startEdit(id));
      actions.insertBefore(edit,actions.firstChild);
    });
  }

  function init(){
    const form=getForm(),list=getList();
    if(!form||!list)return;
    form.addEventListener('submit',saveEdit,true);
    const observer=new MutationObserver(decorate);
    observer.observe(list,{childList:true,subtree:true});
    decorate();
    setTimeout(decorate,300);
    setTimeout(decorate,1200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
