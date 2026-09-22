(() => {
const $=id=>document.getElementById(id);
const api=async(path,body={})=>{
 const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body),cache:'no-store'});
 const t=await r.text();let j={};try{j=JSON.parse(t)}catch{}
 if(!r.ok||j.ok===false){const detail=j.error||(t&&t.slice(0,300))||`HTTP ${r.status}`;throw Error(`${detail} [HTTP ${r.status}]`);}
 return j;
};
const ORDER=[
 ['symposium-1','01','SYMPOSIUM 1'],['symposium-2','02','SYMPOSIUM 2'],
 ['junior-quiz','03','JUNIOR QUIZ'],['senior-quiz','04','SENIOR QUIZ'],
 ['meme','05','MEME & SLOGAN'],['poster-slogan','06','POSTER']
];
const FALLBACK=[
 {key:'symposium-1',serial:'01',title:'SYMPOSIUM 1',description:'Register your verified Master ID for Symposium 1.',fee:100,team:true,requires_abstract:true,enabled:true},
 {key:'symposium-2',serial:'02',title:'SYMPOSIUM 2',description:'Register your verified Master ID for Symposium 2.',fee:100,team:true,requires_abstract:true,enabled:true},
 {key:'junior-quiz',serial:'03',title:'JUNIOR QUIZ',description:'Register your verified Master ID for Junior Quiz.',fee:50,team:true,requires_abstract:false,enabled:true},
 {key:'senior-quiz',serial:'04',title:'SENIOR QUIZ',description:'Register your verified Master ID for Senior Quiz.',fee:50,team:true,requires_abstract:false,enabled:true},
 {key:'meme',serial:'05',title:'MEME & SLOGAN',description:'Register your verified Master ID for Meme & Slogan.',fee:0,team:false,requires_abstract:true,enabled:true},
 {key:'poster-slogan',serial:'06',title:'POSTER',description:'Register your verified Master ID for Poster.',fee:0,team:false,requires_abstract:true,enabled:true}
];
let events=[...FALLBACK],current=null,auth=null;
const normalizeId=v=>{let s=String(v??'').normalize('NFKC').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');if(/^EX26\d{6}$/.test(s))s='EX26-'+s.slice(4);return s};
const formatId=v=>{let s=String(v??'').toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,11);if(/^EX26/.test(s)){let n=s.slice(4).replace(/\D/g,'').slice(0,6);return n?'EX26-'+n:'EX26'}return s};
const phone=v=>String(v??'').replace(/\D/g,'').slice(-10);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function showSection(id){['identityGate','portalShell','paymentGate'].forEach(x=>$(x).hidden=x!==id)}
function setFormStatus(msg){$('formStatus').textContent=msg||''}
function setGateStatus(msg){$('gateStatus').textContent=msg||''}

async function validateExistingSession(){
 try{
  const raw=localStorage.getItem('exc_portal_access');
  if(!raw)return false;
  const saved=JSON.parse(raw);
  if(!saved?.accessToken||Date.now()>=Number(saved.expiresAt||0)){
   localStorage.removeItem('exc_portal_access');
   return false;
  }
  const r=await api('user-access',{action:'validate_session',accessToken:saved.accessToken});
  if(!r.sessionValid||!r.master?.masterId)throw Error('SESSION_INVALID');
  auth={accessToken:saved.accessToken,master:r.master,sessionExpiresAt:Number(r.sessionExpiresAt||saved.expiresAt)};
  localStorage.setItem('exc_portal_access',JSON.stringify({accessToken:auth.accessToken,master:auth.master,expiresAt:auth.sessionExpiresAt}));
  return true;
 }catch(e){
  localStorage.removeItem('exc_portal_access');
  return false;
 }
}

let sessionWatchTimer=null;

function startSessionWatch(){
 if(sessionWatchTimer)clearInterval(sessionWatchTimer);
 sessionWatchTimer=setInterval(async()=>{
  const valid=await validateExistingSession();
  if(!valid){
   clearInterval(sessionWatchTimer);
   sessionWatchTimer=null;
   alert('Your Master ID verification session has expired. Please verify again to continue.');
   window.location.replace('already-registered.html?return=registration-portals.html');
  }
 },15000);
}

