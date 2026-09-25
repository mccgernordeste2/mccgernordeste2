document.addEventListener('DOMContentLoaded',()=>{
 const sb=window.mccSupabase,form=document.getElementById('publicar-form'),msg=document.getElementById('submit-message');
 if(!sb){msg.textContent='Não foi possível conectar ao sistema.';msg.classList.remove('hidden');return}
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  const button=form.querySelector('button[type="submit"]'),fd=new FormData(form);
  button.disabled=true;button.textContent='Enviando...';msg.classList.add('hidden');
  try{
   const gedName=String(fd.get('ged')||'');
   const {data:ged,error:gedError}=await sb.from('geds').select('id').eq('name',gedName).maybeSingle();
   if(gedError)throw gedError;
   const payload={
    title:String(fd.get('title')||'').trim(),
    category:'Evento',
    ged_id:ged?.id||null,
    event_date:fd.get('date')||null,
    summary:String(fd.get('description')||'').trim(),
    body_html:null,
    status:'review',
    submitted_by_name:String(fd.get('sender')||'').trim(),
    submitted_by_email:String(fd.get('email')||'').trim(),
    submitted_by_whatsapp:String(fd.get('whatsapp')||'').trim(),
    photo_author:String(fd.get('photoAuthor')||'').trim(),
    source_type:'public'
   };
   const {data:post,error:postError}=await sb.from('posts').insert(payload).select('id').single();
   if(postError)throw postError;
   const files=[...form.querySelector('input[name="photos"]').files];
   let order=0;
   for(const file of files){
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
    const safeExt=['jpg','jpeg','png','webp'].includes(ext)?ext:'jpg';
    const path=post.id+'/'+crypto.randomUUID()+'.'+safeExt;
    const {error:uploadError}=await sb.storage.from('submissions').upload(path,file,{contentType:file.type,upsert:false});
    if(uploadError)throw uploadError;
    const {error:imgError}=await sb.from('post_images').insert({post_id:post.id,image_url:'',storage_path:path,source_bucket:'submissions',caption:'',sort_order:order++});
    if(imgError)throw imgError;
   }
   msg.textContent='Envio recebido com sucesso. O conteúdo ficará aguardando análise, correção e aprovação do administrador.';
   msg.classList.remove('hidden');form.reset();
  }catch(err){
   console.error(err);msg.textContent='Não foi possível enviar agora. Verifique os dados e tente novamente. Detalhe: '+(err.message||'erro inesperado');msg.classList.remove('hidden');
  }finally{button.disabled=false;button.textContent='Enviar para análise'}
 });
});