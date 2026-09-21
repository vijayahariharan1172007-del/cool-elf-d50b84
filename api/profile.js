const {supabase,ok,fail,verifyProof}=require('../lib/server');
module.exports=async(req,res)=>{try{
 if(req.method!=='POST')return fail(res,405,'Method not allowed');
 const access=await verifyProof(String(req.body?.accessToken||''),'access');
 if(!access?.masterId||!access.name||!access.phone)return fail(res,401,'Session expired. Please verify your Master ID again.');
 const id=String(access.masterId);
 const master=await supabase.from('master_registrations').select('master_id,full_name,email,phone,year').eq('master_id',id).maybeSingle();
 if(master.error)throw master.error;
 if(!master.data)return fail(res,401,'Registration access session is no longer valid.');
 const dbPhone=String(master.data.phone||'').replace(/\D/g,'').slice(-10);
 const proofPhone=String(access.phone||'').replace(/\D/g,'').slice(-10);
 if(master.data.full_name!==access.name||dbPhone!==proofPhone)return fail(res,401,'Registration access session is no longer valid.');
 const [direct,all]=await Promise.all([
  supabase.from('event_registrations').select('id,event,event_key,status,created_at,master_id,team_members').eq('master_id',id).order('created_at',{ascending:false}),
  supabase.from('event_registrations').select('id,event,event_key,status,created_at,master_id,team_members').order('created_at',{ascending:false})
 ]);
 if(direct.error)throw direct.error;
 if(all.error)throw all.error;
 const team=(all.data||[]).filter(row=>{if(String(row.master_id||'')===id)return false;const members=Array.isArray(row.team_members)?row.team_members:[];return members.some(m=>String(m?.masterId||m?.master_id||'').toUpperCase()===id.toUpperCase())});
 const byId=new Map();
 for(const row of [...(direct.data||[]),...team])byId.set(String(row.id),row);
 const events=[...byId.values()].sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))).map(row=>({event:row.event,event_key:row.event_key,status:row.status,created_at:row.created_at,role:String(row.master_id)===id?'PRIMARY':'TEAM MEMBER'}));
 return ok(res,{ok:true,events,master:{masterId:master.data.master_id,name:master.data.full_name,email:master.data.email,phone:master.data.phone,year:master.data.year||''}});
}catch(e){console.error(e);return fail(res,500,'Unable to load profile: '+(e?.message||'Request failed'));}};