const sb=window.mccSupabase;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let state={geds:[],posts:[],pending:[],events:[],docs:[],editingPostId:null};

function showSection(n){
 document.querySelectorAll('.admin-section').forEach(x=>x.classList.add('hidden'));
 document.getElementById('section-'+n)?.classList.remove('hidden');
 document.querySelectorAll('.sidebar nav button').forEach(b=>b.classList.toggle('active',b.dataset.section===n));
 if(n==='pending'||n==='dashboard')loadData();
}
window.showSection=showSection;

function showLogin(message=''){
 document.getElementById('login-view').classList.remove('hidden');
 document.getElementById('admin-view').classList.add('hidden');
 if(message)document.getElementById('login-message').innerHTML=message;
}
function showAdmin(){
 document.getElementById('login-view').classList.add('hidden');
 document.getElementById('admin-view').classList.remove('hidden');
}
async function ensureAdmin(session){
 if(!session)return false;
 let {data:profile}=await sb.from('profiles').select('id,role,full_name').eq('id',session.user.id).maybeSingle();
 if(profile&&['admin','editor'].includes(profile.role))return true;
 const {data:available}=await sb.rpc('admin_setup_available');
 if(available){
  const name=session.user.user_metadata?.full_name||session.user.email?.split('@')[0]||'Administrador';
  const {error}=await sb.rpc('claim_first_admin',{p_full_name:name});
  if(!error)return true;
 }
 await sb.auth.signOut();
 return false;
}

async function loadData(){
 const [{data:geds},{data:posts},{data:pending},{data:events},{data:docs}]=await Promise.all([
  sb.from('geds').select('*').order('state').order('name'),
  sb.from('posts').select('*,geds(name),post_images(*)').eq('status','published').order('published_at',{ascending:false}),
  sb.from('posts').select('*,geds(name),post_images(*)').in('status',['review','draft']).eq('source_type','public').order('created_at',{ascending:false}),
  sb.from('events').select('*,geds(name)').order('event_date',{ascending:true}),
  sb.from('documents').select('*').order('created_at',{ascending:false})
 ]);
 state.geds=geds||[];state.posts=posts||[];state.pending=pending||[];state.events=events||[];state.docs=docs||[];
 renderAll();
}
function renderAll(){
 const id=x=>document.getElementById(x);
 if(id('stat-news'))id('stat-news').textContent=state.posts.length;
 if(id('stat-pending'))id('stat-pending').textContent=state.pending.length;
 if(id('stat-events'))id('stat-events').textContent=state.events.length;
 if(id('stat-geds'))id('stat-geds').textContent=state.geds.length;
 if(id('news-list'))id('news-list').innerHTML=state.posts.length?state.posts.map(p=>'<div class="item"><div><span class="status-badge status-published">Publicado</span><h4>'+esc(p.title)+'</h4><p>'+esc(p.geds?.name||p.category||'GER NE2')+' • '+esc(p.author_name||'')+'</p></div><button class="delete" onclick="deletePost(\''+p.id+'\')">Excluir</button></div>').join(''):'<p>Nenhuma postagem publicada.</p>';
 if(id('event-list'))id('event-list').innerHTML=state.events.length?state.events.map(x=>'<div class="item"><div><h4>'+esc(x.title)+'</h4><p>'+esc(x.event_date)+' • '+esc(x.location||'')+'</p></div><button class="delete" onclick="deleteEvent(\''+x.id+'\')">Excluir</button></div>').join(''):'<p>Nenhum evento cadastrado.</p>';
 if(id('ged-list'))id('ged-list').innerHTML=state.geds.length?state.geds.map(x=>'<div class="item"><div><h4>'+esc(x.name)+'</h4><p>'+esc(x.state)+' • '+esc(x.coordinator||'Coordenação a confirmar')+'</p></div><button class="delete" onclick="deleteGed(\''+x.id+'\')">Excluir</button></div>').join(''):'<p>Nenhum GED cadastrado.</p>';
 if(id('doc-list'))id('doc-list').innerHTML=state.docs.length?state.docs.map(x=>'<div class="item"><div><h4>'+esc(x.title)+'</h4><p>'+esc(x.category||'')+' • '+esc(x.url||'')+'</p></div><button class="delete" onclick="deleteDoc(\''+x.id+'\')">Excluir</button></div>').join(''):'<p>Nenhum documento cadastrado.</p>';
 renderPending();
}
async function signedSubmissionUrl(path){
 const {data}=await sb.storage.from('submissions').createSignedUrl(path,1800);
 return data?.signedUrl||'';
}
async function renderPending(){
 const w=document.getElementById('pending-list');if(!w)return;
 if(!state.pending.length){w.innerHTML='<p>Nenhuma publicação aguardando aprovação.</p>';return}
 w.innerHTML='';
 for(const p of state.pending){
  const wrap=document.createElement('div');wrap.className='item';wrap.style.alignItems='flex-start';
  let thumb='';
  const first=p.post_images?.[0];
  if(first?.storage_path){const url=await signedSubmissionUrl(first.storage_path);if(url)thumb='<img src="'+esc(url)+'" alt="" style="width:120px;height:90px;object-fit:cover;border-radius:10px;margin-top:8px">'}
  wrap.innerHTML='<div><span class="status-badge status-pending">'+(p.status==='draft'?'Em revisão':'Aguardando análise')+'</span><h4>'+esc(p.title)+'</h4><p>'+esc(p.geds?.name||'')+' • '+esc(p.event_date||'')+' • Enviado por '+esc(p.submitted_by_name||'')+'</p><p>'+esc(p.summary||'')+'</p>'+thumb+'</div><div class="review-actions"><button class="btn secondary" onclick="editSubmission(\''+p.id+'\')">Corrigir</button><button class="btn success" onclick="approvePost(\''+p.id+'\')">Aprovar e publicar</button><button class="btn warn" onclick="markReview(\''+p.id+'\')">Em revisão</button><button class="btn danger" onclick="rejectPost(\''+p.id+'\')">Recusar</button></div>';
  w.appendChild(wrap);
 }
}
async function deletePost(id){if(!confirm('Excluir esta postagem?'))return;await sb.from('posts').delete().eq('id',id);loadData()}
async function deleteEvent(id){if(!confirm('Excluir este evento?'))return;await sb.from('events').delete().eq('id',id);loadData()}
async function deleteGed(id){if(!confirm('Excluir este GED?'))return;await sb.from('geds').delete().eq('id',id);loadData()}
async function deleteDoc(id){if(!confirm('Excluir este documento?'))return;await sb.from('documents').delete().eq('id',id);loadData()}
window.deletePost=deletePost;window.deleteEvent=deleteEvent;window.deleteGed=deleteGed;window.deleteDoc=deleteDoc;

