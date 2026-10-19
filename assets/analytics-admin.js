(function(){
  function fmt(n){return Number(n||0).toLocaleString('pt-BR')}
  function safe(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function prettyPath(path){
    const p=String(path||'/').split('?')[0];
    const names={
      '/':'Início','/index.html':'Início','/ger.html':'GER NE2','/geds.html':'GEDs',
      '/noticias.html':'Notícias','/agenda.html':'Agenda','/formacao.html':'Formação',
      '/documentos.html':'Documentos','/galeria.html':'Galeria','/publicar.html':'Publique seu evento',
      '/contato.html':'Contato','/post.html':'Postagem'
    };
    return names[p]||p.replace(/^\//,'')||'Início';
  }

  async function loadAnalytics(){
    const msg=document.getElementById('analytics-message');
    try{
      if(msg){msg.classList.add('hidden');msg.textContent=''}
      const {data,error}=await window.mccSupabase.rpc('get_site_view_stats');
      if(error)throw error;
      const s=data||{};
      document.getElementById('analytics-total').textContent=fmt(s.total);
      document.getElementById('analytics-today').textContent=fmt(s.today);
      document.getElementById('analytics-unique-total').textContent=fmt(s.unique_total);
      document.getElementById('analytics-unique-today').textContent=fmt(s.unique_today);

      const days=Array.isArray(s.last_14_days)?s.last_14_days:[];
      const max=Math.max(1,...days.map(x=>Number(x.views||0)));
      const daysEl=document.getElementById('analytics-days');
      daysEl.innerHTML=days.length?days.map(x=>{
        const h=Math.max(6,Math.round(Number(x.views||0)/max*150));
        const d=new Date((x.day||'')+'T12:00:00');
        const label=Number.isNaN(d.getTime())?x.day:d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
        return '<div class="analytics-bar-item" title="'+fmt(x.views)+' visualizações • '+fmt(x.unique_visitors)+' únicos">'+
          '<strong>'+fmt(x.views)+'</strong>'+
          '<div class="analytics-bar-track"><i style="height:'+h+'px"></i></div>'+
          '<span>'+safe(label)+'</span></div>';
      }).join(''):'<p>Nenhum acesso registrado ainda.</p>';

      const pages=Array.isArray(s.by_page)?s.by_page:[];
      const pagesEl=document.getElementById('analytics-pages');
      pagesEl.innerHTML=pages.length?pages.map((x,i)=>
        '<div class="analytics-page-row"><span class="analytics-page-rank">'+(i+1)+'</span>'+
        '<div><strong>'+safe(prettyPath(x.path))+'</strong><small>'+safe(x.path)+'</small></div>'+
        '<div class="analytics-page-numbers"><b>'+fmt(x.views)+'</b><small>'+fmt(x.unique_visitors)+' únicos</small></div></div>'
      ).join(''):'<p>Nenhum acesso registrado ainda.</p>';
    }catch(err){
      console.error('Falha ao carregar analytics',err);
      if(msg){msg.textContent='Não foi possível carregar as visualizações agora.';msg.classList.remove('hidden')}
    }
  }

  function init(){
    const btn=document.querySelector('[data-section="analytics"]');
    if(btn)btn.addEventListener('click',()=>setTimeout(loadAnalytics,80));
    const refresh=document.getElementById('refresh-analytics');
    if(refresh)refresh.addEventListener('click',loadAnalytics);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();