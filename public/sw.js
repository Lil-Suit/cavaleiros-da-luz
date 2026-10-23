/* Service worker do Cavaleiros da Luz: guarda o jogo para abrir offline. Troque VERSAO a cada atualização. */
const VERSAO='cavaleiros-v45-62';
const ARQUIVOS=['./','./index.html','./three.min.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSAO).then(c=>Promise.all(ARQUIVOS.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSAO).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin!==location.origin||u.pathname.startsWith('/api/')||u.pathname==='/ws')return;   // API, WebSocket, fontes e CDN: sempre direto da rede
  const page=r.mode==='navigate'||u.pathname==='/'||u.pathname.endsWith('/index.html');
  if(page){e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(VERSAO).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match(r).then(h=>h||caches.match('./index.html'))));return}   // jogo: rede primeiro (sempre a versão nova), cache se offline
  e.respondWith(caches.match(r).then(h=>h||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(VERSAO).then(c=>c.put(r,cp))}return res})))});
