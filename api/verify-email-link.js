const {verifyEmailToken,fail}=require('../lib/server');
module.exports=async(req,res)=>{try{
  if(req.method!=='GET')return fail(res,405,'Method not allowed');
  const token=String(req.query?.token||'');
  const valid=await verifyEmailToken(token);
  if(!valid)return res.redirect(302,'/registration.html?gmail_error=invalid_or_expired');
  return res.redirect(302,`/registration.html?gmail_token=${encodeURIComponent(token)}`);
}catch(e){console.error(e);return res.redirect(302,'/registration.html?gmail_error=verification_unavailable')}};
