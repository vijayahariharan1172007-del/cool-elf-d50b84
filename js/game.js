
// Hold the game behind an abstract Infinity Stones loader until its real assets are ready.
const assetLoader = document.getElementById('assetLoader');
const assetProgress = document.getElementById('assetProgress');
(function bootAssetLoader(){
  const imgs=[...document.querySelectorAll('.stone img')];
  const start=performance.now();
  const finish=()=>{
    if(!assetLoader || assetLoader.dataset.done) return;
    assetLoader.dataset.done='1';
    if(assetProgress) assetProgress.style.animation='none';
    const elapsed=performance.now()-start;
    const wait=Math.max(250-elapsed,0);
    setTimeout(()=>assetLoader.classList.add('hidden'),wait);
  };
  let done=0;
  const tick=()=>{done++; if(assetProgress) assetProgress.style.width=Math.min(100,Math.round(done/imgs.length*100))+'%'; if(done>=imgs.length) finish()};
  if(!imgs.length){finish();return;}
  imgs.forEach(img=>{
    if(img.complete && img.naturalWidth>0) tick();
    else { img.addEventListener('load',tick,{once:true}); img.addEventListener('error',tick,{once:true}); }
  });
  setTimeout(finish,8000);
})();
const game = document.getElementById('game');
const field = document.getElementById('stoneField');
const core = document.getElementById('core');
const fx = document.getElementById('fx');
const ctx = fx.getContext('2d');
const tint = document.getElementById('tint');
const progressEl = document.getElementById('progress');
const instruction = document.getElementById('instruction');
const toast = document.getElementById('toast');
const flash = document.getElementById('flash');
const skip = document.getElementById('skip');

const colors = {
  power:[174,84,255], mind:[255,199,48], space:[55,157,255],
  time:[79,231,105], reality:[255,57,69], soul:[255,128,47]
};
const names = {power:'POWER',mind:'MIND',space:'SPACE',time:'TIME',reality:'REALITY',soul:'SOUL'};
const stones = [...document.querySelectorAll('.stone')];
let W=innerWidth,H=innerHeight,DPR=Math.min(devicePixelRatio||1,2);
let collected=0, active=null, points=[], particles=[], raf=0;
let ambientTime=performance.now();
let orbitStart=performance.now();
const orbiting=[];
const ORBIT_RADIUS = { x: 0.21, y: 0.145 };

function resize(){
  W=innerWidth; H=innerHeight; DPR=Math.min(devicePixelRatio||1,2);
  fx.width=Math.round(W*DPR); fx.height=Math.round(H*DPR); fx.style.width=W+'px'; fx.style.height=H+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener('resize',resize,{passive:true}); resize();

function rand(a,b){return a+Math.random()*(b-a)}
function setTint(key,x,y,on=true){
  const c=colors[key]||[155,92,255];
  game.style.setProperty('--stone-rgb',c.join(','));
  game.style.setProperty('--tx',(x/W*100)+'%');
  game.style.setProperty('--ty',(y/H*100)+'%');
  tint.classList.toggle('active',on);
}
function corePoint(){const r=core.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};}
function showToast(text){toast.textContent=text; toast.classList.add('show'); clearTimeout(showToast.t); showToast.t=setTimeout(()=>toast.classList.remove('show'),1500)}

