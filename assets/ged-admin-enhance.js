(()=>{
  const sb=window.mccSupabase;
  if(!sb)return;

  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

  function addField(grid,name,label,type='text',full=false){
    if(grid.querySelector('[name="'+name+'"]'))return;
    const wrap=document.createElement('div');
    wrap.className='field'+(full?' full':'');
    const lab=document.createElement('label');lab.textContent=label;
    const input=document.createElement('input');input.name=name;input.type=type;
    wrap.append(lab,input);grid.appendChild(wrap);
  }

  function init(){
    const form=document.getElementById('ged-form');
    const list=document.getElementById('ged-list');
    if(!form||!list)return;

    const grid=form.querySelector('.form-grid');
    addField(grid,'vice_coordinator','Vice-coordenador(a)','text',true);
    addField(grid,'coordinator_whatsapp','WhatsApp do coordenador','text');
    addField(grid,'vice_whatsapp','WhatsApp do vice','text');
    addField(grid,'email','E-mail principal do GED','email',true);
    addField(grid,'sectors_count','Quantidade de setores','number');

    let editingId=null;
    let cancel=document.getElementById('cancel-ged-edit');
    if(!cancel){
      cancel=document.createElement('button');
      cancel.type='button';cancel.id='cancel-ged-edit';cancel.className='btn secondary hidden';cancel.textContent='Cancelar edição';
      form.querySelector('.form-actions')?.appendChild(cancel);
    }

    function reset(){
      editingId=null;form.reset();
      const b=form.querySelector('button[type="submit"]');if(b)b.textContent='Cadastrar GED';
      cancel.classList.add('hidden');
    }
    cancel.onclick=reset;

    function editGed(id){
      const g=(window.state?.geds||state?.geds||[]).find(x=>x.id===id);
      if(!g)return;
      editingId=id;
      ['name','state','coordinator','vice_coordinator','coordinator_whatsapp','vice_whatsapp','email','sectors_count'].forEach(k=>{
        if(form.elements[k])form.elements[k].value=g[k]??'';
      });
      const b=form.querySelector('button[type="submit"]');if(b)b.textContent='Salvar alterações';
      cancel.classList.remove('hidden');
      form.scrollIntoView({behavior:'smooth',block:'start'});
    }

    function getData(){
      try{return window.state?.geds||state?.geds||[]}catch{return[]}
    }

    function decorate(){
      const data=getData();
      list.querySelectorAll('.item').forEach(item=>{
        const del=item.querySelector('.delete');if(!del)return;
        const match=(del.getAttribute('onclick')||'').match(/deleteGed\('([^']+)'\)/);if(!match)return;
        const id=match[1],g=data.find(x=>x.id===id);if(!g)return;
        const info=item.firstElementChild;
        if(info){
          info.innerHTML='<h4>'+esc(g.name)+'</h4>'+
            '<p><strong>Estado:</strong> '+esc(g.state||'—')+'</p>'+
            '<p><strong>Coordenador(a):</strong> '+esc(g.coordinator||'A confirmar')+'</p>'+
            '<p><strong>Vice-coordenador(a):</strong> '+esc(g.vice_coordinator||'A confirmar')+'</p>'+
            '<p><strong>WhatsApp coordenador:</strong> '+esc(g.coordinator_whatsapp||'—')+' &nbsp; <strong>WhatsApp vice:</strong> '+esc(g.vice_whatsapp||'—')+'</p>'+
            '<p><strong>E-mail:</strong> '+esc(g.email||'—')+' &nbsp; <strong>Setores:</strong> '+(g.sectors_count===null||g.sectors_count===undefined?'—':esc(g.sectors_count))+'</p>';
        }
        let actions=item.querySelector('.item-actions');
        if(!actions){actions=document.createElement('div');actions.className='item-actions';del.parentNode.insertBefore(actions,del);actions.appendChild(del)}
        if(!actions.querySelector('.edit-ged-btn')){
          const edit=document.createElement('button');edit.type='button';edit.className='btn secondary edit-ged-btn';edit.textContent='Editar';edit.onclick=()=>editGed(id);actions.insertBefore(edit,actions.firstChild);
        }
      });
    }

    form.onsubmit=async e=>{
      e.preventDefault();
      const fd=new FormData(form);
      const payload={
        name:String(fd.get('name')||'').trim(),
        state:String(fd.get('state')||'').trim(),
        coordinator:String(fd.get('coordinator')||'').trim()||null,
        vice_coordinator:String(fd.get('vice_coordinator')||'').trim()||null,
        coordinator_whatsapp:String(fd.get('coordinator_whatsapp')||'').trim()||null,
        vice_whatsapp:String(fd.get('vice_whatsapp')||'').trim()||null,
        email:String(fd.get('email')||'').trim()||null,
        sectors_count:fd.get('sectors_count')===''?null:Number(fd.get('sectors_count'))
      };
      const q=editingId?sb.from('geds').update(payload).eq('id',editingId):sb.from('geds').insert(payload);
      const {error}=await q;if(error){alert(error.message);return}
      reset();
      if(typeof loadData==='function')await loadData();
      setTimeout(decorate,80);
    };

    const obs=new MutationObserver(()=>decorate());obs.observe(list,{childList:true,subtree:true});
    decorate();
  }

  if(document.readyState==='complete')setTimeout(init,120);else window.addEventListener('load',()=>setTimeout(init,120));
})();
