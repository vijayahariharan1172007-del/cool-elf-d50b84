(()=>{
  const pageKey=(()=>{const p=location.pathname.split('/').pop()||'site.html';return p.replace(/\.html$/i,'')||'site'})();
  const apply=(items)=>{for(const x of items||[]){try{const el=document.querySelector(x.selector);if(!el)continue;const i=Number(x.text_index||0),n=el.childNodes[i];if(n&&n.nodeType===3)n.nodeValue=String(x.value??'')}catch{}}};
  const load=async()=>{try{const r=await fetch('/api/public-text-overrides',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({page_key:pageKey}),cache:'no-store'});const j=await r.json();if(j.ok)apply(j.overrides)}catch{}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
  const obs=new MutationObserver(()=>{load();});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>obs.disconnect(),10000);
})();