function burst(x,y,key,count=18){
  const [r,g,b]=colors[key]||[180,180,255];
  const n=Math.min(count, 28);
  for(let i=0;i<n;i++) particles.push({x,y,vx:rand(-2.2,2.2),vy:rand(-2.2,2.2),life:rand(.35,.85),max:.85,size:rand(1,3.4),r,g,b});
}
function trail(x,y,key){
  const [r,g,b]=colors[key];
  points.push({x,y,r,g,b,life:1});
  if(points.length>34) points.shift();
  // Sparse particles: enough energy without flooding low-power phones.
  for(let i=0;i<2;i++) particles.push({x:x+rand(-10,10),y:y+rand(-10,10),vx:rand(-1.2,1.2),vy:rand(-1.2,1.2),life:rand(.2,.5),max:.5,size:rand(1.5,4),r,g,b});
}
function drawSmoothTrail(){
  if(points.length<2) return;
  const last=points[points.length-1];
  const path=(width,alpha,blur)=>{
    ctx.beginPath();
    ctx.moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length-1;i++){
      const p=points[i], n=points[i+1];
      ctx.quadraticCurveTo(p.x,p.y,(p.x+n.x)/2,(p.y+n.y)/2);
    }
    ctx.lineTo(last.x,last.y);
    const a=Math.max(0,Math.min(1,last.life))*alpha;
    ctx.strokeStyle=`rgba(${last.r},${last.g},${last.b},${a})`;
    ctx.lineWidth=width; ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.shadowBlur=blur; ctx.shadowColor=`rgba(${last.r},${last.g},${last.b},.9)`;
    ctx.stroke();
  };
  drawSmoothTrail();
  path(38,.18,28);
  path(18,.62,18);
  path(6,.95,8);
  ctx.shadowBlur=0;
}
function draw(now){
  ctx.clearRect(0,0,W,H);
  // Age trail points without creating/removing array entries every frame.
  for(let i=points.length-1;i>=0;i--){
    points[i].life-=.035;
    if(points[i].life<=0) points.splice(i,1);
  }
  drawSmoothTrail();
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x+=p.vx; p.y+=p.vy; p.vx*=.985; p.vy*=.985; p.life-=.035;
    if(p.life<=0){particles.splice(i,1);continue}
    ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
    ctx.fillStyle=`rgba(${p.r},${p.g},${p.b},${Math.max(0,p.life/p.max)})`;ctx.fill();
  }
  // One animation loop for ambient drift + orbital stones + canvas FX.
  stones.forEach((stone,i)=>{
    if(stone===active?.el||stone.classList.contains('collected')) return;
    const drift=Math.sin(now/1300+i*1.7)*2.2;
    stone.style.setProperty('--drift',drift+'px');
  });
  if(orbiting.length){
    // V3 orbit model: compact elliptical orbit, fixed phase per stone,
    // gentle radial wobble, and CSS-variable positioning. This is the
    // original orbit behaviour the user preferred.
    const minSide=Math.min(W,H);
    const radius=Math.max(42, Math.min(78, minSide*.145));
    const speed=0.00032;
    orbiting.forEach((stone,i)=>{
      const phase=stone.orbitPhase||0;
      const angle=phase+(now-orbitStart)*speed;
      const wobble=1+Math.sin(now/1100+i)*0.035;
      const r=radius*wobble;
      stone.style.setProperty('--ox',(Math.cos(angle)*r)+'px');
      stone.style.setProperty('--oy',(Math.sin(angle)*r*.72)+'px');
    });
  }
  raf=requestAnimationFrame(draw);
}
raf=requestAnimationFrame(draw);