async function boot(){
 showSection('identityGate');
 $('loaderStatus').textContent='VERIFYING PARTICIPANT ACCESS…';

 // HARD GATE: this page must never expose the six event portals without
 // a currently valid server-issued Master ID access session.
 const sessionValid=await validateExistingSession();
 if(!sessionValid){
  localStorage.removeItem('exc_portal_access');
  $('loaderStatus').textContent='VERIFICATION REQUIRED';
  window.location.replace('already-registered.html?return=registration-portals.html');
  return;
 }

 renderEventChoices();
 $('loaderStatus').textContent='SELECT EVENT TO CONTINUE';
 try{
  const state=await api('public-registration-state');
  const map=new Map((state.events||[]).map(x=>[x.key,x]));
  const live=ORDER.map(([key,serial,title])=>{
   const p=map.get(key);
   return p?{...p,serial:String(p.serial||serial).padStart(2,'0'),displayTitle:title}:null;
  }).filter(Boolean).filter(x=>x.enabled!==false);
  if(live.length) events=live;
  renderEventChoices();
  $('loaderStatus').textContent='SELECT EVENT TO CONTINUE';
  startSessionWatch();
 }catch(e){
  // Keep the six known portals usable even if the public-state endpoint is temporarily unavailable.
  $('loaderStatus').textContent='SELECT EVENT TO CONTINUE';
 }
}

function renderEventChoices(){
 $('identityGrid').innerHTML=events.map(e=>{
  const fee=Number(e.fee||0);
  return '<div class="identity-card"><div class="choice-index">PORTAL '+esc(e.serial)+'</div><h3>'+esc(e.displayTitle||e.title)+'</h3><p>'+esc(e.description||'Register your Master ID for this event.')+'</p><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px"><span style="font:800 9px Orbitron;color:#d21e34">'+(fee?'₹'+fee:'FREE')+'</span><button class="portal-btn event-select" data-key="'+esc(e.key)+'" type="button">SELECT & CONTINUE →</button></div></div>';
 }).join('');
 document.querySelectorAll('.event-select').forEach(b=>b.addEventListener('click',()=>showEventDetails(b.dataset.key)));
}


let eventDetailOverlay=null;
function ensureEventDetailOverlay(){if(eventDetailOverlay)return eventDetailOverlay;eventDetailOverlay=document.createElement('div');eventDetailOverlay.className='event-detail-overlay registration-event-overlay';eventDetailOverlay.innerHTML='<div class="event-detail-shell"><button class="event-detail-close" type="button">×</button><div class="event-detail-orbit"><span></span><i></i></div><div class="event-detail-body"><p class="event-detail-eyebrow"></p><h2></h2><p class="event-detail-subtitle"></p><div class="event-detail-rule"></div><p class="event-detail-description"></p><div class="event-detail-grid"></div><div class="event-detail-points"></div><div class="event-detail-actions"><button class="event-detail-cta" type="button">CONTINUE TO REGISTRATION <span>›</span></button><button class="event-detail-back" type="button">CLOSE</button></div></div></div>';document.body.appendChild(eventDetailOverlay);const close=()=>{eventDetailOverlay.classList.remove('open');document.body.classList.remove('overlay-lock')};eventDetailOverlay.querySelector('.event-detail-close').onclick=close;eventDetailOverlay.querySelector('.event-detail-back').onclick=close;eventDetailOverlay.addEventListener('click',e=>{if(e.target===eventDetailOverlay)close()});eventDetailOverlay.querySelector('.event-detail-cta').onclick=()=>{const key=eventDetailOverlay.dataset.key;close();openEvent(key)};return eventDetailOverlay}
function showEventDetails(key){const e=events.find(x=>x.key===key);if(!e)return;const o=ensureEventDetailOverlay();o.dataset.key=key;o.style.setProperty('--detail-accent',e.accent||'#36aaff');o.querySelector('.event-detail-eyebrow').textContent='EVENT '+String(e.serial||'01').padStart(2,'0')+' // '+(e.displayTitle||e.title);o.querySelector('h2').textContent=e.displayTitle||e.title;o.querySelector('.event-detail-subtitle').textContent=e.subtitle||'Event registration portal';o.querySelector('.event-detail-description').textContent=e.description||'Register with your verified Master ID.';o.querySelector('.event-detail-grid').innerHTML=[['FORMAT',e.team?'TEAM EVENT':'INDIVIDUAL EVENT'],['FEE',Number(e.fee||0)?'₹'+Number(e.fee).toLocaleString('en-IN'):'FREE'],['ABSTRACT',e.requires_abstract?'REQUIRED':'NOT REQUIRED'],['STATUS',e.enabled===false?'CLOSED':'OPEN']].map(x=>'<div class="detail-stat"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>').join('');o.querySelector('.event-detail-points').innerHTML=(e.points||['Master ID verification','Registration confirmation']).map(x=>'<span><i>✦</i>'+esc(x)+'</span>').join('');o.classList.add('open');document.body.classList.add('overlay-lock')}

