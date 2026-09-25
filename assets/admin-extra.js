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

  addBackButtons();
  ensureGedEditor();
});