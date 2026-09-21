(() => {
const $=id=>document.getElementById(id);
const api=async(path,body={})=>{
 const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body),cache:'no-store'});
 const t=await r.text();let j={};try{j=JSON.parse(t)}catch{}
 if(!r.ok||j.ok===false)throw Error(j.error||'Request failed');
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

async function boot(){
 renderEventChoices();
 showSection('identityGate');
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
 document.querySelectorAll('.event-select').forEach(b=>b.addEventListener('click',()=>openEvent(b.dataset.key)));
}

function openEvent(key){
 current=events.find(e=>e.key===key);if(!current)return;
 $('portalSerial').textContent=current.serial||'01';
 $('portalTitle').textContent=current.displayTitle||current.title;
 $('portalSubtitle').textContent=current.team?'TEAM EVENT • MASTER ID VERIFICATION':'EVENT REGISTRATION • MASTER ID VERIFICATION';
 $('portalDescription').textContent=current.description||'Enter your Master ID and registered mobile number to register for this event.';
 $('masterId').value='';$('mobile').value='';
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
$('addMember').addEventListener('click',addMember);
$('backToEvents').addEventListener('click',()=>showSection('identityGate'));
$('backToDetails').addEventListener('click',()=>showSection('portalShell'));

$('registrationForm').addEventListener('submit',async e=>{
 e.preventDefault();
 setFormStatus('VERIFYING MASTER ID AND REGISTERED MOBILE…');
 const id=normalizeId($('masterId').value),ph=phone($('mobile').value);
 $('masterId').value=id;$('mobile').value=ph;
 if(!/^EX26-\d{6}$/.test(id))return setFormStatus('Enter a valid Master ID in the format EX26-XXXXXX.');
 if(!/^\d{10}$/.test(ph))return setFormStatus('Enter the 10-digit registered mobile number.');
 let team=[];
 try{
  const identity=await api('user-access',{masterId:id,phone:ph});
  if(!identity.accessToken||!identity.master)throw Error('Unable to verify this Master ID.');
  auth={accessToken:identity.accessToken,master:identity.master,sessionExpiresAt:Number(identity.sessionExpiresAt||Date.now()+1800000)};
  localStorage.setItem('exc_portal_access',JSON.stringify({accessToken:auth.accessToken,master:auth.master,expiresAt:auth.sessionExpiresAt}));
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
 }catch(err){setFormStatus(err.message||'Unable to verify registration details.')}
});

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
  await api('create-event-registration',{accessToken:auth.accessToken,masterId:auth.master.masterId,name:auth.master.name,phone:auth.master.phone,eventKey:current.key,utr:fee?utr:'',customFields:{},teamMembers:current.team?current.verifiedTeam||[]:[]});
  clearInterval(timer);
  $('creationStatus').textContent='REGISTRATION CONFIRMED • READY';
  $('successEvent').textContent=current.displayTitle||current.title;
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

$('abstractButton').addEventListener('click',()=>location.href='abstract.html');
$('closeSuccess').addEventListener('click',()=>{$('successOverlay').hidden=true;showSection('identityGate')});

const jarvisBtn=$('jarvisBtn'),panel=$('jarvisPanel'),jarvisClose=$('jarvisClose');
const routes={HOME:'site.html',REGISTRATIONS:'registration-portals.html',PROFILE:'profile.html','GENERAL RULES':'general-rules.html',CONTACTS:'contact.html'};
jarvisBtn.addEventListener('click',()=>{panel.classList.add('open');panel.setAttribute('aria-hidden','false')});
jarvisClose.addEventListener('click',()=>{panel.classList.remove('open');panel.setAttribute('aria-hidden','true')});
panel.addEventListener('click',e=>{if(e.target===panel)jarvisClose.click()});
document.querySelectorAll('.jarvis-links button').forEach(b=>b.addEventListener('click',()=>{if(routes[b.dataset.target])location.href=routes[b.dataset.target]}));
boot();
})();