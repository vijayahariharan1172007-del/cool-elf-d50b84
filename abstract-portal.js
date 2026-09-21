(() => {
 const $=id=>document.getElementById(id);
 const accessKey='exc_portal_access';
 let auth=null,current=null,currentEventKey='';

 const api=async(body)=>{
   const r=await fetch('/api/submit-abstract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
   const raw=await r.text();let j={};try{j=JSON.parse(raw)}catch{}
   if(!r.ok||j.ok===false){const detail=j.error||(raw&&raw.slice(0,240))||`HTTP ${r.status}`;throw Error(`${detail} [HTTP ${r.status}]`);}
   return j;
 };
 const sessionApi=async(body)=>{
   const r=await fetch('/api/user-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
   const j=await r.json().catch(()=>({}));
   if(!r.ok||j.ok===false)throw Error(j.error||'Session expired');
   return j;
 };
 const readSession=()=>{try{return JSON.parse(localStorage.getItem(accessKey)||'null')}catch{return null}};

 function showMessage(msg){$('abstractStatus').textContent=msg||'';}

 function openEditor(e){
   if(!e||!e.eventKey){showMessage('Unable to identify the selected event. Please go back and select the event again.');return;}
   current=e;currentEventKey=String(e.eventKey).trim();
   $('abstractEditor').dataset.eventKey=currentEventKey;
   $('abstractEventList').hidden=true;$('abstractEditor').hidden=false;
   $('editorEventTitle').textContent=e.eventTitle||currentEventKey.toUpperCase();
   showMessage(e.submitted?'A submission has already been received for this event.':'SELECT THE FILE YOU WANT TO SUBMIT.');
   $('submissionFile').value='';$('submissionFileName').textContent='NO FILE SELECTED';
   const disabled=!!e.submitted;
   $('submissionFile').disabled=disabled;$('submitAbstract').disabled=disabled;
 }

 async function loadEligible(){
   const r=await api({action:'eligible',accessToken:auth.accessToken,masterId:auth.master.masterId});
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

 $('abstractBack').onclick=()=>{$('abstractEditor').hidden=true;$('abstractEventList').hidden=false;showMessage('');current=null;currentEventKey='';};

 $('submissionFile').onchange=()=>{
   const f=$('submissionFile').files?.[0];
   $('submissionFileName').textContent=f?`${f.name} • ${(f.size/1024/1024).toFixed(2)} MB`:'NO FILE SELECTED';
 };

 $('submitAbstract').onclick=async()=>{
   const file=$('submissionFile').files?.[0];
   if(!file)return showMessage('CHOOSE YOUR ABSTRACT FILE FIRST.');
   const allowed=['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
   const ext=(file.name.split('.').pop()||'').toLowerCase();
   if(!allowed.includes(file.type)&&!['pdf','doc','docx'].includes(ext))return showMessage('ONLY PDF, DOC OR DOCX FILES ARE ALLOWED.');
   if(file.size>10*1024*1024)return showMessage('FILE MUST BE 10 MB OR SMALLER.');
   $('submitAbstract').disabled=true;showMessage('PREPARING SECURE UPLOAD…');
   try{
     const eventKey=String(currentEventKey||$('abstractEditor').dataset.eventKey||'').trim();
     if(!eventKey)throw Error('No event selected. Please go back and select the event again.');
     const u=await api({action:'upload-url',accessToken:auth.accessToken,masterId:auth.master.masterId,eventKey,fileName:file.name,fileType:file.type||'application/octet-stream',fileSize:file.size});
     showMessage('UPLOADING FILE…');
     const up=await fetch(u.signedUrl,{method:'PUT',headers:{'content-type':file.type||'application/octet-stream','x-upsert':'false','cache-control':'3600'},body:file});
     if(!up.ok){const detail=await up.text().catch(()=> '');throw Error(detail||'FILE UPLOAD FAILED');}
     await api({action:'submit',accessToken:auth.accessToken,masterId:auth.master.masterId,eventKey,filePath:u.path,fileName:file.name,fileType:file.type||'application/octet-stream',fileSize:file.size});
     if(current)current.submitted=true;
     showMessage('FILE UPLOADED • SUBMISSION RECEIVED • AWAITING REVIEW.');
     $('submissionFile').value='';$('submissionFileName').textContent='SUBMISSION RECEIVED';
   }catch(e){showMessage(e.message||'Unable to submit file.');$('submitAbstract').disabled=false;}
 };

 (async()=>{
   const stored=readSession();
   if(!stored?.accessToken||!stored?.master?.masterId||Date.now()>=Number(stored.expiresAt||0)){
     location.href='abstract.html';return;
   }
   try{
     const v=await sessionApi({action:'validate_session',accessToken:stored.accessToken});
     if(!v.sessionValid)throw Error('Session expired');
     auth={accessToken:stored.accessToken,master:v.master,expiresAt:Number(v.sessionExpiresAt||stored.expiresAt||0)};
     localStorage.setItem(accessKey,JSON.stringify(auth));
     await loadEligible();
   }catch(e){
     localStorage.removeItem(accessKey);
     location.href='abstract.html';
   }
 })();
})();