async function moveImagesToPublic(post){
 let firstUrl=post.cover_url||null;
 for(const img of (post.post_images||[])){
  if(img.source_bucket!=='submissions'||!img.storage_path)continue;
  const {data:blob,error:downErr}=await sb.storage.from('submissions').download(img.storage_path);if(downErr)continue;
  const ext=img.storage_path.split('.').pop()||'jpg';
  const newPath=post.id+'/'+crypto.randomUUID()+'.'+ext;
  const {error:upErr}=await sb.storage.from('post-media').upload(newPath,blob,{contentType:blob.type||'image/jpeg',upsert:false});if(upErr)continue;
  const {data:pub}=sb.storage.from('post-media').getPublicUrl(newPath);
  const url=pub?.publicUrl||'';
  await sb.from('post_images').update({image_url:url,storage_path:newPath,source_bucket:'post-media'}).eq('id',img.id);
  await sb.storage.from('submissions').remove([img.storage_path]);
  if(!firstUrl)firstUrl=url;
 }
 return firstUrl;
}
async function approvePost(id){
 const post=state.pending.find(x=>x.id===id);if(!post)return;
 const cover=await moveImagesToPublic(post);
 const {error}=await sb.from('posts').update({status:'published',published_at:new Date().toISOString(),cover_url:cover}).eq('id',id);
 if(error){alert('Não foi possível publicar: '+error.message);return}loadData()
}
async function markReview(id){await sb.from('posts').update({status:'draft'}).eq('id',id);loadData()}
async function rejectPost(id){await sb.from('posts').update({status:'rejected'}).eq('id',id);loadData()}
window.approvePost=approvePost;window.markReview=markReview;window.rejectPost=rejectPost;

function setGedSelect(name){
 const sel=document.querySelector('#news-form [name="ged"]');if(!sel)return;
 [...sel.options].forEach(o=>o.selected=o.text===name);
}
function editSubmission(id){
 const p=state.pending.find(x=>x.id===id);if(!p)return;
 state.editingPostId=id;
 const f=document.getElementById('news-form');
 f.title.value=p.title||'';f.category.value=p.category||'Evento';setGedSelect(p.geds?.name||'');f.date.value=p.event_date||'';f.location.value=p.location||'';f.author.value=p.submitted_by_name||'';f.summary.value=p.summary||'';f.caption.value=p.photo_author||'';
 document.getElementById('post-editor').innerHTML=p.body_html||esc(p.summary||'');
 showSection('posts');
 const submit=f.querySelector('button[type="submit"]');submit.textContent='Salvar correções';
}
window.editSubmission=editSubmission;

function slugify(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)+'-'+Date.now().toString(36)}
function gedIdByName(name){return state.geds.find(g=>g.name===name)?.id||null}

