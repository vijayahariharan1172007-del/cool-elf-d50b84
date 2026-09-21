const {supabase,getMailer,createEmailVerification,ok,fail,getRuntimeSetting,getRuntimeSecret}=require('../lib/server');
module.exports=async(req,res)=>{try{
  if(req.method!=='POST')return fail(res,405,'Method not allowed');
  const email=String(req.body?.email||'').trim().toLowerCase();if(!(await getRuntimeSetting('gmail_verification_enabled',true)))return fail(res,503,'Gmail verification is currently disabled by Master Admin.');
  const since=new Date(Date.now()-10*60*1000).toISOString();
  const recent=await supabase.from('user_auth_events').select('id',{count:'exact',head:true}).eq('destination',email).eq('kind','email_verification_request').gt('created_at',since);
  if((recent.count||0)>=3)return fail(res,429,'Too many Gmail verification requests. Try again later.');
  if(!/^[a-z0-9._%+-]+@gmail\.com$/.test(email))return fail(res,400,'Valid Gmail address required');
  const token=await createEmailVerification(email);
  const mailer=await getMailer(); if(!mailer)return fail(res,503,'Gmail is not configured');
  const base=(String(await getRuntimeSetting('public_base_url',process.env.PUBLIC_BASE_URL||''))).replace(/\/$/,'');
  if(!base)return fail(res,500,'PUBLIC_BASE_URL is not configured');
  const link=`${base}/api/verify-email-link?token=${encodeURIComponent(token)}`;
  await mailer.sendMail({from:`EXCELSIOR'26 <${String(await getRuntimeSecret('gmail_sender',process.env.GMAIL_SENDER||''))}>`,to:email,subject:"EXCELSIOR'26 — Verify your Gmail",html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;background:#090d0b;color:#fff"><h1 style="color:#7dff91">EXCELSIOR'26</h1><h2>VERIFY YOUR GMAIL</h2><p>Click the button below to confirm that you can access this Gmail account. No OTP is required.</p><p><a href="${link}" style="display:inline-block;padding:14px 22px;background:#79ff8c;color:#061008;text-decoration:none;font-weight:700;border-radius:4px">VERIFY GMAIL</a></p><p style="color:#aaa">This link expires in 15 minutes and can be used once.</p></div>`,text:`Verify your EXCELSIOR'26 Gmail here: ${link}\nThis link expires in 15 minutes and can be used once.`});
  await supabase.from('user_auth_events').insert({destination:email,kind:'email_verification_request',success:true});
  return ok(res,{ok:true});
}catch(e){console.error(e);return fail(res,500,'Unable to send Gmail verification link')}};
