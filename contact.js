// ================================================================
// CONTACT CONTENT
// Add as many objects as you want. Example fields: title, tag, body.
// HTML is allowed inside body so you can add phone, email, socials, etc.
// ================================================================
const CONTACTS = [
  {number:'01', tag:'EVENT COMMAND', title:'EPISTEME CORE TEAM', body:'<p>Add the official event coordinator name, role and contact details here.</p>'},
  {number:'02', tag:'ACADEMIC DESK', title:'FACULTY / ACADEMIC CONTACT', body:'<p>Add faculty coordinator details, department information or academic queries here.</p>'},
  {number:'03', tag:'REGISTRATION DESK', title:'REGISTRATION SUPPORT', body:'<p>Add registration help, email, phone number or payment support details here.</p>'}
];
const container=document.getElementById('contactContainer');
container.innerHTML=CONTACTS.map(c=>`<article class="contact-box"><div class="box-top"><div class="box-number">${c.number}</div><div><span>${c.tag}</span><h2>${c.title}</h2></div><b class="box-chevron" aria-hidden="true">⌄</b></div><div class="box-body"><div class="body-inner">${c.body}</div></div></article>`).join('');
container.addEventListener('click',e=>{const box=e.target.closest('.contact-box');if(!box)return;box.classList.toggle('open');box.querySelector('.box-top b').textContent=box.classList.contains('open')?'⌃':'⌄'});


const jarvisBtn=document.getElementById('jarvisBtn'),panel=document.getElementById('jarvisPanel'),close=document.getElementById('jarvisClose');function openJarvis(){panel.classList.add('open');panel.setAttribute('aria-hidden','false')}function closeJarvis(){panel.classList.remove('open');panel.setAttribute('aria-hidden','true')}jarvisBtn.addEventListener('click',openJarvis);close.addEventListener('click',closeJarvis);panel.addEventListener('click',e=>{if(e.target===panel)closeJarvis()});
const routes={'HOME':'site.html','EVENTS':'events.html','GENERAL RULES':'general-rules.html','REGISTRATIONS':'registration.html','PROFILE':'profile.html','CONTACTS':'contact.html'};document.querySelectorAll('a.page-link').forEach(a=>a.addEventListener('click',e=>{const href=a.getAttribute('href');if(href){e.preventDefault();location.href=href}}));document.querySelectorAll('.jarvis-links button').forEach(btn=>btn.addEventListener('click',()=>{const t=btn.dataset.target;if(t==='CONTACTS'){closeJarvis();return}if(routes[t]){closeJarvis();location.href=routes[t]}}));document.addEventListener('keydown',e=>{if(e.key==='Escape')closeJarvis()});
