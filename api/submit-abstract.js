const {supabase,ok,fail,verifyProof,getSupabaseClient}=require('../lib/server');

const fallbackSubmissionEvent=(eventKey,eventTitle)=>{
  const k=String(eventKey||'').toLowerCase(), t=String(eventTitle||'').toLowerCase();
  return k==='symposium-1'||k==='symposium-2'||k.includes('poster')||k.includes('slogan')||t.includes('poster')||t.includes('slogan')||t.includes('symposium 1')||t.includes('symposium 2');
};

async function getEligibleRegistrations(masterId){
  const [regsRes,portalsRes]=await Promise.all([
    supabase.from('event_registrations').select('id,event_key,event,team_id,team_members').eq('master_id',masterId),
    supabase.from('registration_portals').select('key,title,requires_abstract,enabled')
  ]);
  if(regsRes.error)throw regsRes.error;
  if(portalsRes.error)throw portalsRes.error;
  const portalMap=new Map((portalsRes.data||[]).map(p=>[String(p.key),p]));
  return (regsRes.data||[]).filter(r=>{
    const p=portalMap.get(String(r.event_key));
    return p?.requires_abstract===true || fallbackSubmissionEvent(r.event_key,r.event);
  });
}

module.exports=async(req,res)=>{
  try{
    if(req.method!=='POST')return fail(res,405,'Method not allowed');
    const b=req.body||{};
    const access=await verifyProof(b.accessToken,'access');
    const id=String(b.masterId||'').trim();
    if(!access||access.masterId!==id)return fail(res,403,'Registration access verification expired. Please verify your Master ID again.');
    const m=await supabase.from('master_registrations').select('master_id,full_name,phone').eq('master_id',id).maybeSingle();
    if(m.error)throw m.error;
    if(!m.data)return fail(res,404,'Master registration not found');

    const eligible=await getEligibleRegistrations(id);
    if(b.action==='eligible'){
      const ids=eligible.map(r=>r.id);
      let submitted=[];
      if(ids.length){
        const ex=await supabase.from('abstract_submissions').select('event_registration_id,status').in('event_registration_id',ids);
        if(ex.error)throw ex.error;
        submitted=ex.data||[];
      }
      return ok(res,{ok:true,events:eligible.map(r=>{const ex=submitted.find(x=>x.event_registration_id===r.id);return {eventKey:r.event_key,eventTitle:r.event,submitted:!!ex,status:ex?.status||null}})});
    }

    const eventKey=String(b.eventKey||'').trim();
    if(!eventKey)return fail(res,400,'Event is required');
    const reg=eligible.find(r=>String(r.event_key).toLowerCase()===eventKey.toLowerCase());
    if(!reg)return fail(res,403,'You are not registered for an event that requires a submission');
    const teamId=reg.team_id||null;
    let teamMasterIds=[id];
    if(teamId){
      const teamMembers=Array.isArray(reg.team_members)?reg.team_members:[];
      for(const member of teamMembers){
        const mid=String(member?.masterId||'').trim().toUpperCase();
        if(mid&&!teamMasterIds.includes(mid))teamMasterIds.push(mid);
      }
    }

    const existing=await supabase.from('abstract_submissions').select('id,status').eq('event_registration_id',reg.id).maybeSingle();
    if(existing.error)throw existing.error;
    if(b.action==='validate')return ok(res,{valid:true,eventKey:reg.event_key,eventTitle:reg.event,submitted:!!existing.data,status:existing.data?.status||null});

    if(b.action==='upload-url'){
      if(existing.data)return fail(res,409,'A submission has already been received for this event');
      const fileName=String(b.fileName||'').trim();
      const fileType=String(b.fileType||'').trim().toLowerCase();
      const fileSize=Number(b.fileSize||0);
      // All file formats are accepted. Event-specific format guidance is advisory:
      // Poster -> JPEG preferred; Slogan & Meme -> PDF preferred; Symposium -> PDF preferred.
      if(!fileName)return fail(res,400,'Submission file name is required');
      if(!Number.isFinite(fileSize)||fileSize<=0||fileSize>10*1024*1024)return fail(res,400,'File must be 10 MB or smaller');
      const safeName=fileName.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-140);
      const path=`${id}/${reg.event_key}/${Date.now()}-${safeName}`;
      const dbClient=await getSupabaseClient();
      const signed=dbClient.storage.from('abstract-submissions');
      const created=await signed.createSignedUploadUrl(path,{upsert:false});
      if(created.error)throw created.error;
      return ok(res,{ok:true,path:created.data.path,signedUrl:created.data.signedUrl,token:created.data.token});
    }

    if(b.action==='submit'){
      if(existing.data)return fail(res,409,'A submission has already been received for this event');
      const filePath=String(b.filePath||'').trim(),fileName=String(b.fileName||'').trim(),fileType=String(b.fileType||'').trim().toLowerCase(),fileSize=Number(b.fileSize||0);
      if(!filePath||!fileName)return fail(res,400,'Submission file is required');
      if(!filePath.startsWith(`${id}/${reg.event_key}/`))return fail(res,403,'Invalid submission file path');
      if(fileSize<=0||fileSize>10*1024*1024)return fail(res,400,'File must be 10 MB or smaller');
      const ins=await supabase.from('abstract_submissions').insert({event_registration_id:reg.id,master_id:id,event_key:reg.event_key,event_title:reg.event,title:fileName,abstract_text:'FILE SUBMISSION',team_id:teamId,team_master_ids:teamMasterIds,file_path:filePath,file_name:fileName,file_size:fileSize,file_type:fileType,status:'submitted',submitted_at:new Date().toISOString()}).select('id').maybeSingle();
      if(ins.error){if(ins.error.code==='23505')return fail(res,409,'A submission has already been received for this event');throw ins.error;}
      const upd=await supabase.from('event_registrations').update({status:'pending'}).eq('id',reg.id).eq('status','awaiting_abstract');
      if(upd.error)throw upd.error;
      return ok(res,{ok:true,id:ins.data?.id,status:'submitted',registrationStatus:'pending'});
    }
    return fail(res,400,'Invalid action');
  }catch(e){console.error(e);return fail(res,500,`Unable to process submission: ${e?.message||'Unknown server error'}`);}
};