document.addEventListener('DOMContentLoaded',async()=>{
 const login=document.getElementById('login-view'),admin=document.getElementById('admin-view'),msg=document.getElementById('login-message');
 const pw=document.getElementById('admin-password');document.getElementById('toggle-password').onclick=()=>{pw.type=pw.type==='password'?'text':'password'};
 const {data:{session}}=await sb.auth.getSession();
 if(session&&await ensureAdmin(session)){showAdmin();await loadData()}else showLogin();
 document.getElementById('login-form').onsubmit=async ev=>{
  ev.preventDefault();const fd=new FormData(ev.target);msg.textContent='Entrando...';
  const {data,error}=await sb.auth.signInWithPassword({email:String(fd.get('email')||'').trim(),password:String(fd.get('password')||'')});
  if(error){msg.textContent='E-mail ou senha inválidos.';return}
  if(await ensureAdmin(data.session)){showAdmin();await loadData()}else showLogin('Este usuário não possui permissão administrativa. <a href="configurar-admin.html">Configurar primeiro administrador</a>.');
 };
 document.getElementById('logout-btn').onclick=async()=>{await sb.auth.signOut();location.reload()};
 document.querySelectorAll('.sidebar nav button').forEach(b=>b.onclick=()=>showSection(b.dataset.section));
 document.querySelectorAll('[data-cmd]').forEach(b=>b.onclick=()=>document.execCommand(b.dataset.cmd,false,null));
 const editor=document.getElementById('post-editor'),newsForm=document.getElementById('news-form');
 document.getElementById('preview-post').onclick=()=>{const fd=new FormData(newsForm),p=document.getElementById('post-preview');p.innerHTML='<span class="tag">'+esc(fd.get('category'))+'</span><h2>'+esc(fd.get('title'))+'</h2><p>'+esc(fd.get('summary'))+'</p><div>'+editor.innerHTML+'</div>';p.classList.remove('hidden')};
 newsForm.onsubmit=async e=>{
  e.preventDefault();
  const fd=new FormData(newsForm),gedName=String(fd.get('ged')||''),payload={
   title:String(fd.get('title')||'').trim(),
   slug:slugify(fd.get('title')),
   category:fd.get('category')||null,
   ged_id:gedIdByName(gedName),
   event_date:fd.get('date')||null,
   location:String(fd.get('location')||'').trim()||null,
   author_name:String(fd.get('author')||'').trim(),
   summary:String(fd.get('summary')||'').trim(),
   body_html:editor.innerHTML,
   cover_caption:String(fd.get('caption')||'').trim(),
   status:'published',
   published_at:new Date().toISOString(),
   source_type:'admin'
  };
  const {data:{user}}=await sb.auth.getUser();payload.created_by=user?.id||null;
  let postId=null;
  if(state.editingPostId){
   postId=state.editingPostId;
   delete payload.slug;delete payload.source_type;delete payload.created_by;
   payload.status='draft';payload.published_at=null;
   const {error}=await sb.from('posts').update(payload).eq('id',postId);
   if(error){alert(error.message);return}
   state.editingPostId=null;newsForm.querySelector('button[type="submit"]').textContent='Publicar';
  }else{
   const {data:post,error}=await sb.from('posts').insert(payload).select('id').single();
   if(error){alert(error.message);return}
   postId=post.id;
  }
  const coverFile=newsForm.querySelector('input[name="cover"]').files[0];
  if(coverFile){
   const ext=(coverFile.name.split('.').pop()||'jpg').toLowerCase(),path=postId+'/cover-'+crypto.randomUUID()+'.'+ext;
   const {error:upErr}=await sb.storage.from('post-media').upload(path,coverFile,{contentType:coverFile.type,upsert:false});
   if(!upErr){const {data:pub}=sb.storage.from('post-media').getPublicUrl(path);await sb.from('posts').update({cover_url:pub.publicUrl}).eq('id',postId)}
  }
  const galleryFiles=[...newsForm.querySelector('input[name="gallery"]').files].slice(0,20);
  let order=100;
  for(const file of galleryFiles){
   const ext=(file.name.split('.').pop()||'jpg').toLowerCase(),path=postId+'/'+crypto.randomUUID()+'.'+ext;
   const {error:upErr}=await sb.storage.from('post-media').upload(path,file,{contentType:file.type,upsert:false});
   if(upErr)continue;
   const {data:pub}=sb.storage.from('post-media').getPublicUrl(path);
   await sb.from('post_images').insert({post_id:postId,image_url:pub.publicUrl,storage_path:path,source_bucket:'post-media',sort_order:order++});
  }
  newsForm.reset();editor.innerHTML='';await loadData()
 };
 document.getElementById('event-form').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target);const {error}=await sb.from('events').insert({title:fd.get('title'),event_date:fd.get('date'),location:fd.get('location')});if(error)alert(error.message);else{e.target.reset();loadData()}};
 document.getElementById('ged-form').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target);const {error}=await sb.from('geds').insert({name:fd.get('name'),state:fd.get('state'),coordinator:fd.get('coordinator')||null});if(error)alert(error.message);else{e.target.reset();loadData()}};
 document.getElementById('doc-form').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target);const {error}=await sb.from('documents').insert({title:fd.get('title'),category:fd.get('category')||null,url:fd.get('url')});if(error)alert(error.message);else{e.target.reset();loadData()}};
});