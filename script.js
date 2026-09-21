const lightning = document.getElementById('lightningCanvas');
const lctx = lightning.getContext('2d');
const energy = document.getElementById('energyCanvas');
const ectx = energy.getContext('2d');


// J.A.R.V.I.S. loader is reserved for genuinely required transitions.
function showLoader(text='CONNECTING TO J.A.R.V.I.S.'){const l=document.getElementById('jarvisLoader'),s=document.getElementById('loaderStatus');if(!l)return;if(s)s.textContent=text;l.classList.remove('hidden');l.setAttribute('aria-hidden','false')}
function navigateWithJarvis(url,text){showLoader(text);setTimeout(()=>{location.href=url},350)}

function resizeCanvas(canvas, ctx){
  const dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=innerWidth*dpr; canvas.height=innerHeight*dpr;
  canvas.style.width=innerWidth+'px'; canvas.style.height=innerHeight+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
function resizeAll(){resizeCanvas(lightning,lctx);resizeCanvas(energy,ectx)}
resizeAll(); addEventListener('resize',resizeAll);

function path(sx,sy,ex,ey,segments=20,chaos=45){
  const pts=[{x:sx,y:sy}];
  for(let i=1;i<segments;i++){const t=i/segments;pts.push({x:sx+(ex-sx)*t+(Math.random()-.5)*chaos,y:sy+(ey-sy)*t+(Math.random()-.5)*chaos*.24})}
  pts.push({x:ex,y:ey}); return pts;
}
let bolts=[]; let nextBolt=700;
function storm(now){
  lctx.clearRect(0,0,innerWidth,innerHeight);
  if(now>nextBolt){
    const sx=innerWidth*(.18+Math.random()*.68), ex=innerWidth*(.2+Math.random()*.65), ey=innerHeight*(.22+Math.random()*.43);
    bolts.push({p:path(sx,-20,ex,ey,24,65),age:0,life:230+Math.random()*180});
    nextBolt=now+950+Math.random()*1800;
  }
  bolts.forEach(b=>{
    b.age+=16.7; const t=b.age/b.life; const a=Math.max(0,1-Math.max(0,t-.12)/.88)*(t<.12?t/.12:1);
    lctx.save();lctx.globalAlpha=a*(Math.random()>.16?1:.45);
    drawLine(b.p,8,'rgba(55,255,87,.13)',32);drawLine(b.p,2.2,'rgba(77,255,105,.92)',14);drawLine(b.p,.6,'rgba(230,255,233,.98)',4);lctx.restore();
  });
  bolts=bolts.filter(b=>b.age<b.life); requestAnimationFrame(storm);
}
function drawLine(points,w,c,blur){lctx.beginPath();lctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)lctx.lineTo(points[i].x,points[i].y);lctx.lineWidth=w;lctx.strokeStyle=c;lctx.shadowColor='#54ff74';lctx.shadowBlur=blur;lctx.stroke()}
requestAnimationFrame(storm);

let particles=[];
function burst(x,y){
  for(let i=0;i<44;i++){
    const a=Math.random()*Math.PI*2, s=2+Math.random()*7;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:1+Math.random()*2.6,life:1});
  }
  for(let i=0;i<9;i++){
    const a=Math.random()*Math.PI*2;
    particles.push({x,y,vx:Math.cos(a)*(7+Math.random()*5),vy:Math.sin(a)*(7+Math.random()*5),r:2.5+Math.random()*3,life:1,heavy:true});
  }
}
function animateEnergy(){
  ectx.clearRect(0,0,innerWidth,innerHeight);
  particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=.975;p.vy*=.975;p.vy+=.035;p.life-=.018;ectx.globalAlpha=Math.max(0,p.life);ectx.beginPath();ectx.arc(p.x,p.y,p.r,0,Math.PI*2);ectx.fillStyle=p.heavy?'#d8ffe0':'#68ff83';ectx.shadowColor='#54ff72';ectx.shadowBlur=p.heavy?18:10;ectx.fill()});
  particles=particles.filter(p=>p.life>0); requestAnimationFrame(animateEnergy);
}
requestAnimationFrame(animateEnergy);

const enter=document.getElementById('enterButton');
const jarvis=document.getElementById('jarvisButton');
const jarvisPanel=document.getElementById('jarvisPanel');
const jarvisClose=document.getElementById('jarvisClose');
const panel=document.getElementById('portalPanel');
const close=document.getElementById('portalClose');


function openJarvis(){
  jarvisPanel.classList.add('open');
  jarvisPanel.setAttribute('aria-hidden','false');
}
function closeJarvis(){
  jarvisPanel.classList.remove('open');
  jarvisPanel.setAttribute('aria-hidden','true');
}
jarvis.addEventListener('click',openJarvis);
jarvisClose.addEventListener('click',closeJarvis);
jarvisPanel.addEventListener('click',e=>{if(e.target===jarvisPanel) closeJarvis()});

document.querySelectorAll('.jarvis-links button').forEach(btn=>btn.addEventListener('click',()=>{
  const target=btn.dataset.target;
  if(target==='HOME'){closeJarvis();return;}
  if(target==='REGISTRATIONS'){location.href='registration.html';return;}
  if(target==='PROFILE'){location.href='profile.html';return;}
  if(target==='EVENTS'){location.href='events.html';return;}
  if(target==='GENERAL RULES'){location.href='general-rules.html';return;}
  if(target==='CONTACTS'){location.href='contact.html';return;}
  btn.textContent=target+' // ONLINE';
  setTimeout(()=>{btn.textContent=target},700);
}));

function openPortal(){
  panel.classList.add('open');
  panel.setAttribute('aria-hidden','false');
}
enter.addEventListener('pointerdown',openPortal,{passive:true});
close.addEventListener('click',()=>{panel.classList.remove('open');panel.setAttribute('aria-hidden','true')});
panel.addEventListener('click',e=>{if(e.target===panel) close.click()});

document.querySelectorAll('.command-node').forEach(btn=>btn.addEventListener('click',()=>{
  const target=btn.dataset.target;
  if(target==='HOME'){closeJarvis();return;}
  if(target==='REGISTRATIONS'){location.href='registration.html';return;}
  if(target==='PROFILE'){location.href='profile.html';return;}
  if(target==='EVENTS'){location.href='events.html';return;}
  if(target==='GENERAL RULES'){location.href='general-rules.html';return;}
  if(target==='CONTACTS'){location.href='contact.html';return;}
  btn.textContent=target+' // LOADING';
  setTimeout(()=>{btn.textContent=target},650);
}));

document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(panel.classList.contains('open'))close.click();if(jarvisPanel.classList.contains('open'))closeJarvis();}if(e.key==='Enter'&&!panel.classList.contains('open')&&!jarvisPanel.classList.contains('open'))openPortal()});
