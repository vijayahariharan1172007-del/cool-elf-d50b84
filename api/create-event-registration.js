const crypto=require('crypto');
const {supabase,ok,fail,verifyProof}=require('../lib/server');
function digits(v){return String(v||'').replace(/\D/g,'').slice(-10)}
module.exports=async(req,res)=>{try{
 if(req.method!=='POST')return fail(res,405,'Method not allowed');
 const ctrl=await supabase.from('site_controls').select('global_registration,public_portal').eq('id',1).maybeSingle();
 if(ctrl.data?.global_registration==='closed')return fail(res,403,'Registrations are currently closed.');
 if(ctrl.data?.public_portal==='maintenance')return fail(res,503,'Registration portal is under maintenance.');
 const b=req.body||{},id=String(b.masterId||'').trim().toUpperCase().replace(/\s+/g,''),name=String(b.name||'').trim(),phone=digits(b.phone),eventKey=String(b.eventKey||'').trim(),utr=String(b.utr||'').trim();
 const rawCustomFields=(b.customFields&&typeof b.customFields==='object'&&!Array.isArray(b.customFields))?b.customFields:{};const customFields={};
 for(const [k,v] of Object.entries(rawCustomFields)){const key=String(k||'').trim();if(!key||key.length>64)continue;if(Object.keys(customFields).length>=30)break;const value=typeof v==='string'?v.trim():String(v??'').trim();if(value.length>500)return fail(res,400,'A custom field value is too long');customFields[key]=value;}
 const access=await verifyProof(b.accessToken,'access');
 if(!access||access.masterId!==id||access.name!==name||digits(access.phone)!==phone)return fail(res,403,'Registration access verification expired. Please verify your Master ID again.');
 const m=await supabase.from('master_registrations').select('*').eq('master_id',id).maybeSingle();if(!m.data||m.data.full_name!==name||digits(m.data.phone)!==phone)return fail(res,403,'Identity verification failed');
 const p=await supabase.from('registration_portals').select('*').eq('key',eventKey).eq('enabled',true).maybeSingle();if(!p.data)return fail(res,404,'Registration portal unavailable');
 if(eventKey==='pre-registration')return fail(res,400,'Use the pre-registration portal for Master ID creation.');
 if(p.data.fee>0){
   if(!/^[A-Za-z0-9\-\/]{6,40}$/.test(utr))return fail(res,400,'Enter a valid 6–40 character payment UTR / transaction reference');
   const sameUtr=await supabase.from('event_registrations').select('id').eq('utr',utr).limit(1);
   if(sameUtr.error)throw sameUtr.error;
   if(sameUtr.data?.length)return fail(res,409,'This payment UTR has already been submitted. Please check the transaction reference.');
 }
 const dup=await supabase.from('event_registrations').select('id').eq('master_id',id).eq('event_key',eventKey).maybeSingle();if(dup.data)return fail(res,409,'You are already registered for this event');
 let team=[];
 if(p.data.team){
   if(!Array.isArray(b.teamMembers)||!b.teamMembers.length)return fail(res,400,'At least one additional team member is required');
   if(b.teamMembers.length>5)return fail(res,400,'Maximum 5 additional team members allowed');
   const seen=new Set([id]);
   for(const raw of b.teamMembers){
     const mid=String(raw?.masterId||'').trim().toUpperCase().replace(/\s+/g,''),mp=digits(raw?.phone);
     if(!/^EX26-\d{6}$/.test(mid)||!/^\d{10}$/.test(mp))return fail(res,400,'Every team member needs a valid Master ID and 10-digit mobile number');
     if(seen.has(mid))return fail(res,400,`Duplicate team member ID: ${mid}`);seen.add(mid);
     const q=await supabase.from('master_registrations').select('master_id,full_name,email,phone,year').eq('master_id',mid).maybeSingle();
     if(!q.data)return fail(res,400,`Invalid team member Master ID: ${mid}`);
     if(digits(q.data.phone)!==mp)return fail(res,400,`Mobile number does not match Master ID ${mid}`);
     const already=await supabase.from('event_team_members').select('id').eq('event_key',eventKey).eq('master_id',mid).maybeSingle();
     if(already.data)return fail(res,409,`Team member ${mid} is already registered for this event`);
     team.push({masterId:mid,mobile:mp,name:q.data.full_name,email:q.data.email||'',year:q.data.year||''});
   }
 }
 const eventId=(p.data.serial||'EV')+'-'+crypto.randomUUID().replace(/-/g,'').slice(0,10).toUpperCase();
 let createdId=null;
 if(p.data.team){
   const ids=[id,...team.map(x=>x.masterId)];
   const rpc=await supabase.rpc('create_team_event_registration',{p_event_code:eventId,p_master_id:id,p_name:name,p_phone:m.data.phone,p_email:m.data.email,p_event:p.data.title,p_event_key:eventKey,p_fee:Number(p.data.fee||0),p_utr:utr||null,p_team_id:eventId,p_team_members:team,p_member_ids:ids,p_custom_fields:customFields});
   if(rpc.error){if(String(rpc.error.message||'').includes('TEAM_MEMBER_ALREADY_REGISTERED')||rpc.error.code==='23505')return fail(res,409,'One or more team members are already registered for this event.');throw rpc.error}
   createdId=rpc.data;if(!createdId)return fail(res,500,'Team registration did not return a registration ID');
   if(p.data.requires_abstract===true){
     const mark=await supabase.from('event_registrations').update({status:'awaiting_abstract',payment_status:p.data.fee?'pending_verification':'not_required'}).eq('id',createdId);
     if(mark.error)throw mark.error;
   }
 }else{
   const {data:ins,error}=await supabase.from('event_registrations').insert({event_code:eventId,master_id:id,name,phone:m.data.phone,email:m.data.email,event:p.data.title,event_key:eventKey,fee:p.data.fee,utr:utr||null,payment_status:p.data.fee?'pending_verification':'not_required',system_verified:true,status:p.data.requires_abstract===true?'awaiting_abstract':'pending',team_id:null,team_members:[],custom_fields:customFields}).select('id').maybeSingle();
   if(error){if(error.code==='23505')return fail(res,409,'You are already registered for this event');throw error}createdId=ins?.id;if(!createdId)return fail(res,500,'Registration was created without an ID');
 }
 const finalStatus=p.data.requires_abstract===true?'awaiting_abstract':'pending';
 return ok(res,{ok:true,eventId,status:finalStatus,cardReady:false,teamId:p.data.team?eventId:null,registrationDbId:createdId,abstractEligible:p.data.requires_abstract===true});
}catch(e){console.error(e);return fail(res,500,'Unable to create event registration')}};
