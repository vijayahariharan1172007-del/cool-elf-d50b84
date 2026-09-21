const {consumeEmailVerification,signProof,ok,fail}=require('../lib/server');
module.exports=async(req,res)=>{try{
  if(req.method!=='POST')return fail(res,405,'Method not allowed');
  const token=String(req.body?.token||'');
  const email=await consumeEmailVerification(token);
  if(!email)return ok(res,{ok:false});
  return ok(res,{ok:true,email,emailProof:await signProof('email_verification',{email})});
}catch(e){console.error(e);return fail(res,500,'Unable to confirm Gmail verification')}};
