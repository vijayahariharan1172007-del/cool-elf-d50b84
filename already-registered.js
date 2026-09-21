(()=>{
 const $=id=>document.getElementById(id);
 const normalizeId=v=>{let s=String(v??'').normalize('NFKC').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');if(/^EX26\d{1,6}$/.test(s))s='EX26-'+s.slice(4).padStart(6,'0');else if(/^EX26\d{6}$/.test(s))s='EX26-'+s.slice(4);return s};
 const normalizePhone=v=>String(v??'').replace(/\D/g,'').slice(-10);
 const setStatus=(message,type='')=>{const el=$('accessStatus');el.textContent=message;el.dataset.state=type};
 const api=async(body)=>{
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
   try{
     const r=await fetch('/api/user-access',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:controller.signal});
     const text=await r.text();let j={};try{j=JSON.parse(text)}catch{}
     if(!r.ok||j.ok===false)throw Error(j.error||`Verification service returned ${r.status}`);
     return j;
   }catch(e){if(e.name==='AbortError')throw Error('Verification timed out. Please try again.');throw e}
   finally{clearTimeout(timer)}
 };
 const id=$('accessMasterId'),phone=$('accessPhone'),btn=$('verifyAccess'),card=$('recognizedParticipant');
 const syncMasterState=()=>{const v=normalizeId(id.value);if(/^EX26-\d{6}$/.test(v)){id.value=v;setStatus('Master ID recognised. Now enter the registered mobile number.','ready')}else if(id.value.trim()){setStatus('Master ID format not recognised. Use EX26-XXXXXX.','error')}else setStatus('')};
 const setButton=(disabled,label)=>{btn.disabled=disabled;btn.textContent=label};
 id.focus();
 id.addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,11);syncMasterState()});
 id.addEventListener('blur',syncMasterState);
 phone.addEventListener('input',e=>{let raw=e.target.value;if(raw.trim().startsWith('+'))e.target.value=raw.replace(/[^0-9+ ]/g,'').slice(0,16);else e.target.value=raw.replace(/\D/g,'').slice(0,10)});
 const verify=async()=>{
   card.hidden=true;setStatus('');
   const masterId=normalizeId(id.value),mobile=normalizePhone(phone.value);
   id.value=masterId;
   if(!/^EX26-\d{6}$/.test(masterId)){setStatus('Master ID not recognised. Enter it as EX26-XXXXXX, for example EX26-109136.','error');id.focus();return}
   if(mobile.length!==10){setStatus('Master ID is recognised. Now enter the same 10-digit registered mobile number.','error');phone.focus();return}
   id.value=masterId;phone.value=mobile;setButton(true,'VERIFYING…');setStatus('Checking Master ID and registered mobile…');
   try{
     const r=await api({masterId,master_id:masterId,phone:mobile,mobile:mobile});
     if(!r.accessToken||!r.master?.masterId)throw Error('Verification succeeded but the secure participant session was not returned.');
     localStorage.setItem('exc_portal_access',JSON.stringify({accessToken:r.accessToken,master:r.master,expiresAt:Number(r.sessionExpiresAt||Date.now()+1800000)}));
     $('recognizedName').textContent=r.master.name||'Participant';$('recognizedMaster').textContent=r.master.masterId||masterId;card.hidden=false;
     setStatus('Participant recognised. Click ENTER EVENT PORTAL to continue.','ok');setButton(false,'VERIFIED ✓');
   }catch(e){setStatus(e.message||'Invalid Master ID or registered mobile number.','error');setButton(false,'VERIFY PARTICIPANT →')}
 };
 btn.addEventListener('click',verify);
 $('enterEventPortal').addEventListener('click',()=>{location.href='registration-portals.html'});
 phone.addEventListener('keydown',e=>{if(e.key==='Enter')verify()});id.addEventListener('keydown',e=>{if(e.key==='Enter')phone.focus()});
})();
