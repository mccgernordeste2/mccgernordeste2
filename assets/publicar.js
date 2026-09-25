document.addEventListener('DOMContentLoaded',()=>{
 const sb=window.mccSupabase,form=document.getElementById('publicar-form'),msg=document.getElementById('submit-message');
 if(!sb){msg.textContent='Não foi possível conectar ao sistema.';msg.classList.remove('hidden');return}
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  const button=form.querySelector('button[type="submit"]'),fd=new FormData(form),files=[...form.querySelector('input[name="photos"]').files];
  if(files.length>10){msg.textContent='Envie no máximo 10 fotos por publicação.';msg.classList.remove('hidden');return}
  button.disabled=true;button.textContent='Enviando...';msg.classList.add('hidden');
  try{
   const {data:postId,error:submitError}=await sb.rpc('submit_public_post',{
    p_title:String(fd.get('title')||'').trim(),
    p_ged_name:String(fd.get('ged')||''),
    p_event_date:fd.get('date')||null,
    p_location:String(fd.get('location')||'').trim(),
    p_description:String(fd.get('description')||'').trim(),
    p_sender_name:String(fd.get('sender')||'').trim(),
    p_sender_email:String(fd.get('email')||'').trim(),
    p_sender_whatsapp:String(fd.get('whatsapp')||'').trim(),
    p_photo_author:String(fd.get('photoAuthor')||'').trim()
   });
   if(submitError)throw submitError;
   let order=0;
   for(const file of files){
    if(file.size>8*1024*1024)throw new Error('Uma das imagens ultrapassa 8 MB.');
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
    const safeExt=['jpg','jpeg','png','webp'].includes(ext)?ext:'jpg';
    const path=postId+'/'+crypto.randomUUID()+'.'+safeExt;
    const {error:uploadError}=await sb.storage.from('submissions').upload(path,file,{contentType:file.type,upsert:false});
    if(uploadError)throw uploadError;
    const {error:imgError}=await sb.rpc('register_submission_image',{p_post_id:postId,p_storage_path:path,p_sort_order:order++});
    if(imgError)throw imgError;
   }
   msg.textContent='Envio recebido com sucesso. O conteúdo ficará aguardando análise, correção e aprovação do administrador.';
   msg.classList.remove('hidden');form.reset();
  }catch(err){
   console.error(err);msg.textContent='Não foi possível enviar agora. Verifique os dados e tente novamente. Detalhe: '+(err.message||'erro inesperado');msg.classList.remove('hidden');
  }finally{button.disabled=false;button.textContent='Enviar para análise'}
 });
});