document.addEventListener('DOMContentLoaded',async()=>{
  const sb=window.mccSupabase;
  const title=document.getElementById('ged-state-title');
  const list=document.getElementById('ged-state-list');
  const states=[...document.querySelectorAll('.map-state')];
  let data=[];

  const {data:geds,error}=await sb.from('geds').select('*').eq('active',true).order('name');
  if(error){
    console.error('Erro ao carregar GEDs:',error);
    list.innerHTML='<div class="ged-detail-card"><h3>Não foi possível carregar os GEDs</h3><p>Tente novamente em alguns instantes.</p></div>';
    return;
  }

  data=geds||[];

  function value(v,fallback='Não informado'){
    return v===null||v===undefined||String(v).trim()===''?fallback:String(v).trim();
  }

  function contactLink(type,v){
    if(!v)return '<span class="ged-empty">Não informado</span>';
    const safe=escapeHtml(v);
    if(type==='email')return '<a href="mailto:'+safe+'">'+safe+'</a>';
    if(type==='whatsapp'){
      const digits=String(v).replace(/\D/g,'');
      const phone=digits.startsWith('55')?digits:'55'+digits;
      return '<a href="https://wa.me/'+phone+'" target="_blank" rel="noopener">'+safe+'</a>';
    }
    return safe;
  }

  function personBlock(label,name,email,whatsapp){
    return '<div class="ged-person-block">'+
      '<div class="ged-person-role">'+escapeHtml(label)+'</div>'+
      '<strong class="ged-person-name">'+escapeHtml(value(name,'A confirmar'))+'</strong>'+
      '<div class="ged-contact-line"><span>✉</span><div><small>E-mail</small>'+contactLink('email',email)+'</div></div>'+
      '<div class="ged-contact-line"><span>◉</span><div><small>WhatsApp</small>'+contactLink('whatsapp',whatsapp)+'</div></div>'+
    '</div>';
  }

  function gedCard(g){
    const sectors=Number.isFinite(Number(g.sector_count))&&Number(g.sector_count)>=0?Number(g.sector_count):null;
    return '<article class="ged-detail-card">'+
      '<div class="ged-detail-head">'+
        '<div><span class="ged-state-badge">'+escapeHtml(g.state||'')+'</span><h3>'+escapeHtml(g.name)+'</h3></div>'+
        '<div class="ged-sector-count"><strong>'+(sectors===null?'—':sectors)+'</strong><span>'+(sectors===1?'setor':'setores')+'</span></div>'+
      '</div>'+
      '<div class="ged-leadership-grid">'+
        personBlock('Coordenador(a)',g.coordinator,g.coordinator_email,g.coordinator_whatsapp)+
        personBlock('Vice-coordenador(a)',g.vice_coordinator,g.vice_email,g.vice_whatsapp)+
      '</div>'+
    '</article>';
  }

  function render(state){
    title.textContent=state;
    states.forEach(s=>s.classList.toggle('active',s.dataset.state===state));
    const items=data.filter(g=>g.state===state);
    list.innerHTML=items.length
      ?items.map(gedCard).join('')
      :'<div class="ged-detail-card"><h3>Nenhum GED cadastrado</h3><p>Informações a confirmar.</p></div>';
  }

  states.forEach(s=>{
    s.addEventListener('click',()=>render(s.dataset.state));
    s.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){
        e.preventDefault();
        render(s.dataset.state);
      }
    });
  });

  const requested=new URLSearchParams(location.search).get('state');
  const valid=['Alagoas','Paraíba','Pernambuco','Rio Grande do Norte'];
  render(valid.includes(requested)?requested:'Alagoas');
});

function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
