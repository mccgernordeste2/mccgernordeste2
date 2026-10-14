document.addEventListener('DOMContentLoaded',()=>{
  function addBackButtons(){
    document.querySelectorAll('.admin-section').forEach(section=>{
      if(section.id==='section-dashboard'||section.querySelector('.admin-back-row')) return;
      const row=document.createElement('div');
      row.className='admin-back-row';
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='btn admin-back-btn';
      btn.textContent='← Voltar ao Dashboard';
      btn.addEventListener('click',()=>showSection('dashboard'));
      row.appendChild(btn);
      section.prepend(row);
    });
  }

  function makeDashboardStatsClickable(){
    const targets=[
      ['stat-news','posts','Abrir e editar postagens'],
      ['stat-pending','pending','Abrir publicações aguardando aprovação'],
      ['stat-events','events','Abrir agenda de eventos'],
      ['stat-geds','geds','Abrir cadastro de GEDs']
    ];
    targets.forEach(([id,section,label])=>{
      const value=document.getElementById(id);
      const card=value?.closest('.stat');
      if(!card||card.dataset.dashboardLink==='1')return;
      card.dataset.dashboardLink='1';
      card.setAttribute('role','button');
      card.setAttribute('tabindex','0');
      card.setAttribute('aria-label',label);
      card.title=label;
      card.style.cursor='pointer';
      card.style.transition='transform .16s ease, box-shadow .16s ease, border-color .16s ease';
      card.addEventListener('mouseenter',()=>{card.style.transform='translateY(-2px)';card.style.boxShadow='0 10px 24px rgba(0,69,140,.10)';card.style.borderColor='rgba(10,115,215,.35)'});
      card.addEventListener('mouseleave',()=>{card.style.transform='';card.style.boxShadow='';card.style.borderColor=''});
      card.addEventListener('click',()=>showSection(section));
      card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showSection(section)}});
    });
  }

  function ensureGedEditor(){
    const form=document.getElementById('ged-form');
    const list=document.getElementById('ged-list');
    if(!form||!list) return;

    const originalSubmit=form.onsubmit;
    let editingId=null;

    function resetEdit(){
      editingId=null;
      form.reset();
      const submit=form.querySelector('button[type="submit"]');
      if(submit) submit.textContent='Cadastrar GED';
      const cancel=document.getElementById('cancel-ged-edit');
      if(cancel) cancel.classList.add('hidden');
    }

    async function startEdit(id){
      const ged=state.geds.find(g=>g.id===id);
      if(!ged) return;
      editingId=id;
      form.name.value=ged.name||'';
      form.state.value=ged.state||'Alagoas';
      form.coordinator.value=ged.coordinator||'';

      const submit=form.querySelector('button[type="submit"]');
      if(submit) submit.textContent='Salvar alterações';

      let cancel=document.getElementById('cancel-ged-edit');
      if(!cancel){
        cancel=document.createElement('button');
        cancel.type='button';
        cancel.id='cancel-ged-edit';
        cancel.className='btn secondary';
        cancel.textContent='Cancelar edição';
        cancel.addEventListener('click',resetEdit);
        form.querySelector('.form-actions')?.appendChild(cancel);
      }
      cancel.classList.remove('hidden');
      form.scrollIntoView({behavior:'smooth',block:'center'});
    }

    function decorate(){
      list.querySelectorAll('.item').forEach(item=>{
        if(item.querySelector('.edit-ged-btn')) return;
        const del=item.querySelector('.delete');
        if(!del) return;
        const m=del.getAttribute('onclick')||'';
        const match=m.match(/deleteGed\('([^']+)'\)/);
        if(!match) return;
        const id=match[1];

        let actions=item.querySelector('.item-actions');
        if(!actions){
          actions=document.createElement('div');
          actions.className='item-actions';
          del.parentNode.insertBefore(actions,del);
          actions.appendChild(del);
        }
        const edit=document.createElement('button');
        edit.type='button';
        edit.className='edit-ged-btn';
        edit.textContent='Editar';
        edit.addEventListener('click',()=>startEdit(id));
        actions.insertBefore(edit,actions.firstChild);
      });
    }

    form.onsubmit=async e=>{
      if(!editingId){
        if(originalSubmit) return originalSubmit.call(form,e);
        return;
      }
      e.preventDefault();
      const fd=new FormData(form);
      const payload={
        name:fd.get('name'),
        state:fd.get('state'),
        coordinator:fd.get('coordinator')||null
      };
      const {error}=await sb.from('geds').update(payload).eq('id',editingId);
      if(error){alert(error.message);return}
      resetEdit();
      await loadData();
      setTimeout(decorate,80);
    };

    const observer=new MutationObserver(()=>decorate());
    observer.observe(list,{childList:true,subtree:true});
    decorate();
  }

  async function loadSidebarUser(){
    try{
      const {data:{user}}=await sb.auth.getUser();
      if(!user)return;

      const {data:profile}=await sb
        .from('profiles')
        .select('full_name,role,photo_url')
        .eq('id',user.id)
        .maybeSingle();

      const labels={
        administrador:'Administrador',
        coordenador_vice:'Coordenador ou Vice',
        colaborador_cursilhista:'Colaborador Cursilhista'
      };

      const fullName=(profile?.full_name||user.user_metadata?.full_name||user.email||'Usuário').trim();
      const roleLabel=labels[profile?.role]||'Equipe do portal';

      const nameEl=document.getElementById('sidebar-user-name');
      const roleEl=document.getElementById('sidebar-user-role');
      const initialsEl=document.getElementById('sidebar-user-initials');
      const photoEl=document.getElementById('sidebar-user-photo');

      if(nameEl)nameEl.textContent=fullName;
      if(roleEl)roleEl.textContent=roleLabel;

      const initials=fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0,2)
        .map(x=>x.charAt(0).toUpperCase())
        .join('');

      if(initialsEl)initialsEl.textContent=initials||'U';

      if(photoEl&&profile?.photo_url){
        photoEl.src=profile.photo_url;
        photoEl.classList.remove('hidden');
        if(initialsEl)initialsEl.classList.add('hidden');
      }
    }catch(err){
      console.debug('Perfil lateral indisponível',err);
    }
  }

  async function loadAnalytics(){
    const dash=document.getElementById('section-dashboard');
    if(!dash||dash.querySelector('.analytics-panel')) return;

    const panel=document.createElement('div');
    panel.className='admin-panel analytics-panel';
    panel.innerHTML=
      '<div class="analytics-head"><div><div class="section-label">Audiência</div><h2>Visualizações do portal</h2><p>Contagem anônima a partir da ativação deste recurso.</p></div><button type="button" class="btn secondary" id="refresh-analytics">Atualizar</button></div>'+
      '<div class="analytics-stats">'+
        '<div class="analytics-stat"><span>Visualizações totais</span><strong id="analytics-total">—</strong></div>'+
        '<div class="analytics-stat"><span>Visitantes únicos</span><strong id="analytics-unique">—</strong></div>'+
        '<div class="analytics-stat"><span>Visualizações hoje</span><strong id="analytics-today">—</strong></div>'+
        '<div class="analytics-stat"><span>Visitantes hoje</span><strong id="analytics-visitors-today">—</strong></div>'+
      '</div>'+
      '<div class="analytics-pages"><h3>Páginas mais acessadas</h3><div id="analytics-pages-list"><p>Carregando...</p></div></div>';

    dash.appendChild(panel);

    async function refresh(){
      const list=document.getElementById('analytics-pages-list');
      const {data,error}=await sb.rpc('get_site_analytics');
      if(error||!data||data.error){
        list.innerHTML='<p>Não foi possível carregar as estatísticas agora.</p>';
        return;
      }

      document.getElementById('analytics-total').textContent=Number(data.total_views||0).toLocaleString('pt-BR');
      document.getElementById('analytics-unique').textContent=Number(data.unique_visitors||0).toLocaleString('pt-BR');
      document.getElementById('analytics-today').textContent=Number(data.views_today||0).toLocaleString('pt-BR');
      document.getElementById('analytics-visitors-today').textContent=Number(data.visitors_today||0).toLocaleString('pt-BR');

      const pages=Array.isArray(data.top_pages)?data.top_pages:[];
      list.innerHTML=pages.length
        ? pages.map((p,i)=>'<div class="analytics-page-row"><span><b>'+(i+1)+'.</b> '+escapeAnalytics(p.path)+'</span><strong>'+Number(p.views||0).toLocaleString('pt-BR')+'</strong></div>').join('')
        : '<p>Ainda não há visualizações registradas.</p>';
    }

    function escapeAnalytics(value){
      return String(value||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
    }

    document.getElementById('refresh-analytics')?.addEventListener('click',refresh);
    await refresh();
  }

  addBackButtons();
  makeDashboardStatsClickable();
  ensureGedEditor();
  loadSidebarUser();
  loadAnalytics();
});

/* Recuperação de senha no login administrativo */
(()=>{
  function addRecoveryLink(){
    const form=document.getElementById('login-form');
    if(!form||form.querySelector('.forgot-password-link'))return;
    const actions=form.querySelector('.form-actions');
    if(!actions)return;
    const wrap=document.createElement('div');
    wrap.style.textAlign='center';
    wrap.style.marginTop='12px';
    const link=document.createElement('a');
    link.href='recuperar-senha.html';
    link.className='forgot-password-link';
    link.textContent='Esqueci minha senha';
    link.style.color='var(--blue2)';
    link.style.fontWeight='800';
    link.style.fontSize='13px';
    wrap.appendChild(link);
    actions.insertAdjacentElement('afterend',wrap);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addRecoveryLink);
  else addRecoveryLink();
})();