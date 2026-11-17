const CACHE_PREFIX="svkd-coir-offline-";
const CACHE_VERSION="v4";
const CACHE_NAME=CACHE_PREFIX+CACHE_VERSION;
const APP_ROOT=new URL("./",self.registration.scope);
const INDEX_URL=new URL("index.html",APP_ROOT);
const MANIFEST_URL=new URL("manifest.webmanifest",APP_ROOT);
const PRECACHE_URL=new URL("precache-manifest.json",APP_ROOT);

async function cacheResponse(cache,request,response){
  if(response&&response.ok&&response.type!=="opaque") await cache.put(request,response.clone());
  return response;
}
self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    for(const url of [APP_ROOT.href,INDEX_URL.href,MANIFEST_URL.href]){
      try{const response=await fetch(new Request(url,{cache:"reload"}));await cacheResponse(cache,url,response);}catch(_){}
    }
    try{
      const manifest=await fetch(new Request(PRECACHE_URL.href,{cache:"no-store"}));
      if(!manifest.ok) throw new Error("Offline asset manifest missing");
      const files=await manifest.json();
      if(!Array.isArray(files)) throw new Error("Invalid offline asset manifest");
      const results=await Promise.allSettled(files.map(async path=>{
        const url=new URL(path,APP_ROOT);
        if(url.origin!==self.location.origin||!url.pathname.startsWith(APP_ROOT.pathname)) return;
        const response=await fetch(new Request(url.href,{cache:"reload"}));
        if(!response.ok||response.type==="opaque") throw new Error("Could not cache "+url.pathname);
        await cache.put(url.href,response.clone());
      }));
      const failed=results.filter(x=>x.status==="rejected");
      if(failed.some(x=>/\\.js|\\.css/.test(String(x.reason)))) throw new Error("App bundle cache failed");
    }catch(error){await caches.delete(CACHE_NAME);throw error;}
    await self.skipWaiting();
  })());
});
self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE_NAME).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET") return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin||url.pathname.includes("/api/")||url.href===self.location.href) return;
  if(request.mode==="navigate"){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      try{
        const response=await fetch(request);
        if(response.ok&&(url.pathname===APP_ROOT.pathname||url.pathname===INDEX_URL.pathname)) await cacheResponse(cache,APP_ROOT.href,response);
        return response;
      }catch(_){
        return await cache.match(APP_ROOT.href)||await cache.match(INDEX_URL.href)||await cache.match(request,{ignoreSearch:true})||
          new Response("<!doctype html><title>SVKD COIR</title><h2>SVKD COIR</h2><p>Connect online, reload once, and wait for offline setup to finish.</p>",{status:503,headers:{"Content-Type":"text/html;charset=utf-8"}});
      }
    })());
    return;
  }
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const cached=await cache.match(request);
    if(cached) return cached;
    try{return await cacheResponse(cache,request,await fetch(request));}
    catch(_){return new Response("Offline resource not cached: "+url.pathname,{status:503,statusText:"Offline resource not cached"});}
  })());
});
