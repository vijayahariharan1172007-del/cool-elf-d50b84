(() => {
 const $=id=>document.getElementById(id);
 let auth=null,current=null,currentEventKey='';
 const accessKey='exc_portal_access';
 const readSession=()=>{try{return JSON.parse(localStorage.getItem(accessKey)||'null')}catch{return null}};
 const saveSession=(r)=>{
   auth={accessToken:r.accessToken,master:r.master,expiresAt:Number(r.sessionExpiresAt||Date.now()+Number(r.sessionMinutes||30)*60*1000)};
   localStorage.setItem(accessKey,JSON.stringify(auth));
 };
 const api=async(body)=>{
   const r=await fetch('/api/submit-abstract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const raw=await r.text();let j={};try{j=JSON.parse(raw)}catch{}
   if(!r.ok||j.ok===false){const detail=j.error||(raw&&raw.slice(0,240))||`HTTP ${r.status}`;throw Error(`${detail} [HTTP ${r.status}]`);}
   return j;
 };
 const sessionApi=async(body)=>{
   const r=await fetch('/api/user-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const j=await r.json().catch(()=>({}));
   if(!r.ok||j.ok===false)throw Error(j.error||'Session expired');
   return j;
 };
 const normalize=s=>String(s||'').replace(/\D/g,'').slice(-10);
 function showLogin(message=''){
   $('abstractLogin').hidden=false;
   $('abstractEvents').hidden=true;
   $('abstractLoginStatus').textContent=message;
   $('verifyAbstract').disabled=false;
 }
 async function loadEligible(){
   const r=await api({action:'eligible',accessToken:auth.accessToken,masterId:auth.master.masterId});
   $('abstractLogin').hidden=true;
   $('abstractEvents').hidden=false;
   $('abstractUserName').textContent=auth.master.name||'PARTICIPANT';
   $('abstractUserId').textContent='MASTER ID • '+auth.master.masterId;
   const list=$('abstractEventList');
   if(!r.events?.length){
     list.innerHTML='<div class="identity-card"><h3>SUBMISSION NOT AVAILABLE</h3><p>You can submit only after you have registered for a submission-based event such as Poster, Slogan, Symposium 1 or Symposium 2.</p></div>';
     return;
   }
   list.innerHTML=r.events.map((e,i)=>`<button class="abstract-event" type="button" data-key="${e.eventKey}"><span>${String(i+1).padStart(2,'0')}</span><b>${e.eventTitle}</b><small>${e.submitted?'SUBMISSION ALREADY RECEIVED':'SUBMISSION REQUIRED'}</small><i>→</i></button>`).join('');
   list.querySelectorAll('.abstract-event').forEach(btn=>btn.onclick=()=>openEditor(r.events.find(e=>e.eventKey===btn.dataset.key)));
 }
 async function tryExistingSession(){
   const stored=readSession();
   if(!stored?.accessToken||!stored?.master?.masterId||Date.now()>=Number(stored.expiresAt||0))return false;
   try{
     const v=await sessionApi({action:'validate_session',accessToken:stored.accessToken});
     if(!v.sessionValid)throw Error('Session expired');
     auth={accessToken:stored.accessToken,master:v.master,expiresAt:Number(v.sessionExpiresAt||stored.expiresAt||0)};
     localStorage.setItem(accessKey,JSON.stringify(auth));
     await loadEligible();
     return true;
   }catch(e){
     localStorage.removeItem(accessKey);
     return false;
   }
 }
 $('verifyAbstract').onclick=async()=>{
   const masterId=$('abstractMasterId').value.trim(),phone=normalize($('abstractPhone').value),status=$('abstractLoginStatus');
   if(!masterId||phone.length!==10)return status.textContent='ENTER A VALID MASTER ID AND 10-DIGIT MOBILE NUMBER.';
   $('verifyAbstract').disabled=true;status.textContent='VERIFYING MASTER ID…';
   try{
     const v=await sessionApi({masterId,phone});
     saveSession(v);
     await loadEligible();
   }catch(e){status.textContent=e.message;$('verifyAbstract').disabled=false;}
 };
 function openEditor(e){
   if(!e||!e.eventKey){
     $('abstractStatus').textContent='Unable to identify the selected event. Please go back and select the event again.';
     return;
   }
   current=e;
   currentEventKey=String(e.eventKey);
   $('abstractEditor').dataset.eventKey=currentEventKey;
   $('abstractEventList').hidden=true;$('abstractEditor').hidden=false;
   $('editorEventTitle').textContent=e.eventTitle||currentEventKey.toUpperCase();
   $('abstractStatus').textContent=e.submitted?'A submission has already been received for this event.':'SELECT THE FILE YOU WANT TO SUBMIT.';
   $('submissionFile').value='';$('submissionFileName').textContent='NO FILE SELECTED';
   const disabled=!!e.submitted;
   $('submissionFile').disabled=disabled;$('submitAbstract').disabled=disabled;
 }
 $('submissionFile').onchange=()=>{
   const f=$('submissionFile').files?.[0];
   $('submissionFileName').textContent=f?`${f.name} • ${(f.size/1024/1024).toFixed(2)} MB`:'NO FILE SELECTED';
 };
 $('abstractBack').onclick=()=>{$('abstractEditor').hidden=true;$('abstractEventList').hidden=false;$('abstractStatus').textContent='';current=null;currentEventKey='';};
 $('submitAbstract').onclick=async()=>{
   const file=$('submissionFile').files?.[0];
   if(!file)return $('abstractStatus').textContent='CHOOSE YOUR ABSTRACT FILE FIRST.';
   const allowed=['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
   const ext=(file.name.split('.').pop()||'').toLowerCase();
   if(!allowed.includes(file.type)&&!['pdf','doc','docx'].includes(ext))return $('abstractStatus').textContent='ONLY PDF, DOC OR DOCX FILES ARE ALLOWED.';
   if(file.size>10*1024*1024)return $('abstractStatus').textContent='FILE MUST BE 10 MB OR SMALLER.';
   $('submitAbstract').disabled=true;$('abstractStatus').textContent='PREPARING SECURE UPLOAD…';
   try{
     const eventKey=currentEventKey||$('abstractEditor').dataset.eventKey||'';
     if(!eventKey)throw Error('No event selected. Please go back and select the event again.');
     const u=await api({action:'upload-url',accessToken:auth.accessToken,masterId:auth.master.masterId,eventKey,fileName:file.name,fileType:file.type||'application/octet-stream',fileSize:file.size});
     $('abstractStatus').textContent='UPLOADING FILE…';
     const up=await fetch(u.signedUrl,{method:'PUT',headers:{'content-type':file.type||'application/octet-stream','x-upsert':'false','cache-control':'3600'},body:file});
     if(!up.ok){const detail=await up.text().catch(()=> '');throw Error(detail||'FILE UPLOAD FAILED');}
     await api({action:'submit',accessToken:auth.accessToken,masterId:auth.master.masterId,eventKey,filePath:u.path,fileName:file.name,fileType:file.type||'application/octet-stream',fileSize:file.size});
     current.submitted=true;$('abstractStatus').textContent='FILE UPLOADED • SUBMISSION RECEIVED • AWAITING REVIEW.';$('submissionFile').value='';$('submissionFileName').textContent='SUBMISSION RECEIVED';
   }catch(e){$('abstractStatus').textContent=e.message||'Unable to submit file.';$('submitAbstract').disabled=false;}
 };
 (async()=>{
   $('abstractLoginStatus').textContent='CHECKING SECURE SESSION…';
   if(!(await tryExistingSession()))showLogin('VERIFY YOUR MASTER ID AND REGISTERED MOBILE TO ENTER.');
 })();
})();
