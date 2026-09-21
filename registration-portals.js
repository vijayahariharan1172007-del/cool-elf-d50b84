(() => {
  const $ = id => document.getElementById(id);
  const api = async (path, body={}) => {
    const r = await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
    const j = await r.json().catch(()=>({}));
    if(!r.ok || j.ok===false) throw Error(j.error || 'Request failed');
    return j;
  };

  const ORDER=[
    ['symposium-1','01','SYMPOSIUM 1'],
    ['symposium-2','02','SYMPOSIUM 2'],
    ['junior-quiz','03','JUNIOR QUIZ'],
    ['senior-quiz','04','SENIOR QUIZ'],
    ['meme','05','MEME & SLOGAN'],
    ['poster-slogan','06','POSTER']
  ];

  let events=[], current=null, auth=null;

  const normalizeId=v=>{
    const s=String(v??'').normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]/g,'');
    if(/^EX26\d{6}$/.test(s)) return 'EX26-'+s.slice(4);
    return s;
  };
  const formatId=v=>{
    let s=String(v??'').normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]/g,'');
    if(s.startsWith('EX26')) return 'EX26-'+s.slice(4).replace(/\D/g,'').slice(0,6);
    return s.slice(0,11);
  };
  const phone=v=>String(v??'').replace(/\D/g,'').slice(-10);
  const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function show(view){
    ['loadingView','eventsView','detailsView','paymentView'].forEach(id=>$(id).hidden=id!==view);
  }
  function message(el,text,type=''){
    el.textContent=text||'';
    el.className='message'+(type?' '+type:'');
  }

  async function boot(){
    show('loadingView');
    $('loadingStatus').textContent='CONNECTING TO REGISTRATION SYSTEM…';
    try{
      const saved=(()=>{try{return JSON.parse(localStorage.getItem('exc_portal_access')||'null')}catch{return null}})();
      if(!saved?.accessToken || !saved?.master?.masterId || Date.now()>=Number(saved.expiresAt||0)){
        location.replace('already-registered.html'); return;
      }

      const checked=await api('user-access',{action:'validate_session',accessToken:saved.accessToken});
      if(!checked?.sessionValid){localStorage.removeItem('exc_portal_access');location.replace('already-registered.html');return;}
      auth={accessToken:saved.accessToken,master:checked.master,sessionExpiresAt:Number(checked.sessionExpiresAt)};
      localStorage.setItem('exc_portal_access',JSON.stringify({accessToken:auth.accessToken,master:auth.master,expiresAt:auth.sessionExpiresAt}));

      const state=await api('public-registration-state');
      const map=new Map((state.events||[]).map(x=>[x.key,x]));
      events=ORDER.map(([key,serial,label])=>{
        const p=map.get(key);
        return p?{...p,serial:String(p.serial||serial).padStart(2,'0'),displayTitle:label}:null;
      }).filter(Boolean).filter(x=>x.enabled!==false);

      if(!events.length) throw Error('NO EVENT REGISTRATION PORTALS ARE CURRENTLY AVAILABLE.');
      renderEvents();
      showEvents();
    }catch(e){
      $('loadingStatus').textContent=e.message||'Unable to load registration portals.';
      $('loadingStatus').className='statusbar error';
      setTimeout(()=>{ if(!auth) location.replace('already-registered.html'); },1800);
    }
  }

  function renderEvents(){
    $('participantBox').innerHTML='<div><small>VERIFIED PARTICIPANT</small><strong>'+escapeHtml(auth.master.name||'PARTICIPANT')+'</strong><span>'+escapeHtml(auth.master.masterId||'')+'</span></div><div class="session-badge">SESSION ACTIVE</div>';
    $('eventGrid').innerHTML=events.map(p=>{
      const fee=Number(p.fee||0);
      return '<button class="event-card" type="button" data-key="'+escapeHtml(p.key)+'"><span class="event-number">PORTAL '+escapeHtml(p.serial)+'</span><span class="event-title">'+escapeHtml(p.displayTitle||p.title)+'</span><span class="event-meta"><span>'+((p.team)?'TEAM EVENT':'INDIVIDUAL EVENT')+'</span>'+(p.requires_abstract===true?'<span>• SUBMISSION REQUIRED</span>':'')+'</span><strong class="event-fee">'+(fee?'₹'+fee:'FREE')+'</strong><span class="arrow">→</span></button>';
    }).join('');
    document.querySelectorAll('.event-card').forEach(b=>b.addEventListener('click',()=>openDetails(b.dataset.key)));
  }

  function showEvents(){
    show('eventsView');
  }

  function openDetails(key){
    current=events.find(x=>x.key===key);
    if(!current) return;
    $('detailsTitle').textContent=current.displayTitle||current.title;
    $('detailsSubtitle').textContent=current.team?'TEAM EVENT • VERIFY EVERY TEAM MEMBER':'INDIVIDUAL EVENT • RE-VERIFY YOUR DETAILS';
    $('detailsFee').textContent=Number(current.fee||0)?'₹'+current.fee:'FREE';
    $('mainMasterId').value=auth.master.masterId||'';
    $('mainMobile').value=phone(auth.master.phone||'');
    $('detailsMessage').textContent='';
    $('teamList').innerHTML='';
    $('teamSection').hidden=!current.team;
    $('abstractSection').hidden=current.requires_abstract!==true;
    if(current.team) addMember();
    show('detailsView');
  }

  function addMember(){
    const list=$('teamList');
    if(list.children.length>=5){message($('detailsMessage'),'MAXIMUM 5 ADDITIONAL TEAM MEMBERS');return;}
    const n=list.children.length+1;
    const row=document.createElement('div');
    row.className='team-row';
    row.innerHTML='<div class="team-head"><span>TEAM MEMBER '+n+'</span><button class="remove" type="button">REMOVE</button></div><div class="fields"><label>MASTER ID<input class="member-id" maxlength="11" placeholder="EX26-000000" autocomplete="off"></label><label>REGISTERED MOBILE<input class="member-phone" maxlength="10" inputmode="numeric" placeholder="10-digit mobile"></label></div>';
    row.querySelector('.remove').onclick=()=>{row.remove();renumber();};
    list.appendChild(row);
  }
  function renumber(){[...document.querySelectorAll('.team-row')].forEach((r,i)=>r.querySelector('.team-head span').textContent='TEAM MEMBER '+(i+1));}

  $('mainMasterId').addEventListener('input',e=>e.target.value=formatId(e.target.value));
  $('mainMobile').addEventListener('input',e=>e.target.value=phone(e.target.value));
  $('addMember').onclick=()=>{message($('detailsMessage'),'');addMember();};
  $('backEvents').onclick=showEvents;
  $('cancelDetails').onclick=showEvents;

  $('continueDetails').onclick=async()=>{
    const btn=$('continueDetails');btn.disabled=true;message($('detailsMessage'),'VERIFYING PARTICIPANT DETAILS…');
    try{
      const id=normalizeId($('mainMasterId').value), ph=phone($('mainMobile').value);
      if(id!==normalizeId(auth.master.masterId)||ph!==phone(auth.master.phone)) throw Error('Master ID or registered mobile number does not match the verified participant.');
      let team=[];
      if(current.team){
        const rows=[...document.querySelectorAll('.team-row')];
        if(!rows.length) throw Error('ADD AT LEAST ONE TEAM MEMBER.');
        const seen=new Set([id]);
        for(const row of rows){
          const mid=normalizeId(row.querySelector('.member-id').value), mp=phone(row.querySelector('.member-phone').value);
          if(!/^EX26-\d{6}$/.test(mid)||!/^\d{10}$/.test(mp)) throw Error('ENTER A VALID MASTER ID AND MOBILE FOR EVERY TEAM MEMBER.');
          if(seen.has(mid)) throw Error('DUPLICATE TEAM MEMBER: '+mid);
          seen.add(mid);
          const vr=await api('verify-team-member',{masterId:mid,phone:mp});
          team.push({masterId:vr.master.masterId,phone:vr.master.phone,name:vr.master.name,email:vr.master.email||'',year:vr.master.year||''});
        }
      }
      current.verifiedTeam=team;
      openPayment();
    }catch(e){message($('detailsMessage'),e.message||'Unable to verify details.');}
    finally{btn.disabled=false;}
  };

  function openPayment(){
    const fee=Number(current.fee||0);
    $('paymentTitle').textContent=fee?'PAYMENT':'FINAL CONFIRMATION';
    $('paymentFee').textContent=fee?'₹'+fee:'FREE';
    $('paymentAmount').textContent=fee?'₹'+fee:'NO PAYMENT REQUIRED';
    $('paymentNote').textContent=fee?(current.note||'Pay using the QR code. Enter the exact UTR / transaction reference before confirming.'):'This event is free. No payment or UTR is required.';
    $('utr').value='';
    $('utr').parentElement.hidden=!fee;
    $('paymentMessage').textContent='';
    const box=$('qrBox');box.innerHTML='';
    if(!fee){box.innerHTML='<div style="color:#16884d;font:800 10px Orbitron;text-align:center">FREE EVENT<br><br>NO PAYMENT REQUIRED</div>';}
    else if(current.qr){
      const img=document.createElement('img');img.src=current.qr;img.alt='Payment QR code';img.onload=()=>box.replaceChildren(img);img.onerror=()=>box.innerHTML='<div class="qr-missing">PAYMENT QR COULD NOT BE LOADED.</div>';
    }else box.innerHTML='<div class="qr-missing">PAYMENT QR NOT CONFIGURED.</div>';
    show('paymentView');
  }

  $('backDetails').onclick=()=>show('detailsView');
  $('cancelPayment').onclick=()=>show('detailsView');

  $('confirm').onclick=async()=>{
    const fee=Number(current.fee||0), utr=$('utr').value.trim();
    if(fee && !/^[A-Za-z0-9\-/]{6,40}$/.test(utr)){message($('paymentMessage'),'ENTER A VALID 6–40 CHARACTER UTR / TRANSACTION REFERENCE.');return;}
    const btn=$('confirm');btn.disabled=true;message($('paymentMessage'),'CREATING YOUR REGISTRATION…');
    try{
      const r=await api('create-event-registration',{
        accessToken:auth.accessToken,
        masterId:auth.master.masterId,
        name:auth.master.name,
        phone:auth.master.phone,
        eventKey:current.key,
        utr:fee?utr:'',
        customFields:{},
        teamMembers:current.team?current.verifiedTeam||[]:[]
      });
      $('successEvent').textContent=current.displayTitle||current.title;
      $('passName').textContent=auth.master.name||'PARTICIPANT';
      $('passId').textContent=auth.master.masterId||'';
      $('passMobile').textContent=auth.master.phone||'';
      $('registrationId').textContent='ID • '+(r.eventId||'SUBMITTED');
      const abstractRequired=current.requires_abstract===true;
      $('successNote').textContent=abstractRequired?'REGISTRATION CREATED • ABSTRACT SUBMISSION IS REQUIRED TO COMPLETE THIS EVENT.':'REGISTRATION SUCCESSFUL • DETAILS SAVED.';
      $('abstractButton').hidden=!abstractRequired;
      $('successView').hidden=false;
      if(window.QRCode){$('qrcode').innerHTML='';new QRCode($('qrcode'),{text:r.eventId||auth.master.masterId,width:78,height:78});}
    }catch(e){message($('paymentMessage'),e.message||'Unable to complete registration.');}
    finally{btn.disabled=false;}
  };

  $('abstractButton').onclick=()=>location.href='abstract.html';
  $('printPass').onclick=()=>window.print();
  $('returnEvents').onclick=()=>{$('successView').hidden=true;showEvents();};

  const jarvis=$('jarvisBtn'),panel=$('jarvisPanel'),close=$('jarvisClose');
  const routes={HOME:'site.html',REGISTRATIONS:'registration-portals.html',PROFILE:'profile.html','GENERAL RULES':'general-rules.html',CONTACTS:'contact.html'};
  function openJarvis(){panel.classList.add('open');panel.setAttribute('aria-hidden','false');}
  function closeJarvis(){panel.classList.remove('open');panel.setAttribute('aria-hidden','true');}
  jarvis.onclick=openJarvis;close.onclick=closeJarvis;
  panel.addEventListener('click',e=>{if(e.target===panel)closeJarvis();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeJarvis();});
  document.querySelectorAll('.jarvis-links button').forEach(b=>b.onclick=()=>{const target=routes[b.dataset.target];if(target)location.href=target;});

  boot();
})();