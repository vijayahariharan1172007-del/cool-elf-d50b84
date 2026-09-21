const {supabase,ok,fail,verifyProof}=require('../lib/server');
module.exports=async(req,res)=>{try{
 if(req.method!=='POST')return fail(res,405,'Method not allowed');
 const b=req.body||{};
 const masterId=String(b.masterId||'').trim(),name=String(b.name||'').trim(),phone=String(b.phone||'').trim(),utr=String(b.utr||'').trim();
 if(!masterId||!name||!phone)return fail(res,400,'Master ID, name and phone are required');
 if(!utr||utr.length<6)return fail(res,400,'A valid payment UTR is required');
 const access=await verifyProof(b.accessToken,'access');
 if(!access||access.masterId!==masterId||access.name!==name||access.phone!==phone)return fail(res,403,'Registration access verification expired. Please verify your Master ID again.');
 const m=await supabase.from('master_registrations').select('master_id,full_name,phone').eq('master_id',masterId).maybeSingle();
 if(!m.data||m.data.full_name!==name||m.data.phone!==phone)return fail(res,403,'Identity mismatch');
 const {error}=await supabase.from('master_registrations').update({pre_utr:utr,pre_payment_status:'submitted'}).eq('master_id',masterId);
 if(error)throw error;
 return ok(res,{ok:true,status:'pending'});
}catch(e){console.error('pre-payment-verify',e);return fail(res,500,'Unable to record payment')}};