function openEvent(key){
 current=events.find(e=>e.key===key);if(!current)return;
 $('portalSerial').textContent=current.serial||'01';
 $('portalTitle').textContent=current.displayTitle||current.title;
 $('portalSubtitle').textContent=current.team?'TEAM EVENT • MASTER ID VERIFICATION':'EVENT REGISTRATION • MASTER ID VERIFICATION';
 $('portalDescription').textContent=current.description||'Enter your Master ID and registered mobile number to register for this event.';
 $('masterId').value=auth?.master?.masterId||'';$('registeredEmail').value=auth?.master?.email||'';$('mobile').value=auth?.master?.phone||'';
 const verified=!!auth?.accessToken&&!!auth?.master?.masterId;
 document.querySelectorAll('#registrationForm .verify-block').forEach(x=>x.hidden=verified);
 const notice=$('verifiedSessionNotice');
 if(notice){
  notice.hidden=!verified;
  notice.innerHTML=verified
   ? '<strong>✓ PARTICIPANT SESSION VERIFIED</strong><span>'+esc(auth.master.name||'Participant')+' • '+esc(auth.master.masterId)+' • '+esc(auth.master.email||'')+'</span>'
   : '';
 }
 $('teamFields').hidden=!current.team;
 $('abstractInfo').hidden=current.requires_abstract!==true;
 $('teamList').innerHTML='';
 if(current.team)addMember();
 setFormStatus('');
 showSection('portalShell');
 setTimeout(()=>$('masterId').focus(),50);
}

function addMember(){
 const list=$('teamList');
 if(list.children.length>=5){setFormStatus('Maximum 5 additional team members allowed.');return}
 const n=list.children.length+1,row=document.createElement('div');
 row.className='team-member-row';
 row.innerHTML='<div class="verify-head"><span>TEAM MEMBER '+n+'</span><b>MASTER ID + MOBILE</b></div><label>MASTER ID<input class="member-id" type="text" maxlength="11" placeholder="EX26-000000" autocomplete="off"></label><label>REGISTERED MOBILE NUMBER<input class="member-phone" type="tel" inputmode="numeric" maxlength="10" placeholder="10-digit registered mobile"></label><button class="portal-btn remove-member" type="button">REMOVE MEMBER</button>';
 row.querySelector('.remove-member').onclick=()=>{row.remove();renumber()};
 list.appendChild(row);
}
function renumber(){[...document.querySelectorAll('.team-member-row')].forEach((r,i)=>r.querySelector('.verify-head span').textContent='TEAM MEMBER '+(i+1))}

$('masterId').addEventListener('input',e=>e.target.value=formatId(e.target.value));
$('mobile').addEventListener('input',e=>e.target.value=phone(e.target.value));
$('registeredEmail').addEventListener('input',e=>e.target.value=e.target.value.trim().toLowerCase());
$('addMember').addEventListener('click',addMember);
$('backToEvents').addEventListener('click',()=>showSection('identityGate'));
$('backToDetails').addEventListener('click',()=>showSection('portalShell'));

