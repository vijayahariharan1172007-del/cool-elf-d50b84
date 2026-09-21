(() => {
 const $=id=>document.getElementById(id);
 const api=async(path,body={})=>{const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok||j.ok===false)throw Error(j.error||'Request failed');return j;};
 let events=[],currentPortal=null,auth=null;
 const ORDER=[
  ['symposium-1','01','SYMPOSIUM 1'],
  ['symposium-2','02','SYMPOSIUM 2'],
  ['junior-quiz','03','JUNIOR QUIZ'],
  ['senior-quiz','04','SENIOR QUIZ'],
  ['meme','05','MEME & SLOGAN'],
  ['poster-slogan','06','POSTER']
 ];
 const eventByKey=k=>events.find(x=>x.key===k);
 const normalizeId=v=>{
  let s=String(v??'').normalize('NFKC').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(/^EX26\d{1,6}$/.test(s)) return `EX26-${s.slice(4).padStart(6,'0')}`;
  return s;
 };
 const formatMasterInput=v=>{
  let s=String(v??'').normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(s.startsWith('EX26')){
   const digits=s.slice(4).replace(/\D/g,'').slice(0,6);
   return digits.length ? `EX26-${digits}` : 'EX26-';
  }
  return s.slice(0,11);
 };
 const normalizePhone=v=>String(v??'').replace(/\D/g,'').slice(-10);


 async function boot(){
  try{
   const st=await api('public-registration-state');
   const map=new Map((st.events||[]).map(x=>[x.key,x]));
   events=ORDER.map(([key,serial,label])=>{const p=map.get(key);return p?{...p,serial,displayTitle:label}:null}).filter(Boolean).filter(x=>x.enabled!==false);
   if(!events.length){$('participantStatus').textContent='NO EVENT REGISTRATION PORTALS ARE CURRENTLY OPEN.';return;}
   render();
   const saved=(()=>{try{return JSON.parse(localStorage.getItem('exc_portal_access')||'null')}catch{return null}})();
   // Already-Registered creates the only participant access session. Direct access
   // to this page without that session returns the participant to the verification gate.
   if(saved?.accessToken && saved?.master?.masterId && Date.now()<Number(saved.expiresAt||0)){
    const checked=await api('user-access',{action:'validate_session',accessToken:saved.accessToken});
    if(checked?.sessionValid){
      auth={accessToken:saved.accessToken,master:checked.master,sessionExpiresAt:Number(checked.sessionExpiresAt)};
      localStorage.setItem('exc_portal_access',JSON.stringify({accessToken:saved.accessToken,master:checked.master,expiresAt:checked.sessionExpiresAt}));
      showEvents(); return;
    }
   }
   location.replace('already-registered.html');
  }catch(e){$('participantStatus').textContent=e.message||'Unable to load event portals. Please refresh.';}
 }

 function render(){
  $('registrationTypes').innerHTML=events.map(p=>`<button class="registration-type event-portal-button" type="button" data-key="${p.key}">
   <span class="type-serial">${p.serial}</span><span class="type-copy"><b>${p.displayTitle||p.title}</b><small>${p.team?'TEAM EVENT • TEAM MEMBERS VERIFIED IN STEP 1':'INDIVIDUAL EVENT'}</small></span>
   <strong>${Number(p.fee||0)?'₹'+p.fee:'FREE'}</strong><i>→</i>
  </button>`).join('');
  document.querySelectorAll('#registrationTypes [data-key]').forEach(b=>b.onclick=()=>select(b.dataset.key));
 }

 function showEvents(){
  $('portalDirectory').hidden=false;$('identityGate').hidden=true;$('paymentGate').hidden=true;
  $('verifiedParticipant').innerHTML=`<span>VERIFIED PARTICIPANT</span><b>${auth.master.name||'PARTICIPANT'}</b><strong>${auth.master.masterId}</strong>`;
  $('portalAccessStatus').textContent='SELECT ONE OF THE SIX EVENT REGISTRATION PORTALS';
 }

 function select(key){
  currentPortal=eventByKey(key);if(!currentPortal||!auth?.accessToken)return;
  $('portalDirectory').hidden=true;$('identityGate').hidden=false;
  $('identitySerial').textContent=currentPortal.serial;$('identityTitle').textContent=currentPortal.displayTitle||currentPortal.title;
  $('identitySubtitle').textContent=currentPortal.team?'MASTER VERIFIED • ADD TEAM MEMBERS IN STEP 1':'MASTER VERIFIED • CONTINUE TO PAYMENT';
  $('identityEvent').innerHTML=`<span>SELECTED EVENT</span><b>${currentPortal.displayTitle||currentPortal.title}</b><strong>${Number(currentPortal.fee||0)?'₹'+currentPortal.fee:'FREE'}</strong>`;
  $('verifiedMain').innerHTML=`<span>MAIN PARTICIPANT</span><b>${auth.master.name||'PARTICIPANT'}</b><strong>${auth.master.masterId} • ${auth.master.phone||''}</strong>`;
  $('identityStatus').textContent='';auth.teamMembers=[];$('teamMemberRows').innerHTML='';
  $('mainMasterId').value=auth.master.masterId||'';
  $('mainMobile').value=normalizePhone(auth.master.phone||'');
  $('teamFields').hidden=!currentPortal.team;
  const needsAbstract=currentPortal.requires_abstract===true || ['symposium-1','symposium-2','poster-slogan','meme'].includes(currentPortal.key);
  $('abstractFields').hidden=!needsAbstract;
  $('abstractFile').value='';$('abstractFileName').textContent='NO FILE SELECTED';
  if(currentPortal.team)addTeamRow();
 }

 function addTeamRow(){
  const rows=$('teamMemberRows');if(rows.children.length>=5)return $('identityStatus').textContent='MAXIMUM 5 ADDITIONAL TEAM MEMBERS';
  const n=rows.children.length+1;
  const row=document.createElement('div');row.className='team-member-row';row.innerHTML=`<div class="team-member-head"><span>TEAM MEMBER ${n}</span><button class="remove-member" type="button">REMOVE</button></div><label>MASTER ID<input class="member-id" type="text" placeholder="EX26-000000" maxlength="11" autocomplete="off"></label><label>REGISTERED MOBILE<input class="member-phone" type="tel" inputmode="numeric" maxlength="10" placeholder="10-digit mobile number" autocomplete="tel"></label>`;
  row.querySelector('.remove-member').onclick=()=>{row.remove();renumberTeamRows();};rows.appendChild(row);
 }
 function renumberTeamRows(){[...document.querySelectorAll('.team-member-row')].forEach((r,i)=>r.querySelector('.team-member-head span').textContent=`TEAM MEMBER ${i+1}`);}
 $('addTeamMember').onclick=()=>{addTeamRow();$('identityStatus').textContent='';};
 $('backToTypes').onclick=()=>showEvents();

 $('continueToPay').onclick=async()=>{
  if(!auth?.accessToken)return showParticipant();
  const btn=$('continueToPay');btn.disabled=true;$('identityStatus').textContent='CHECKING REGISTRATION DETAILS…';
  try{
   const mainId=normalizeId($('mainMasterId').value),mainPhone=normalizePhone($('mainMobile').value);
   if(mainId!==normalizeId(auth.master.masterId)||mainPhone!==normalizePhone(auth.master.phone))throw Error('Master ID or registered mobile number does not match the verified participant.');
   const needsAbstract=currentPortal.requires_abstract===true || ['symposium-1','symposium-2','poster-slogan','meme'].includes(currentPortal.key);
   if(needsAbstract){
    const f=$('abstractFile').files?.[0];
    if(!f)throw Error('UPLOAD THE REQUIRED ABSTRACT / SUBMISSION FILE FIRST.');
    const ext=(f.name.split('.').pop()||'').toLowerCase();
    if(!['pdf','doc','docx'].includes(ext))throw Error('ONLY PDF, DOC OR DOCX FILES ARE ALLOWED.');
    if(f.size>10*1024*1024)throw Error('THE ABSTRACT / SUBMISSION FILE MUST BE 10 MB OR SMALLER.');
   }
   if(currentPortal?.team){
    const rows=[...document.querySelectorAll('.team-member-row')];if(!rows.length)throw Error('ADD AT LEAST ONE TEAM MEMBER');
    const seen=new Set([auth.master.masterId]);const verified=[];
    for(const row of rows){
     const mid=normalizeId(row.querySelector('.member-id').value),mp=row.querySelector('.member-phone').value.trim();
     if(!/^EX26-\d{6}$/.test(mid)||!/^(?:\+?91)?[0-9]{10}$/.test(normalizePhone(mp)))throw Error('ENTER A VALID MASTER ID AND 10-DIGIT MOBILE FOR EVERY TEAM MEMBER');
     if(seen.has(mid))throw Error(`DUPLICATE TEAM MEMBER: ${mid}`);seen.add(mid);
     const vr=await api('verify-team-member',{masterId:mid,phone:mp});verified.push({masterId:vr.master.masterId,phone:vr.master.phone,name:vr.master.name,email:vr.master.email||'',year:vr.master.year||''});
    }
    auth.teamMembers=verified;
   }
   showPayment();
  }catch(e){$('identityStatus').textContent=e.message||'Unable to verify team members.';}
  finally{btn.disabled=false;}
 };

 function showPayment(){
  const paid=Number(currentPortal.fee||0)>0;
  $('identityGate').hidden=true;$('paymentGate').hidden=false;
  $('gateSerial').textContent=currentPortal.serial;
  $('gateTitle').textContent=paid?'PAYMENT':'CONFIRMATION';
  $('gateType').textContent=currentPortal.displayTitle||currentPortal.title;
  $('gateAmount').textContent=paid?'₹'+currentPortal.fee:'NO PAYMENT';
  $('gateNote').textContent=paid?(currentPortal.note||'Complete payment and enter the UTR before confirming registration.'):'This event has no registration fee. No payment or UTR is required.';
  $('gateUtr').value='';$('gateStatus').textContent='';
  const utrLabel=document.querySelector('#gateUtr')?.closest('label'); if(utrLabel)utrLabel.hidden=!paid;
  const q=$('gateQr');q.textContent='';
  if(paid){
   if(currentPortal.qr){const img=new Image();img.src=currentPortal.qr;img.alt='Payment QR';img.onload=()=>q.replaceChildren(img);img.onerror=()=>q.textContent='QR NOT AVAILABLE';}else q.textContent='QR NOT CONFIGURED';
  }else q.textContent='FREE ENTRY • NO PAYMENT REQUIRED';
}
 $('backToIdentity').onclick=()=>{$('paymentGate').hidden=true;$('identityGate').hidden=false;};
 $('confirmRegistration').onclick=async()=>{
  if(!auth?.accessToken)return $('gateStatus').textContent='SESSION EXPIRED. PLEASE VERIFY AGAIN.';
  const utr=$('gateUtr').value.trim();if(Number(currentPortal.fee||0)&&utr.length<6)return $('gateStatus').textContent='ENTER A VALID UTR / TRANSACTION NUMBER';
  const team=currentPortal.team?(auth.teamMembers||[]):[];if(currentPortal.team&&!team.length)return $('gateStatus').textContent='TEAM MEMBERS WERE NOT VERIFIED. PLEASE GO BACK AND VERIFY THEM.';
  const btn=$('confirmRegistration');btn.disabled=true;$('gateStatus').textContent='CONFIRMING REGISTRATION…';
  try{const r=await api('create-event-registration',{accessToken:auth.accessToken,masterId:auth.master.masterId,name:auth.master.name,phone:auth.master.phone,eventKey:currentPortal.key,utr,customFields:{},teamMembers:team});
   $('registrationId').textContent=r.eventId||'SUBMITTED';$('passName').textContent=auth.master.name||'PARTICIPANT';$('passEvent').textContent=currentPortal.displayTitle||currentPortal.title;$('passMobile').textContent=auth.master.phone||'';$('passId').textContent=auth.master.masterId||'';$('successNote').textContent=currentPortal?.requires_abstract===true ? 'REGISTRATION CREATED • ABSTRACT SUBMISSION REQUIRED TO COMPLETE THIS EVENT.' : 'REGISTRATION SUCCESSFUL • DETAILS SAVED.';$('abstractButton').hidden=currentPortal?.requires_abstract!==true;$('successOverlay').hidden=false;
   if(window.QRCode){$('qrcode').innerHTML='';new QRCode($('qrcode'),{text:r.eventId||auth.master.masterId,width:74,height:74});}
  }catch(e){$('gateStatus').textContent=e.message||'Unable to complete registration.';}finally{btn.disabled=false;}
 };
 $('abstractButton').onclick=()=>location.href='abstract.html';$('printPass').onclick=()=>window.print();$('closeSuccess').onclick=()=>showEvents();
 boot();
})();


 // J.A.R.V.I.S. navigation is intentionally isolated from registration state.
 const jarvis=document.getElementById('jarvisBtn'),panel=document.getElementById('jarvisPanel'),jarvisClose=document.getElementById('jarvisClose');
 function openJarvis(){panel.classList.add('open');panel.setAttribute('aria-hidden','false');document.body.classList.add('jarvis-open');}
 function closeJarvis(){panel.classList.remove('open');panel.setAttribute('aria-hidden','true');document.body.classList.remove('jarvis-open');}
 if(jarvis&&panel&&jarvisClose){
  jarvis.addEventListener('click',openJarvis);jarvisClose.addEventListener('click',closeJarvis);panel.addEventListener('click',e=>{if(e.target===panel)closeJarvis()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeJarvis()});
  const routes={HOME:'site.html',REGISTRATIONS:'registration-portals.html',PROFILE:'profile.html','GENERAL RULES':'general-rules.html',CONTACTS:'contact.html'};
  document.querySelectorAll('#jarvisPanel .jarvis-links button').forEach(b=>b.addEventListener('click',()=>{const t=b.dataset.target;if(routes[t]){closeJarvis();location.href=routes[t]}}));
 }
