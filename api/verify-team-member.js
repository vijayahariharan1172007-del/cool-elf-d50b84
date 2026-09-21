const {supabase,ok,fail}=require('../lib/server');
module.exports=async(req,res)=>{try{
 if(req.method!=='POST')return fail(res,405,'Method not allowed');
 const b=req.body||{};
 const masterId=String(b.masterId||'').trim().toUpperCase().replace(/\s+/g,'');
 const phone=String(b.phone||'').replace(/\D/g,'').slice(-10);
 if(!/^EX26-\d{6}$/.test(masterId)||!/^\d{10}$/.test(phone))return fail(res,400,'Enter a valid team member Master ID and registered mobile number.');
 const {data,error}=await supabase.from('master_registrations').select('master_id,full_name,email,phone,year').eq('master_id',masterId).maybeSingle();
 if(error)throw error;
 if(!data)return fail(res,401,'Team member Master ID was not found.');
 if(String(data.phone||'').replace(/\D/g,'').slice(-10)!==phone)return fail(res,401,'Mobile number does not match the team member Master ID.');
 return ok(res,{ok:true,master:{masterId:data.master_id,name:data.full_name,email:data.email||'',phone:data.phone,year:data.year||''}});
}catch(e){console.error(e);return fail(res,500,'Unable to verify team member');}};