$('registrationForm').addEventListener('submit',async e=>{
 e.preventDefault();
 setFormStatus('VERIFYING MASTER ID, GMAIL AND REGISTERED MOBILE…');
 const id=normalizeId($('masterId').value),email=String($('registeredEmail').value||'').trim().toLowerCase(),ph=phone($('mobile').value);
 $('masterId').value=id;$('mobile').value=ph;
 if(!/^EX26-\d{6}$/.test(id))return setFormStatus('Enter a valid Master ID in the format EX26-XXXXXX.');
 if(!/^[a-z0-9._%+-]+@gmail\.com$/.test(email))return setFormStatus('Enter the registered Gmail address.');
 if(!/^\d{10}$/.test(ph))return setFormStatus('Enter the 10-digit registered mobile number.');
 let team=[];
 try{
  let identity=null;
  if(auth?.accessToken){
   identity=await api('user-access',{action:'validate_session',accessToken:auth.accessToken});
   if(!identity.sessionValid||!identity.master)throw Error('Your participant session has expired. Please verify your Master ID again.');
   auth.master=identity.master;
   auth.sessionExpiresAt=Number(identity.sessionExpiresAt||auth.sessionExpiresAt);
   localStorage.setItem('exc_portal_access',JSON.stringify({accessToken:auth.accessToken,master:auth.master,expiresAt:auth.sessionExpiresAt}));
  }else{
   identity=await api('user-access',{masterId:id,email,phone:ph});
   if(!identity.accessToken||!identity.master)throw Error('Unable to verify this Master ID.');
   auth={accessToken:identity.accessToken,master:identity.master,sessionExpiresAt:Number(identity.sessionExpiresAt||Date.now()+1800000)};
   localStorage.setItem('exc_portal_access',JSON.stringify({accessToken:auth.accessToken,master:auth.master,expiresAt:auth.sessionExpiresAt}));
  }
  if(current.team){
   const rows=[...document.querySelectorAll('.team-member-row')];
   if(!rows.length)throw Error('ADD AT LEAST ONE TEAM MEMBER.');
   const seen=new Set([id]);
   for(const row of rows){
    const mid=normalizeId(row.querySelector('.member-id').value),mp=phone(row.querySelector('.member-phone').value);
    if(!/^EX26-\d{6}$/.test(mid)||!/^\d{10}$/.test(mp))throw Error('Enter a valid Master ID and registered mobile for every team member.');
    if(seen.has(mid))throw Error('Duplicate team member Master ID: '+mid);
    seen.add(mid);
    const vr=await api('verify-team-member',{masterId:mid,phone:mp});
    team.push({masterId:vr.master.masterId,phone:vr.master.phone,name:vr.master.name,email:vr.master.email||'',year:vr.master.year||''});
   }
  }
  current.verifiedTeam=team;
  openPayment();
 }catch(err){
  const overlay=$('identityErrorOverlay'),msg=$('identityErrorText');
  if(overlay&&msg){msg.textContent=err.message||'The Master ID, Gmail or mobile number does not match.';overlay.hidden=false;setTimeout(()=>{overlay.hidden=true},1600)}
  setFormStatus(err.message||'Unable to verify registration details.')
}
});


function downloadCard(title,rows,filename){const escHtml=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));const html='<!doctype html><html><head><meta charset="utf-8"><title>'+escHtml(title)+'</title><style>body{font-family:Arial,sans-serif;background:#eef3ff;padding:30px;color:#14224d}.card{max-width:620px;margin:auto;background:#fff;border:2px solid #173fbe;border-radius:20px;padding:28px;box-shadow:0 15px 45px #ccd5ef}.brand{font-size:12px;letter-spacing:3px;color:#d11d31;font-weight:800}.title{font-size:30px;color:#173fbe;margin:8px 0 22px;font-weight:900}.row{padding:12px 0;border-top:1px solid #e1e6f3}.label{font-size:10px;color:#68748f;font-weight:800;text-transform:uppercase}.value{font-size:15px;font-weight:800;margin-top:5px}</style></head><body><div class="card"><div class="brand">EPISTEME // EXCELSIOR\'26</div><div class="title">'+escHtml(title)+'</div>'+rows.map(r=>'<div class="row"><div class="label">'+escHtml(r[0])+'</div><div class="value">'+escHtml(r[1])+'</div></div>').join('')+'</div></body></html>';const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function openPayment(){
 const fee=Number(current.fee||0);
 $('gateSerial').textContent='02';
 $('gateTitle').textContent=fee?'PAYMENT':'CONFIRM REGISTRATION';
 $('gateType').textContent=current.displayTitle||current.title;
 $('gateAmount').textContent=fee?'₹'+fee.toLocaleString('en-IN'):'FREE';
 $('gateNote').textContent=fee?(current.note||'Pay using the QR code and enter the transaction reference.'):'This event is free. No payment is required.';
 $('gatePaid').checked=false;$('gateUtr').value='';setGateStatus('');
 $('paidCheckWrap').hidden=!fee;$('utrWrap').hidden=!fee;
 const box=$('gateQr');box.replaceChildren();
 if(!fee)box.textContent='NO PAYMENT REQUIRED';
 else if(current.qr){
  const img=new Image();img.alt='Payment QR';img.src=current.qr;
  img.onload=()=>box.replaceChildren(img);img.onerror=()=>box.textContent='QR NOT AVAILABLE';
 }else box.textContent='PAYMENT QR NOT CONFIGURED';
 showSection('paymentGate');
}

