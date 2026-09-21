const {supabase,ok,fail}=require('../lib/server');

const normalizePhone=v=>String(v??'').replace(/\D/g,'').slice(-10);
const normalizeEmail=v=>String(v??'').trim().toLowerCase();

module.exports=async(req,res)=>{
  try{
    if(req.method!=='POST')return fail(res,405,'Method not allowed');
    const b=req.body||{};
    const email=normalizeEmail(b.email);
    const phone=normalizePhone(b.phone||b.mobile);
    if(!email||!email.includes('@')||phone.length!==10)
      return fail(res,400,'Enter the registered Gmail address and 10-digit mobile number.');

    const {data,error}=await supabase
      .from('master_registrations')
      .select('master_id,full_name,email,phone')
      .eq('email',email)
      .maybeSingle();

    if(error)throw error;
    if(!data||normalizeEmail(data.email)!==email||normalizePhone(data.phone)!==phone)
      return fail(res,404,'No Master ID matches that registered Gmail and mobile number.');

    return ok(res,{
      ok:true,
      masterId:data.master_id,
      name:data.full_name
    });
  }catch(e){
    console.error(e);
    return fail(res,500,'Unable to retrieve Master ID: '+(e?.message||'Request failed'));
  }
};
