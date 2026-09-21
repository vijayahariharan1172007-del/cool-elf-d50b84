const {supabase,signProof,verifyProof,ok,fail}=require('../lib/server');
function masterPayload(data){return {masterId:data.master_id,name:data.full_name,email:data.email,phone:data.phone,preRegistered:true,prePaymentStatus:data.pre_payment_status,preRegistrationStatus:data.pre_registration_status||'pending',officialGmailSent:!!data.official_gmail_sent_at,year:data.year||''};}
module.exports=async(req,res)=>{try{
 if(req.method!=='POST')return fail(res,405,'Method not allowed');
 let b=req.body||{};
 if(typeof b==='string'){try{b=JSON.parse(b)}catch{b={}}}
 if(b.action==='validate_session'){
  const proof=await verifyProof(b.accessToken,'access');
  if(!proof?.masterId)return fail(res,401,'Registration access session expired.');
  const {data,error}=await supabase.from('master_registrations').select('*').eq('master_id',String(proof.masterId)).maybeSingle();
  if(error)throw error;
  if(!data)return fail(res,401,'Registration access session is no longer valid.');
  const dbPhone=String(data.phone||'').replace(/\D/g,'').slice(-10);
  const proofPhone=String(proof.phone||'').replace(/\D/g,'').slice(-10);
  if(data.full_name!==proof.name||dbPhone!==proofPhone)return fail(res,401,'Registration access session is no longer valid.');
  return ok(res,{ok:true,sessionValid:true,master:masterPayload(data),sessionMinutes:30,sessionExpiresAt:Number(proof.exp)});
 }
 let id=String(b.masterId??b.master_id??b.masterID??b.id??'').normalize('NFKC').trim().toUpperCase();
 id=id.replace(/\s+/g,'').replace(/[^A-Z0-9-]/g,'');
 if(/^EX26-?\d{1,6}$/.test(id)){const digits=id.slice(4).replace(/\D/g,'');id='EX26-'+digits.padStart(6,'0');}
 const phoneDigits=String(b.phone??b.mobile??b.registeredMobile??b.registered_mobile??'').normalize('NFKC').replace(/\D/g,'');
 const phone=phoneDigits.slice(-10);
 const email=String(b.email??b.gmail??'').trim().toLowerCase();
 if(!/^EX26-\d{6}$/.test(id)||!/^[0-9]{10}$/.test(phone))return fail(res,400,'Enter your Master ID and registered 10-digit mobile number.');
 if(email&&!/^[a-z0-9._%+-]+@gmail\.com$/.test(email))return fail(res,400,'Enter the registered Gmail address.');
 const {data,error}=await supabase.from('master_registrations').select('*').eq('master_id',id).maybeSingle();
 if(error)throw error;
 if(!data)return fail(res,401,'Master ID not found. Check the Master ID issued during pre-registration.');
 const storedDigits=String(data.phone||'').replace(/\D/g,'');
 const stored=storedDigits.slice(-10);
 if(stored!==phone)return fail(res,401,'Master ID recognised, but the registered mobile number does not match.');
 if(email&&String(data.email||'').trim().toLowerCase()!==email)return fail(res,401,'Master ID recognised, but the registered Gmail does not match.');
 const sessionMinutes=30;
 const sessionExpiresAt=Date.now()+sessionMinutes*60*1000;
 const accessToken=await signProof('access',{masterId:data.master_id,name:data.full_name,phone:data.phone},sessionMinutes*60*1000);
 return ok(res,{ok:true,accessToken,master:masterPayload(data),sessionMinutes,sessionExpiresAt});
}catch(e){console.error(e);return fail(res,500,'Unable to verify registration identity')}};