$('continueToPortal').addEventListener('click',async()=>{
 const fee=Number(current.fee||0),utr=$('gateUtr').value.trim();
 if(fee&&!$('gatePaid').checked)return setGateStatus('CONFIRM PAYMENT FIRST');
 if(fee&&!/^[A-Za-z0-9\-/]{6,40}$/.test(utr))return setGateStatus('ENTER A VALID 6–40 CHARACTER UTR / TRANSACTION REFERENCE');
 const btn=$('continueToPortal');
 btn.disabled=true;setGateStatus('');$('creationOverlay').hidden=false;document.body.classList.add('creation-active');
 const timer=setInterval(()=>{
  const s=$('creationStatus');
  if(s.textContent.includes('VERIFYING'))s.textContent='SECURING EVENT REGISTRATION…';
  else if(s.textContent.includes('SECURING'))s.textContent='SAVING MASTER ID TO EVENT…';
  else s.textContent='FINALISING EVENT REGISTRATION…';
 },1600);
 try{
  const created=await api('create-event-registration',{accessToken:auth.accessToken,masterId:auth.master.masterId,name:auth.master.name,phone:auth.master.phone,eventKey:current.key,utr:fee?utr:'',customFields:{},teamMembers:current.team?current.verifiedTeam||[]:[]});
  clearInterval(timer);
  $('creationStatus').textContent='REGISTRATION CONFIRMED • READY';
  $('successEvent').textContent=current.displayTitle||current.title;
  const teamIds=[auth.master.masterId,...(current.verifiedTeam||[]).map(m=>m.masterId)].filter(Boolean);
  const teamBox=$('successTeamMembers'),teamIdsBox=$('successTeamIds'),masterLabel=$('successMasterLabel');
  if(current.team){
    teamBox.hidden=false;
    teamIdsBox.innerHTML=teamIds.map(x=>'<span class="team-id-chip">'+esc(x)+'</span>').join('');
    masterLabel.textContent='TEAM LEAD MASTER ID';
  }else{
    teamBox.hidden=true;
    masterLabel.textContent='MASTER ID';
  }
  $('registrationId').textContent=auth.master.masterId||'';
  $('successMessage').textContent=(auth.master.masterId||'Your Master ID')+' has been successfully registered for '+(current.displayTitle||current.title)+'.';
  $('abstractButton').hidden=current.requires_abstract!==true;
  $('successOverlay').hidden=false;
 }catch(err){
  clearInterval(timer);$('creationOverlay').hidden=true;document.body.classList.remove('creation-active');
  setGateStatus(err.message||'Unable to complete event registration.');btn.disabled=false;return;
 }
 setTimeout(()=>{$('creationOverlay').hidden=true;document.body.classList.remove('creation-active');btn.disabled=false},450);
});

$('downloadEventCard').addEventListener('click',()=>downloadCard('EVENT REGISTRATION CARD',[
 ['Participant',auth?.master?.name||''],
 ['Master ID',auth?.master?.masterId||''],
 ['Registered Gmail',auth?.master?.email||$('registeredEmail').value],
 ['Event',current?.displayTitle||current?.title||''],
 ['Status','REGISTERED']
],(current?.key||'event')+'-registration-card.html'));
$('abstractButton').addEventListener('click',()=>location.href='abstract.html');
$('closeSuccess').addEventListener('click',()=>{$('successOverlay').hidden=true;showSection('identityGate')});

const jarvisBtn=$('jarvisBtn'),panel=$('jarvisPanel'),jarvisClose=$('jarvisClose');
const routes={HOME:'site.html',REGISTRATIONS:'registration.html',PROFILE:'profile.html','BROCHURE':'general-rules.html',CONTACTS:'contact.html'};
jarvisBtn.addEventListener('click',()=>{panel.classList.add('open');panel.setAttribute('aria-hidden','false')});
jarvisClose.addEventListener('click',()=>{panel.classList.remove('open');panel.setAttribute('aria-hidden','true')});
panel.addEventListener('click',e=>{if(e.target===panel)jarvisClose.click()});
document.querySelectorAll('.jarvis-links button').forEach(b=>b.addEventListener('click',()=>{if(routes[b.dataset.target])location.href=routes[b.dataset.target]}));
boot();
})();