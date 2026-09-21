// ================================================================
// GENERAL RULES CONTENT
// Add as many objects as you need. The box grows automatically.
// For very long content, the inner body becomes scrollable.
// ================================================================
const RULES = [
  { number:'01', title:'RULE MODULE 01', content:'<p>Replace this text with the first official rule.</p>' },
  { number:'02', title:'RULE MODULE 02', content:'<p>Replace this text with the second official rule.</p>' },
  { number:'03', title:'RULE MODULE 03', content:'<p>Replace this text with the third official rule.</p>' }
];

const container=document.getElementById('rulesContainer');
container.innerHTML=RULES.map(r=>`<article class="rule-box"><div class="box-top"><span>${r.number}</span><h2>${r.title}</h2><b class="box-chevron" aria-hidden="true">⌄</b></div><div class="box-body">${r.content}</div></article>`).join('');

container.addEventListener('click',e=>{const box=e.target.closest('.rule-box');if(!box)return;box.classList.toggle('open');box.querySelector('.box-top b').textContent=box.classList.contains('open')?'⌃':'⌄'});


const jarvisBtn=document.getElementById('jarvisBtn'),panel=document.getElementById('jarvisPanel'),close=document.getElementById('jarvisClose');
function openJarvis(){panel.classList.add('open');panel.setAttribute('aria-hidden','false')}function closeJarvis(){panel.classList.remove('open');panel.setAttribute('aria-hidden','true')}
jarvisBtn.addEventListener('click',openJarvis);close.addEventListener('click',closeJarvis);panel.addEventListener('click',e=>{if(e.target===panel)closeJarvis()});
const routes={'HOME':'site.html','EVENTS':'events.html','GENERAL RULES':'general-rules.html','REGISTRATIONS':'registration.html','PROFILE':'profile.html','CONTACTS':'contact.html'};
document.querySelectorAll('.page-link').forEach(a=>a.addEventListener('click',e=>{const href=a.getAttribute('href');if(href){e.preventDefault();location.href=href}}));
document.querySelectorAll('.jarvis-links button').forEach(btn=>btn.addEventListener('click',()=>{const t=btn.dataset.target;if(t==='GENERAL RULES'){closeJarvis();return}if(routes[t]){closeJarvis();location.href=routes[t]}}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeJarvis()});
