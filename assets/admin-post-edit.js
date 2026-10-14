(()=>{
  function init(){
    const form=document.getElementById('news-form');
    const list=document.getElementById('news-list');
    const editor=document.getElementById('post-editor');
    if(!form||!list||!editor||typeof state==='undefined'||typeof sb==='undefined')return;

    let editingPublishedId=null;
    const originalSubmit=form.onsubmit;

    function setGed(name){
      const sel=form.querySelector('[name="ged"]');
      if(!sel)return;
      [...sel.options].forEach(o=>o.selected=o.text===name);
    }

    function resetPublishedEdit(){
      editingPublishedId=null;
      form.reset();
      editor.innerHTML='';
      const submit=form.querySelector('button[type="submit"]');
      if(submit)submit.textContent='Publicar';
      const cancel=document.getElementById('cancel-post-edit');
      if(cancel)cancel.classList.add('hidden');
      const title=document.querySelector('#section-posts .admin-panel h2');
      if(title)title.textContent='Nova postagem';
    }

    function ensureCancel(){
      let btn=document.getElementById('cancel-post-edit');
      if(btn)return btn;
      btn=document.createElement('button');
      btn.type='button';
      btn.id='cancel-post-edit';
      btn.className='btn secondary';
      btn.textContent='Cancelar edição';
      btn.addEventListener('click',resetPublishedEdit);
      form.querySelector('.form-actions')?.appendChild(btn);
      return btn;
    }

    function startEdit(id){
      const p=state.posts.find(x=>x.id===id);
      if(!p)return;
      editingPublishedId=id;
      state.editingPostId=null;
      form.title.value=p.title||'';
      form.category.value=p.category||'GER NE2';
      setGed(p.geds?.name||'GER Nordeste 2');
      form.date.value=p.event_date||'';
      form.location.value=p.location||'';
      form.author.value=p.author_name||'';
      form.summary.value=p.summary||'';
      form.caption.value=p.cover_caption||'';
      editor.innerHTML=p.body_html||'';
      const submit=form.querySelector('button[type="submit"]');
      if(submit)submit.textContent='Salvar alterações';
      ensureCancel().classList.remove('hidden');
      const title=document.querySelector('#section-posts .admin-panel h2');
      if(title)title.textContent='Editar postagem';
      if(typeof showSection==='function')showSection('posts');
      form.scrollIntoView({behavior:'smooth',block:'start'});
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

    async function uploadGallery(postId,files){
      let order=100;
      for(const file of files.slice(0,20)){
        const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
        const path=postId+'/'+crypto.randomUUID()+'.'+ext;
        const {error}=await sb.storage.from('post-media').upload(path,file,{contentType:file.type,upsert:false});
        if(error)continue;
        const {data:pub}=sb.storage.from('post-media').getPublicUrl(path);
        await sb.from('post_images').insert({post_id:postId,image_url:pub.publicUrl,storage_path:path,source_bucket:'post-media',sort_order:order++});
      }
    }

    form.onsubmit=async e=>{
      if(!editingPublishedId){
        return originalSubmit?.call(form,e);
      }
      e.preventDefault();
      const fd=new FormData(form);
      const gedName=String(fd.get('ged')||'');
      const current=state.posts.find(x=>x.id===editingPublishedId);
      const payload={
        title:String(fd.get('title')||'').trim(),
        category:fd.get('category')||null,
        ged_id:state.geds.find(g=>g.name===gedName)?.id||null,
        event_date:fd.get('date')||null,
        location:String(fd.get('location')||'').trim()||null,
        author_name:String(fd.get('author')||'').trim()||null,
        summary:String(fd.get('summary')||'').trim()||null,
        body_html:editor.innerHTML,
        cover_caption:String(fd.get('caption')||'').trim()||null,
        status:'published',
        published_at:current?.published_at||new Date().toISOString(),
        updated_at:new Date().toISOString()
      };

      const coverFile=form.querySelector('input[name="cover"]')?.files?.[0];
      try{
        if(coverFile){
          const url=await uploadCover(editingPublishedId,coverFile);
          if(url)payload.cover_url=url;
        }
        const {error}=await sb.from('posts').update(payload).eq('id',editingPublishedId);
        if(error){alert('Não foi possível salvar: '+error.message);return}
        const gallery=[...(form.querySelector('input[name="gallery"]')?.files||[])];
        if(gallery.length)await uploadGallery(editingPublishedId,gallery);
        resetPublishedEdit();
        await loadData();
      }catch(err){
        alert('Não foi possível salvar a postagem: '+(err?.message||err));
      }
    };

    function decorate(){
      const items=[...list.querySelectorAll('.item')];
      items.forEach((item,index)=>{
        if(item.querySelector('.edit-post-btn'))return;
        const p=state.posts[index];
        if(!p)return;
        const del=item.querySelector('.delete');
        const actions=document.createElement('div');
        actions.className='item-actions';
        const edit=document.createElement('button');
        edit.type='button';
        edit.className='btn secondary edit-post-btn';
        edit.textContent='Editar';
        edit.addEventListener('click',()=>startEdit(p.id));
        if(del){
          del.parentNode.insertBefore(actions,del);
          actions.append(edit,del);
        }else{
          actions.appendChild(edit);
          item.appendChild(actions);
        }
      });
    }

    const observer=new MutationObserver(decorate);
    observer.observe(list,{childList:true,subtree:true});
    decorate();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
