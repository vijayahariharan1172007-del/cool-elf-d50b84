const {supabase,ok,fail,verifyProof}=require('../lib/server');

module.exports=async(req,res)=>{
  try{
    if(req.method!=='POST')return fail(res,405,'Method not allowed');
    const access=await verifyProof(String(req.body?.accessToken||''),'access');
    if(!access?.masterId||!access.name||!access.phone)
      return fail(res,401,'Session expired. Please verify your Master ID again.');

    const id=String(access.masterId);
    const master=await supabase
      .from('master_registrations')
      .select('master_id,full_name,email,phone,year')
      .eq('master_id',id)
      .maybeSingle();

    if(master.error)throw master.error;
    if(!master.data)return fail(res,401,'Registration access session is no longer valid.');

    const dbPhone=String(master.data.phone||'').replace(/\D/g,'').slice(-10);
    const proofPhone=String(access.phone||'').replace(/\D/g,'').slice(-10);
    if(master.data.full_name!==access.name||dbPhone!==proofPhone)
      return fail(res,401,'Registration access session is no longer valid.');

    // Fetch direct registrations and team-member registrations separately.
    // The previous JSONB .contains() query could fail with PostgreSQL JSON parsing
    // errors for object-array values, so team membership is resolved through the
    // normalized event_team_members table instead.
    const [directRes,teamRes]=await Promise.all([
      supabase
        .from('event_registrations')
        .select('id,event,event_key,status,created_at,master_id,event_code')
        .eq('master_id',id)
        .order('created_at',{ascending:false}),
      supabase
        .from('event_team_members')
        .select('event_code,event_key,master_id')
        .eq('master_id',id)
    ]);

    if(directRes.error)throw directRes.error;
    if(teamRes.error)throw teamRes.error;

    const direct=directRes.data||[];
    const teamCodes=[...new Set((teamRes.data||[]).map(x=>String(x.event_code||'')).filter(Boolean))];
    let teamRegs=[];
    if(teamCodes.length){
      const q=await supabase
        .from('event_registrations')
        .select('id,event,event_key,status,created_at,master_id,event_code')
        .in('event_code',teamCodes);
      if(q.error)throw q.error;
      teamRegs=q.data||[];
    }

    const byId=new Map();
    for(const row of [...direct,...teamRegs]){
      if(row?.id)byId.set(String(row.id),row);
    }
    const registrations=[...byId.values()].sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));

    const eventKeys=[...new Set(registrations.map(r=>String(r.event_key||'')).filter(Boolean))];
    const [abstractRes,portalRes]=await Promise.all([
      registrations.length
        ? supabase.from('abstract_submissions').select('event_registration_id,status,submitted_at').in('event_registration_id',registrations.map(r=>r.id))
        : Promise.resolve({data:[],error:null}),
      eventKeys.length
        ? supabase.from('registration_portals').select('key,requires_abstract').in('key',eventKeys)
        : Promise.resolve({data:[],error:null})
    ]);
    if(abstractRes.error)throw abstractRes.error;
    if(portalRes.error)throw portalRes.error;

    const abstracts=new Map((abstractRes.data||[]).map(x=>[String(x.event_registration_id),x]));
    const portals=new Map((portalRes.data||[]).map(x=>[String(x.key),x]));

    const events=registrations.map(row=>{
      const requires=portals.get(String(row.event_key||''))?.requires_abstract===true;
      const submission=abstracts.get(String(row.id));
      let abstractStatus='not_required';
      if(requires)abstractStatus=submission?.status||'not_submitted';
      return {
        event:row.event,
        event_key:row.event_key,
        status:row.status,
        created_at:row.created_at,
        role:String(row.master_id)===id?'PRIMARY':'TEAM MEMBER',
        abstract_required:requires,
        abstract_status:abstractStatus,
        abstract_submitted_at:submission?.submitted_at||null
      };
    });

    return ok(res,{
      ok:true,
      events,
      master:{
        masterId:master.data.master_id,
        name:master.data.full_name,
        email:master.data.email,
        phone:master.data.phone,
        year:master.data.year||''
      }
    });
  }catch(e){
    console.error(e);
    return fail(res,500,'Unable to load profile: '+(e?.message||'Request failed'));
  }
};
