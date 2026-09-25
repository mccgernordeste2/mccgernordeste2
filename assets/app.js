function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function fmtDate(v){if(!v)return'';const d=new Date(v+'T12:00:00');return d.toLocaleDateString('pt-BR')}
function postCard(n){return '<article class="card">'+(n.cover_url?'<a href="post.html?id='+encodeURIComponent(n.id)+'"><img src="'+esc(n.cover_url)+'" alt="" style="width:100%;height:190px;object-fit:cover"></a>':'<div class="placeholder">✦</div>')+'<div class="card-body"><span class="tag">'+esc(n.geds?.name||n.category||'GER NE2')+'</span><h3><a href="post.html?id='+encodeURIComponent(n.id)+'">'+esc(n.title)+'</a></h3><p>'+esc(n.summary||'')+'</p>'+(n.event_date?'<small>'+fmtDate(n.event_date)+'</small>':'')+'</div></article>'}
document.addEventListener('DOMContentLoaded',async()=>{
 const b=document.querySelector('.menu-btn'),m=document.querySelector('.mobile-nav');if(b&&m)b.addEventListener('click',()=>m.classList.toggle('open'));
 const sb=window.mccSupabase;if(!sb)return;
 const statsG=document.querySelector('[data-stat-geds]'),statsP=document.querySelector('[data-stat-posts]'),statsE=document.querySelector('[data-stat-events]');
 if(statsG||statsP||statsE){
  const todayStats=new Date().toISOString().slice(0,10);
  const [gCount,pCount,eCount]=await Promise.all([
   sb.from('geds').select('*',{count:'exact',head:true}).eq('active',true),
   sb.from('posts').select('*',{count:'exact',head:true}).eq('status','published'),
   sb.from('events').select('*',{count:'exact',head:true}).gte('event_date',todayStats)
  ]);
  if(statsG&&gCount.count!==null)statsG.textContent=gCount.count;
  if(statsP&&pCount.count!==null)statsP.textContent=pCount.count;
  if(statsE&&eCount.count!==null)statsE.textContent=eCount.count;
 }

 const nw=document.querySelector('[data-news-list]');
 if(nw){
  const {data:posts,error}=await sb.from('posts').select('id,title,category,summary,cover_url,event_date,published_at,geds(name)').eq('status','published').order('published_at',{ascending:false}).limit(18);
  if(!error&&posts?.length)nw.innerHTML=posts.map(postCard).join('');
 }
 const hwf=document.querySelector('[data-home-formation]');
 if(hwf){
  const {data:posts}=await sb.from('posts').select('id,title,category,summary,cover_url,event_date,published_at,geds(name)').eq('status','published').eq('category','Formação').order('published_at',{ascending:false}).limit(3);
  if(posts?.length)hwf.innerHTML=posts.map(postCard).join('');
 }
 const fw=document.querySelector('[data-formation-list]');
 if(fw){
  const {data:posts}=await sb.from('posts').select('id,title,category,summary,cover_url,event_date,published_at,geds(name)').eq('status','published').eq('category','Formação').order('published_at',{ascending:false}).limit(18);
  fw.innerHTML=posts?.length?posts.map(postCard).join(''):'<article class="card"><div class="card-body"><span class="tag">Formação</span><h3>Nenhum conteúdo publicado ainda</h3><p>Os materiais publicados pelo painel aparecerão aqui.</p></div></article>';
 }
 const ew=document.querySelector('[data-event-list]');
 if(ew){
  const today=new Date().toISOString().slice(0,10);
  const {data:events,error}=await sb.from('events').select('title,event_date,location').gte('event_date',today).order('event_date',{ascending:true}).limit(20);
  if(!error)ew.innerHTML=events?.length?events.map(x=>{const d=new Date(x.event_date+'T12:00:00'),mon=d.toLocaleDateString('pt-BR',{month:'short'}).replace('.','').toUpperCase(),day=String(d.getDate()).padStart(2,'0');return '<div class="event"><div class="datebox"><small>'+mon+'</small><strong>'+day+'</strong></div><div><h4>'+esc(x.title)+'</h4><p>'+esc(x.location||'Local a definir')+'</p></div><span>→</span></div>'}).join(''):'<div class="event"><div class="datebox"><small>—</small><strong>—</strong></div><div><h4>Nenhum evento cadastrado</h4><p>A agenda será atualizada pelo painel administrativo.</p></div><span>→</span></div>';
 }
 const dw=document.querySelector('[data-doc-list]');
 if(dw){
  const {data:docs}=await sb.from('documents').select('title,category,url,created_at').order('created_at',{ascending:false});
  dw.innerHTML=docs?.length?docs.map(d=>'<tr><td>'+esc(d.title)+'</td><td>'+esc(d.category||'—')+'</td><td>'+new Date(d.created_at).toLocaleDateString('pt-BR')+'</td><td><a class="btn blue" href="'+esc(d.url)+'" target="_blank" rel="noopener">Abrir</a></td></tr>').join(''):'<tr><td colspan="4">Nenhum documento publicado.</td></tr>';
 }
 const hgw=document.querySelector('[data-home-gallery]');
 if(hgw){
  const {data:imgs}=await sb.from('post_images').select('image_url,caption,posts!inner(title,status,geds(name))').eq('posts.status','published').neq('image_url','').order('created_at',{ascending:false}).limit(5);
  if(imgs?.length)hgw.innerHTML=imgs.map(i=>'<figure><img src="'+esc(i.image_url)+'" alt="'+esc(i.caption||i.posts?.title||'')+'"><figcaption><strong>'+esc(i.posts?.title||'Galeria')+'</strong>'+(i.posts?.geds?.name?'<br>'+esc(i.posts.geds.name):'')+'</figcaption></figure>').join('');
 }
 const gw=document.querySelector('[data-gallery-list]');
 if(gw){
  const {data:imgs}=await sb.from('post_images').select('image_url,caption,posts!inner(title,status,geds(name))').eq('posts.status','published').neq('image_url','').order('created_at',{ascending:false}).limit(30);
  gw.innerHTML=imgs?.length?imgs.map(i=>'<article class="card"><img src="'+esc(i.image_url)+'" alt="'+esc(i.caption||i.posts?.title||'')+'" style="width:100%;height:220px;object-fit:cover"><div class="card-body"><span class="tag">'+esc(i.posts?.geds?.name||'GER NE2')+'</span><h3>'+esc(i.posts?.title||'Galeria')+'</h3><p>'+esc(i.caption||'')+'</p></div></article>').join(''):'<article class="card"><div class="placeholder">▣</div><div class="card-body"><h3>Nenhuma foto publicada ainda</h3><p>As imagens aprovadas aparecerão automaticamente aqui.</p></div></article>';
 }
});