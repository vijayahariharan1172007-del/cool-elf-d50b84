const {supabase,ok,fail}=require('../lib/server');
const {DEFAULT_REGISTRATION_PORTALS}=require('../registration-defaults');
module.exports=async(req,res)=>{try{if(req.method!=='POST')return fail(res,405,'Method not allowed');
 const {data:c}=await supabase.from('site_controls').select('global_registration,public_portal').eq('id',1).maybeSingle();
 const {data:settings}=await supabase.from('system_settings').select('key,value_json').in('key',['access_session_hours']);
 const runtime={phone_otp_enabled:false,gmail_verification_enabled:false,access_session_hours:1};
 for(const row of settings||[]){const v=row.value_json;runtime[row.key]=v&&Object.prototype.hasOwnProperty.call(v,'value')?v.value:v;}
 if(c?.public_portal==='maintenance')return ok(res,{ok:true,events:[],maintenance:true,runtime});
 const {data,error}=await supabase.from('registration_portals').select('key,serial,title,subtitle,fee,qr,note,description,fields,team,requires_abstract,enabled').order('serial');
 if(error)return ok(res,{ok:true,events:DEFAULT_REGISTRATION_PORTALS,runtime,localFallback:true});
 const map=new Map((data||[]).map(e=>[e.key,e]));
 if(!map.has('pre-registration'))map.set('pre-registration',DEFAULT_REGISTRATION_PORTALS[0]);
 const events=[...map.values()].filter(e=>e.enabled!==false).sort((a,b)=>String(a.serial||'').localeCompare(String(b.serial||''),undefined,{numeric:true}));
 return ok(res,{ok:true,events,runtime});
}catch(e){return fail(res,500,'Unable to load registration portals')}};