function pointerPos(e){return {x:e.clientX,y:e.clientY}}
function startDrag(e){
  if(collected===6) return;
  e.preventDefault();
  const el=e.currentTarget;
  if(el.classList.contains('collected')) return;
  const p=pointerPos(e), r=el.getBoundingClientRect();
  active={el,key:el.dataset.stone,pid:e.pointerId,dx:p.x-(r.left+r.width/2),dy:p.y-(r.top+r.height/2)};
  el.setPointerCapture?.(e.pointerId); el.classList.add('dragging'); instruction.classList.add('hidden');
  setTint(active.key,p.x,p.y,true); core.classList.add('hot');
  burst(p.x,p.y,active.key,8); trail(p.x,p.y,active.key);
}
function moveDrag(e){
  if(!active||e.pointerId!==active.pid) return;
  e.preventDefault(); const p=pointerPos(e), x=p.x-active.dx,y=p.y-active.dy;
  active.el.style.left=x+'px'; active.el.style.top=y+'px';
  active.el.style.transform='translate3d(-50%,-50%,0) scale(1.08)';
  setTint(active.key,p.x,p.y,true); trail(p.x,p.y,active.key);
  const c=corePoint(), d=Math.hypot(p.x-c.x,p.y-c.y);
  if(d<Math.min(W,H)*.15) core.classList.add('hot'); else core.classList.remove('hot');
}
function endDrag(e){
  if(!active||e.pointerId!==active.pid) return;
  const {el,key}=active, p=pointerPos(e), c=corePoint(), d=Math.hypot(p.x-c.x,p.y-c.y);
  if(d<Math.min(W,H)*.17) collect(el,key,c);
  else {el.classList.remove('dragging');el.style.transform='translate3d(-50%,-50%,0)';setTint(key,p.x,p.y,false);core.classList.remove('hot');points.length=0;showToast('Bring it to the centre');}
  active=null;
}
function collect(el,key,c){
  el.classList.remove('dragging'); el.style.left=c.x+'px'; el.style.top=c.y+'px'; el.style.transform='translate3d(-50%,-50%,0) scale(.14)';
  burst(c.x,c.y,key,28); showToast(`${names[key]} STONE SECURED`); collected++; progressEl.textContent=`${collected} / 6`; setTint(key,c.x,c.y,true); core.classList.add('hot'); points.length=0;
  setTimeout(()=>{const idx=orbiting.length;el.classList.add('collected');el.style.setProperty('--orbit-index',idx);el.orbitPhase=(idx/6)*Math.PI*2-Math.PI/2;orbiting.push(el);requestAnimationFrame(()=>el.classList.add('orbiting'));burst(c.x,c.y,key,16);},420);
  setTimeout(()=>{tint.classList.remove('active');core.classList.remove('hot');},700);
  if(collected===6) setTimeout(finale,1200);
}
stones.forEach(s=>{s.addEventListener('pointerdown',startDrag);s.addEventListener('pointermove',moveDrag);s.addEventListener('pointerup',endDrag);s.addEventListener('pointercancel',endDrag)});

function finalBurst(){
  const c=corePoint();
  Object.keys(colors).forEach((key,idx)=>{
    const [r,g,b]=colors[key];
    for(let i=0;i<50;i++){
      const a=idx/6*Math.PI*2+rand(-.25,.25),speed=rand(2,6);
      particles.push({x:c.x,y:c.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:rand(.8,1.6),max:1.6,size:rand(1,4),r,g,b});
    }
  });
}
function finale(){
  document.body.classList.add('complete');
  instruction.innerHTML='<h1>THE SIX POWERS<br><span>ARE ONE</span></h1><p>EPISTEME IS UNLOCKED</p>';
  instruction.classList.remove('hidden');
  instruction.style.opacity='1';
  finalBurst();
  // Mixed six-colour glow before the transition flash.
  let i=0; const mix=['#ae54ff','#379dff','#ff3945','#ffc730','#4fe769','#ff802f'];
  const mixTimer=setInterval(()=>{
    const col=mix[i++%mix.length]; game.style.background=`radial-gradient(circle at 50% 50%,${col}55 0%,rgba(0,0,0,.1) 28%,#02030b 72%)`;
  },120);
  setTimeout(()=>{clearInterval(mixTimer);game.style.background='radial-gradient(circle at 50% 50%, rgba(255,255,255,.9), rgba(174,84,255,.55) 18%, rgba(55,157,255,.45) 30%, rgba(255,57,69,.35) 42%, #02030b 72%)';flash.classList.add('go')},720);
  setTimeout(()=>{window.dispatchEvent(new CustomEvent('infinityComplete'));},1450);
}

skip.addEventListener('click',()=>{window.dispatchEvent(new CustomEvent('infinitySkip'));showToast('Intro skipped');instruction.classList.add('hidden');});

// Expose hooks for the eventual main EPISTEME site.
// EXCELSIOR V21: the game remains the first experience. Only after the game ends do we enter the required 2-second J.A.R.V.I.S. transition.
window.addEventListener('infinityComplete',()=>{setTimeout(()=>location.href='jarvis-transition.html',0)});
window.addEventListener('infinitySkip',()=>{setTimeout(()=>location.href='jarvis-transition.html',0)});

window.infinityGame={
  reset(){location.reload()},
  get progress(){return collected},
  onComplete(fn){window.addEventListener('infinityComplete',fn)},
  onSkip(fn){window.addEventListener('infinitySkip',fn)}
};
