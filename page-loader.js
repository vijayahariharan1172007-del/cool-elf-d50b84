(function(){
  const loader=document.getElementById('jarvisLoader');
  if(!loader)return;
  const status=document.getElementById('loaderStatus');
  if(status) status.textContent='LOADING EXCELSIOR // STABILIZING REALM';
  loader.classList.remove('hidden');
  loader.setAttribute('aria-hidden','false');

  // Fail-open loader: the visual loader must NEVER make a public page unusable.
  // Required app readiness is allowed to finish in the background after the timeout.
  const critical=[...document.querySelectorAll('img')].filter(img=>
    img.getAttribute('data-critical')==='true' || img.getAttribute('loading')==='eager'
  );
  const waitImage=img=>img.complete ? Promise.resolve() : new Promise(resolve=>{
    img.addEventListener('load',resolve,{once:true});
    img.addEventListener('error',resolve,{once:true});
  });
  const waitFonts=(document.fonts&&document.fonts.ready)?document.fonts.ready.catch(()=>{}):Promise.resolve();
  const waitApp=window.__EXCELSIOR_READY__ ? Promise.resolve(window.__EXCELSIOR_READY__).catch(()=>{}) : Promise.resolve();
  const waitReady=new Promise(resolve=>{
    if(document.readyState==='complete') resolve();
    else window.addEventListener('load',resolve,{once:true});
  });
  const safety=new Promise(resolve=>setTimeout(resolve,650));
  Promise.race([
    Promise.all([waitReady,waitFonts,waitApp,...critical.map(waitImage)]),
    safety
  ]).then(()=>{
    requestAnimationFrame(()=>{
      loader.classList.add('hidden');
      loader.setAttribute('aria-hidden','true');
    });
  });
})();
