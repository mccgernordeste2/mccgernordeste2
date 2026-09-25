window.MCC_SUPABASE_URL='https://krupjfytxnndfjfwubmw.supabase.co';
window.MCC_SUPABASE_KEY='sb_publishable_1CRWbMPTKqxfTGnlKnhdjQ_DAdWPRtL';
window.mccSupabase = window.supabase.createClient(window.MCC_SUPABASE_URL, window.MCC_SUPABASE_KEY);
window.addEventListener('load',()=>{if(location.pathname.endsWith('/admin.html')||location.pathname.endsWith('admin.html')){const s=document.createElement('script');s.src='assets/admin-extra.js';document.body.appendChild(s);}});
