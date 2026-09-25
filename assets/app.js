function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function fmtDate(v){if(!v)return'';const d=new Date(v+'T12:00:00');return d.toLocaleDateString('pt-BR')}
document.addEventListener('DOMContentLoaded',async()=>{
 const b=document.querySelector('.menu-btn'),m=document.querySelector('.mobile-nav');if(b&&m)b.addEventListener('click',()=>m.classList.toggle('open'));
 const sb=window.mccSupabase;if(!sb)return;
 const nw=document.querySelector('[data-news-list]'),ew=document.querySelector('[data-event-list]');
 if(nw){
  const {data:posts,error}=await sb.from('posts').select('id,title,category,summary,cover_url,event_date,published_at,geds(name)').eq('status','published').order('published_at',{ascending:false}).limit(12);
  if(!error&&posts?.length)nw.innerHTML=posts.map(n=>'<article class="card">'+(n.cover_url?'<img src="'+esc(n.cover_url)+'" alt="" style="width:100%;height:190px;object-fit:cover">':'<div class="placeholder">✦</div>')+'<div class="card-body"><span class="tag">'+esc(n.geds?.name||n.category||'GER NE2')+'</span><h3>'+esc(n.title)+'</h3><p>'+esc(n.summary||'')+'</p>'+(n.event_date?'<small>'+fmtDate(n.event_date)+'</small>':'')+'</div></article>').join('');
 }
 if(ew){
  const today=new Date().toISOString().slice(0,10);
  const {data:events,error}=await sb.from('events').select('title,event_date,location').gte('event_date',today).order('event_date',{ascending:true}).limit(8);
  if(!error&&events?.length)ew.innerHTML=events.map(x=>{const d=new Date(x.event_date+'T12:00:00'),mon=d.toLocaleDateString('pt-BR',{month:'short'}).replace('.','').toUpperCase(),day=String(d.getDate()).padStart(2,'0');return '<div class="event"><div class="datebox"><small>'+mon+'</small><strong>'+day+'</strong></div><div><h4>'+esc(x.title)+'</h4><p>'+esc(x.location||'Local a definir')+'</p></div><span>→</span></div>'}).join('');
 }
});