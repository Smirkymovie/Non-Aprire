const CACHE='non-aprire-react-ts-ui37-v2';
const STATIC_ASSETS=[
  './','./index.html','./style.css','./manifest.webmanifest','./icon.svg',
  './bg-home.jpg','./bg-chat.jpg','./bg-chapter.jpg','./scene-window.jpg',
  './entry-photo-1.png','./entry-photo-2.png','./room-photo-bed.jpg','./mirror-photo.jpg',
  './respiro_00_03.wav','./door-threshold.wav','./door-photo-1.png','./door-photo-2.png',
  './door-photo-3.png','./door-photo-4.png'
];
self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC_ASSETS)));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put('./index.html',copy));
      return response;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(fetch(event.request).then(response=>{
    if(response && response.ok){
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    }
    return response;
  }).catch(()=>caches.match(event.request)));
});
