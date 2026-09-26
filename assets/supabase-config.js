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
  credit.innerHTML='Desenvolvido por <strong>Diogo Eduardo da Luz Ferreira</strong> • UX/UI Designer &amp; Desenvolvedor Web - <a href="https://www.instagram.com/luzvanteestudio?stkn=MTdxNnVmY29lNmxxcA==" target="_blank" rel="noopener noreferrer"><strong>Luzvante Estúdio</strong></a>';
  document.body.appendChild(credit);
});

window.addEventListener('DOMContentLoaded',async()=>{
  try{
    const {data:{session}}=await window.mccSupabase.auth.getSession();
    if(!session)return;

    const {data:profile,error}=await window.mccSupabase
      .from('profiles')
      .select('full_name,role,photo_url')
      .eq('id',session.user.id)
      .maybeSingle();

    if(error||!profile)return;

    const labels={
      administrador:'Administrador',
      coordenador_vice:'Coordenador ou Vice',
      colaborador_cursilhista:'Colaborador Cursilhista'
    };

    const fullName=(profile.full_name||session.user.user_metadata?.full_name||session.user.email||'Usuário').trim();
    const roleLabel=labels[profile.role]||'Equipe do portal';

    const badge=document.createElement('div');
    badge.className='portal-login-status portal-login-nav';
    badge.setAttribute('aria-label','Usuário autenticado no portal');

    const initials=fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0,2)
      .map(x=>x.charAt(0).toUpperCase())
      .join('');

    const avatar=document.createElement('div');
    avatar.className='portal-login-avatar';

    if(profile.photo_url){
      const img=document.createElement('img');
      img.src=profile.photo_url;
      img.alt='Foto de '+fullName;
      avatar.appendChild(img);
    }else{
      avatar.textContent=initials||'U';
    }

    const textWrap=document.createElement('div');
    textWrap.className='portal-login-text';

    const name=document.createElement('strong');
    name.textContent=fullName;

    const role=document.createElement('span');
    role.textContent=roleLabel;

    textWrap.append(name,role);
    badge.append(avatar,textWrap);

    const desktopAdmin=document.querySelector('.desktop-nav .admin-link');
    const mobileAdmin=document.querySelector('.mobile-nav .admin-link');
    const desktopNav=document.querySelector('.desktop-nav');

    if(desktopAdmin)desktopAdmin.classList.add('hidden');
    if(mobileAdmin)mobileAdmin.classList.add('hidden');

    if(desktopNav){
      desktopNav.appendChild(badge);
    }else{
      badge.classList.add('portal-login-floating');
      document.body.appendChild(badge);
    }
  }catch(err){
    console.debug('Identificação de usuário indisponível',err);
  }
});
