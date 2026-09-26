window.MCC_SUPABASE_URL='https://krupjfytxnndfjfwubmw.supabase.co';
window.MCC_SUPABASE_KEY='sb_publishable_1CRWbMPTKqxfTGnlKnhdjQ_DAdWPRtL';
window.mccSupabase = window.supabase.createClient(window.MCC_SUPABASE_URL, window.MCC_SUPABASE_KEY);

window.addEventListener('load',async()=>{
  const isAdmin=location.pathname.endsWith('/admin.html')||location.pathname.endsWith('admin.html');

  if(isAdmin){
    const s=document.createElement('script');
    s.src='assets/admin-extra.js';
    document.body.appendChild(s);
    return;
  }

  try{
    let visitorId=localStorage.getItem('mcc_visitor_id');
    if(!visitorId){
      visitorId=crypto.randomUUID();
      localStorage.setItem('mcc_visitor_id',visitorId);
    }

    const path=(location.pathname||'/')+(location.search||'');
    await window.mccSupabase.rpc('track_page_view',{
      p_path:path,
      p_session_id:visitorId
    });
  }catch(err){
    console.debug('Analytics indisponível',err);
  }
});

window.addEventListener('DOMContentLoaded',()=>{
  const path=location.pathname||'';
  if(path.endsWith('admin.html')||path.endsWith('configurar-admin.html')) return;
  if(document.querySelector('.site-developer-credit')) return;

  const credit=document.createElement('div');
  credit.className='site-developer-credit';
  credit.innerHTML='Desenvolvido por <strong>Diogo Eduardo da Luz Ferreira</strong> • UX/UI Designer &amp; Desenvolvedor Web - <strong>Luzvante Estúdio</strong>';
  document.body.appendChild(credit);
});
