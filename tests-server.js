// Testes do servidor: node tests-server.js  (sobe o servidor em porta/pasta temporárias)
const crypto=require('crypto'),fs=require('fs'),os=require('os'),path=require('path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cl-'));
process.env.DATA_DIR=dir;const pub=fs.mkdtempSync(path.join(os.tmpdir(),'clp-'));process.env.PUBLIC_DIR=pub;process.env.PORT='0';process.env.POW_REG='10';process.env.CHAT_RL='100';process.env.POW_LOGIN='8';process.env.TRUST_PROXY='0';
process.env.GOOGLE_CLIENT_ID='cid-test';process.env.SITE_ORIGIN='https://site.test';
const {server}=require('./server.js');
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++}else{fail++;console.log('  FALHOU:',m)}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function lead0(b){let n=0;for(const x of b){if(x===0){n+=8;continue}n+=Math.clz32(x)-24;break}return n}
let B;
async function J(p,o){o=o||{};const r=await fetch(B+p,{method:o.m||'GET',headers:Object.assign({'Content-Type':'application/json'},o.tok?{Authorization:'Bearer '+o.tok}:{}),body:o.b?JSON.stringify(o.b):undefined});let j={};try{j=await r.json()}catch(e){}return{s:r.status,j}}
async function pow(k){const c=(await J('/api/challenge?k='+k)).j;for(let n=0;;n++)if(lead0(crypto.createHash('sha256').update(c.salt+':'+n).digest())>=c.bits)return{id:c.id,nonce:n}}
const reg=async(o)=>J('/api/register',{m:'POST',b:Object.assign({ft:5000,ch:null},o,{ch:await pow('reg')})});
const login=async(email,password)=>J('/api/login',{m:'POST',b:{email,password,ch:await pow('login')}});
function wsOpen(tok){return new Promise((res,rej)=>{const w=new WebSocket(B.replace('http','ws')+'/ws');const c={w,msgs:[],closed:false};w.onmessage=e=>c.msgs.push(JSON.parse(e.data));w.onclose=()=>c.closed=true;w.onopen=()=>{w.send(JSON.stringify({t:'auth',token:tok}));res(c)};w.onerror=rej})}
const send=(c,o)=>c.w.send(JSON.stringify(o));
const find=(c,f)=>c.msgs.find(f);
(async()=>{
 await new Promise(r=>server.listen(0,r));B='http://127.0.0.1:'+server.address().port;
 let r=await J('/api/ping');ok(r.s===200&&r.j.ok,'ping');
 r=await reg({email:'a@x.com',password:'Senha1234',nick:'Alice',hp:'robo'});ok(r.j.wait,'isca devolve falso sucesso');
 r=await login('a@x.com','Senha1234');ok(r.s===401,'isca não criou conta');
 r=await J('/api/register',{m:'POST',b:{email:'a@x.com',password:'Senha1234',nick:'Alice',ft:5000,ch:{id:'x',nonce:1}}});ok(r.s===400,'sem prova de trabalho recusa');
 r=await J('/api/register',{m:'POST',b:{email:'a@x.com',password:'Senha1234',nick:'Alice',ft:500,ch:await pow('reg')}});ok(r.s===400,'formulário rápido demais recusa');
 r=await reg({email:'a@x.com',password:'12345678',nick:'Alice'});ok(r.s===400,'senha fraca');
 r=await reg({email:'a@x.com',password:'Senha1234',nick:'Al'});ok(r.s===400,'nome curto');
 r=await reg({email:'a@x.com',password:'Senha1234',nick:'Alice'});ok(r.s===200&&r.j.ok,'registro ok '+JSON.stringify(r.j));
 r=await reg({email:'A@x.com',password:'Senha1234',nick:'Outra'});ok(r.s===400,'e-mail duplicado (maiúscula)');
 r=await reg({email:'b@x.com',password:'Senha1234',nick:'alice'});ok(r.s===400,'nome duplicado (minúscula)');
 r=await reg({email:'b@x.com',password:'Senha1234',nick:'Bob'});ok(r.j.ok,'registro Bob');
 // login
 for(let i=0;i<5;i++)r=await login('a@x.com','errada123');
 ok(r.s===401,'erro de senha');
 r=await login('a@x.com','Senha1234');ok(r.s===429,'conta bloqueada após 5 erros');
 const dbf=path.join(dir,'db.json');
 const {DB}=require('./server.js');for(const a of Object.values(DB.accounts))a.lockUntil=0;
 const A=await login('a@x.com','Senha1234');ok(A.s===200&&A.j.token&&A.j.token.length===64,'login Alice');
 const Bb=await login('b@x.com','Senha1234');ok(Bb.j.token,'login Bob');
 r=await J('/api/me',{tok:'0'.repeat(64)});ok(r.s===401,'token falso');
 r=await J('/api/me',{tok:A.j.token});ok(r.j.nick==='Alice','me');
 // saves
 const Core=require('./core.js');
 let st=Core.newCharacter('x');
 r=await J('/api/save',{m:'PUT',tok:A.j.token,b:{save:st}});ok(r.s===200,'save inicial '+JSON.stringify(r.j));
 // ranking: Alice sobe a habilidade de arco; Bob (sem save) não aparece; precisa de login
 {let rk=await J('/api/rank',{});ok(rk.s===401,'ranking exige login');
  const st2=JSON.parse(JSON.stringify(st));st2.sk.dist.lv=3;st2.sk.dist.xp=5;r=await J('/api/save',{m:'PUT',tok:A.j.token,b:{save:st2}});ok(r.s===200,'save com arco 3');
  rk=await J('/api/rank',{tok:A.j.token});ok(rk.s===200&&rk.j.rank&&rk.j.rank.dist[0]&&rk.j.rank.dist[0].n==='Alice'&&rk.j.rank.dist[0].lv===3,'Alice lidera o arco: '+JSON.stringify(rk.j.rank&&rk.j.rank.dist));
  ok(rk.j.rank.melee[0].lv===1&&['melee','dist','magic','def'].every(k=>rk.j.rank[k].length<=10),'4 listas com no máximo 10');
  const st3=JSON.parse(JSON.stringify(st));st3.sk.dist.lv=1;r=await J('/api/save',{m:'PUT',tok:A.j.token,b:{save:st3}});}
 const hack=JSON.parse(JSON.stringify(st));hack.level=200;
 r=await J('/api/save',{m:'PUT',tok:A.j.token,b:{save:hack}});ok(r.s===422,'save com nível hackeado recusado');
 const hack2=JSON.parse(JSON.stringify(st));hack2.inv[0]={uid:'u1',id:'item_nao_existe',qty:1};
 r=await J('/api/save',{m:'PUT',tok:A.j.token,b:{save:hack2}});ok(r.s===422,'item inexistente recusado');
 const hack3=JSON.parse(JSON.stringify(st));hack3.gold=9e9;
 r=await J('/api/save',{m:'PUT',tok:A.j.token,b:{save:hack3}});ok(r.s===422,'ouro absurdo recusado');
 const first=await J('/api/save',{tok:A.j.token});ok(first.j.save&&first.j.save.name==='Alice','save lido com nome da conta');
 const fresh=await J('/api/save',{tok:Bb.j.token});ok(fresh.j.save===null,'conta nova sem save');
 // ws
 const a=await wsOpen(A.j.token),b=await wsOpen(Bb.j.token);await sleep(200);
 ok(find(a,m=>m.t==='ready')&&find(b,m=>m.t==='ready'),'ready');
 const bad=await wsOpen('f'.repeat(64));await sleep(200);ok(bad.closed&&find(bad,m=>m.t==='kick'),'ws com token falso é expulso');
 send(a,{t:'p',p:{x:10,z:10,rg:'world',yw:1,n:'FALSO',lv:999,tk:'zzzzzzzz',x2:1}});send(b,{t:'p',p:{x:30,z:10,rg:'world'}});
 await sleep(500);
 const s=b.msgs.filter(m=>m.t==='s').flatMap(m=>m.u).find(u=>u[1].x===10);
 ok(s&&s[1].n==='Alice'&&s[1].lv===1&&s[1].tk!=='zzzzzzzz','presença com nome/nível/token do servidor (não forjável)');
 send(a,{t:'e',topic:'chat',data:{n:'Admin',t:'oi pessoal'}});await sleep(200);
 const ch=b.msgs.find(m=>m.topic==='chat');ok(ch&&ch.data.n==='Alice'&&ch.data.t==='oi pessoal','chat usa o nome real da conta');
 send(a,{t:'e',topic:'chat',data:{t:'oi pessoal'}});await sleep(150);ok(b.msgs.filter(m=>m.topic==='chat').length===1,'chat repetido bloqueado');
 send(a,{t:'e',topic:'chat',data:{t:'que merda'}});await sleep(150);ok(b.msgs.filter(m=>m.topic==='chat').length===2&&b.msgs.filter(m=>m.topic==='chat')[1].data.t==='que merda','xingamento leve é entregue (quem recebe mascara)');
 // ---- PvP: chaves, vila, faixa de nível, caveiras, morte e perda de ouro
 {const idA=find(a,m=>m.t==='ready').peer,idB=find(b,m=>m.t==='ready').peer,pvc=c=>c.msgs.filter(m=>m.t==='pv'&&m.k==='hit').length;
  send(a,{t:'p',p:{x:200,z:200,rg:'world',pv:1}});send(b,{t:'p',p:{x:210,z:200,rg:'world',pv:0}});await sleep(300);
  send(a,{t:'e',topic:'pvh',data:{to:idB,d:50}});await sleep(200);ok(pvc(b)===0,'PvP: alvo com ⚔️ desligado não leva golpe');
  send(b,{t:'p',p:{pv:1}});await sleep(250);
  send(a,{t:'e',topic:'pvh',data:{to:idB,d:5000}});await sleep(150);ok(pvc(b)===0,'PvP: dano acima do teto é recusado');
  send(a,{t:'e',topic:'pvh',data:{to:idB,d:50}});await sleep(250);const hh=b.msgs.find(m=>m.t==='pv'&&m.k==='hit');ok(hh&&hh.d===50&&hh.n==='Alice'&&hh.from===idA,'PvP: golpe validado chega só à vítima, com o nome do atacante');
  ok(!a.msgs.find(m=>m.t==='pv'&&m.k==='hit'),'PvP: o atacante não recebe o próprio golpe');
  await sleep(300);const skA=b.msgs.filter(m=>m.t==='s').flatMap(m=>m.u).filter(u=>u[1].n==='Alice').pop();ok(skA&&skA[1].sk==='white','PvP: atacar jogador limpo dá caveira branca (visível aos outros)');
  ok(a.msgs.find(m=>m.t==='pv'&&m.k==='me'&&m.sk==='white'),'PvP: o próprio jogador é avisado da caveira');
  send(a,{t:'p',p:{sk:'black'}});send(b,{t:'p',p:{pv:0}});await sleep(300);
  const pvB=a.msgs.filter(m=>m.t==='s').flatMap(m=>m.u).filter(u=>u[1].n==='Bob').pop();ok(pvB&&pvB[1].pv===1,'PvP: não dá para desligar o ⚔️ logo depois de uma briga');
  const skA2=b.msgs.filter(m=>m.t==='s').flatMap(m=>m.u).filter(u=>u[1].n==='Alice').pop();ok(skA2&&skA2[1].sk!=='black','PvP: cliente não consegue forjar a própria caveira');
  send(a,{t:'p',p:{x:5,z:5}});await sleep(250);const n0=pvc(b);send(a,{t:'e',topic:'pvh',data:{to:idB,d:50}});await sleep(200);ok(pvc(b)===n0,'PvP: dentro da vila ninguém apanha');
  send(a,{t:'p',p:{x:200,z:200}});await sleep(250);
  send(b,{t:'e',topic:'pvk',data:{}});await sleep(300);const die=b.msgs.find(m=>m.t==='pv'&&m.k==='die');ok(die&&die.pct===0.1&&die.n==='Alice','PvP: morte por caveira branca custa 10% do ouro');
  ok(a.msgs.find(m=>m.t==='pv'&&m.k==='kill'&&m.n==='Bob'),'PvP: o assassino recebe o crédito');
  await sleep(200);ok(a.msgs.filter(m=>m.t==='pv'&&m.k==='me').pop().sk==='yellow','PvP: a primeira morte vira caveira amarela');
  const dn=b.msgs.filter(m=>m.t==='pv'&&m.k==='die').length;send(b,{t:'e',topic:'pvk',data:{}});await sleep(200);ok(b.msgs.filter(m=>m.t==='pv'&&m.k==='die').length===dn,'PvP: morte sem golpe recente de jogador não conta')}
 // ---- moderação: grave = bloqueia + silencia 5 min -> 1 h -> 5 h
 const acA=Object.values(require('./server.js').DB.accounts).find(x=>x.nick==='Alice');
 const nCh=()=>b.msgs.filter(m=>m.topic==='chat').length,n0=nCh();
 send(a,{t:'e',topic:'chat',data:{t:'seu viado arrombado'}});await sleep(200);
 ok(nCh()===n0,'mensagem grave não é entregue');
 ok(Math.abs(acA.mutedUntil-Date.now()-5*60e3)<3000,'1ª ofensa = 5 min sem chat');
 ok(a.msgs.some(m=>m.t==='sys'&&m.bad&&/bloqueada/.test(m.msg)),'autor recebe aviso');
 send(a,{t:'e',topic:'chat',data:{t:'oi de novo'}});await sleep(150);ok(nCh()===n0,'silenciado não fala');
 acA.mutedUntil=0;send(a,{t:'e',topic:'chat',data:{t:'vai se f o d e r'}});await sleep(200);
 ok(Math.abs(acA.mutedUntil-Date.now()-3600e3)<3000,'2ª ofensa em 24 h = 1 h');
 acA.mutedUntil=0;send(a,{t:'e',topic:'chat',data:{t:'sua mae e p0rr4 puuuuta'}});await sleep(200);
 ok(Math.abs(acA.mutedUntil-Date.now()-5*3600e3)<3000,'3ª ofensa em 24 h = 5 h');
 acA.mutedUntil=0;acA.chatOff=[Date.now()-25*3600e3];send(a,{t:'e',topic:'chat',data:{t:'cuzao'}});await sleep(200);
 ok(Math.abs(acA.mutedUntil-Date.now()-5*60e3)<3000,'ofensa antiga (>24 h) volta para 5 min');
 acA.mutedUntil=0;acA.chatOff=[];
 send(a,{t:'e',topic:'chat',data:{t:'bom dia'}});await sleep(150);ok(nCh()===n0+1,'sem punição o chat volta a funcionar');
 send(a,{t:'e',topic:'hit',data:{i:5,d:50}});await sleep(150);ok(b.msgs.find(m=>m.topic==='hit'&&m.data.i===5),'hit repassado');
 send(a,{t:'e',topic:'hit',data:{i:5,d:99999999}});send(a,{t:'e',topic:'hacker',data:{x:1}});await sleep(150);
 ok(!b.msgs.find(m=>m.topic==='hit'&&m.data.d>1e6)&&!b.msgs.find(m=>m.topic==='hacker'),'dano absurdo e tópico desconhecido descartados');
 ok(find(a,m=>m.t==='chk'),'dano absurdo gera verificação anti-robô');
 // chk: responde certo
 const ck=find(a,m=>m.t==='chk');send(a,{t:'chk',id:ck.id,a:ck.q});await sleep(150);ok(find(a,m=>m.t==='sys')&&!a.closed,'verificação correta segue jogando');
 // auto-click: heartbeat sintético
 send(b,{t:'hb',ac:{n:200,m:30,sd:2,nt:0,u:1}});await sleep(150);
 const ck2=find(b,m=>m.t==='chk');ok(ck2,'cliques regulares geram verificação');
 send(b,{t:'chk',id:ck2.id,a:'❌'});await sleep(300);ok(b.closed&&find(b,m=>m.t==='kick'),'resposta errada expulsa');
 r=await login('b@x.com','Senha1234');ok(r.s===403,'conta em espera depois de falhar');
 // ---- denúncias: 3 jogadores diferentes => silêncio automático de 1 h
 await reg({email:'c@x.com',password:'Senha1234',nick:'Carla'});await reg({email:'d@x.com',password:'Senha1234',nick:'Dora'});
 const {DB:DB2}=require('./server.js');for(const x of Object.values(DB2.accounts))x.banUntil=0;
 const tkC=(await login('c@x.com','Senha1234')).j.token,tkD=(await login('d@x.com','Senha1234')).j.token,tkB=(await login('b@x.com','Senha1234')).j.token;
 const wa=await wsOpen((await login('a@x.com','Senha1234')).j.token),wb=await wsOpen(tkB),wc=await wsOpen(tkC),wd=await wsOpen(tkD);await sleep(300);
 const pid=wa.msgs.find(m=>m.t==='ready').peer;
 send(wb,{t:'rep',peer:pid,why:'chat'});await sleep(150);ok(wb.msgs.some(m=>m.t==='sys'&&/Denúncia enviada/.test(m.msg)),'denúncia aceita');
 send(wb,{t:'rep',peer:pid,why:'chat'});await sleep(150);ok(DB2.reports.filter(r=>r.by===Object.values(DB2.accounts).find(x=>x.nick==='Bob').id).length===1,'denúncia repetida do mesmo jogador não conta');
 send(wc,{t:'rep',peer:pid,why:'nome'});send(wd,{t:'rep',peer:pid,why:'xxx'});await sleep(250);
 const accA2=Object.values(DB2.accounts).find(x=>x.nick==='Alice');
 ok(Math.abs(accA2.mutedUntil-Date.now()-3600e3)<4000,'3 denúncias de contas diferentes silenciam por 1 h');
 ok(DB2.reports.length===3&&DB2.reports[2].why==='outro','motivo inválido vira "outro"');
 send(wa,{t:'rep',peer:pid,why:'chat'});await sleep(100);ok(DB2.reports.length===3,'não dá para denunciar a si mesmo');
 for(const w of[wa,wb,wc,wd])w.w.close();accA2.mutedUntil=0;accA2.chatOff=[];
 // nome grave no cadastro
 r=await J('/api/register',{m:'POST',b:{email:'e@x.com',password:'Senha1234',nick:'Putaria',ft:5000,ch:await pow('reg')}});ok(r.s===400,'nome impróprio recusado no cadastro');
 // flood
 for(let i=0;i<200;i++)send(a,{t:'p',p:{x:i}});await sleep(300);ok(a.closed,'flood expulsa');
 // logout
 const A2=await login('a@x.com','Senha1234');r=await J('/api/logout',{m:'POST',tok:A2.j.token});r=await J('/api/me',{tok:A2.j.token});ok(r.s===401,'logout invalida sessão');

 // adaptador de WebSocket do cliente (net.js) contra o servidor real
 try{const src=fs.readFileSync(path.join(__dirname,'..','arvelos','src','net.js'),'utf8');
  const i=src.indexOf('function netWsRoom()'),j=src.indexOf('async function netInit()');
  if(i>0){const mkRoom=(tok)=>{const NET={};const logs=[];const ctx={pvRecv:()=>{},netBlocked:()=>false,NET,log:m=>logs.push(m),esc:x=>x,document:{createElement:()=>({style:{},querySelector:()=>({}),set innerHTML(v){this.h=v}}),getElementById:()=>null,body:{appendChild(){}},exitPointerLock(){}},location:{protocol:'http:',host:B.replace('http://','')},window:{CLOUD:{token:tok,stats:()=>({n:0,m:0,sd:99,u:99,nt:0})}},WebSocket,setTimeout,JSON,Map,console};
    const f=new Function(...Object.keys(ctx),src.slice(i,j)+';return netWsRoom');return{room:f(...Object.values(ctx))(),NET,logs}};
   const R1=await login('a@x.com','Senha1234'),R2=await login('b@x.com','Senha1234');
   const bAcc=Object.values(require('./server.js').DB.accounts).find(a=>a.nick==='Bob');bAcc.banUntil=0;
   const R2b=await login('b@x.com','Senha1234');
   const c1=mkRoom(R1.j.token),c2=mkRoom(R2b.j.token);await sleep(400);
   ok(c1.NET.ok&&c1.NET.tk&&c1.NET.tk.length===8,'adaptador conecta e recebe tk');
   const got=[];c2.room.on('chat',m=>got.push(m));let lastPeers=null;c2.room.onPeers(ch=>lastPeers=ch.peers);
   c1.room.presence({x:5,z:5,rg:'world',yw:0});c2.room.presence({x:9,z:5,rg:'world'});await sleep(500);
   ok(lastPeers&&lastPeers.length===1&&lastPeers[0].presence.n==='Alice'&&lastPeers[0].kind==='viewer'&&lastPeers[0].sameTab===false,'adaptador entrega lista de jogadores no formato da sala');
   ok(c2.room.peers().length===1,'peers() coerente');
   c1.room.emit('chat',{n:'x',t:'olá mundo'});await sleep(300);ok(got.length===1&&got[0].data.t==='olá mundo'&&got[0].peer,'evento de chat entregue com peer');
   c1.room.emit('mv',{x:1});await sleep(100);
  }}catch(e){fail++;console.log('  FALHOU adaptador:',e&&e.stack||e)}
 // estático e cabeçalhos
 fs.writeFileSync(path.join(pub,'index.html'),'<html><head></head><body>ok</body></html>');
 let h=await fetch(B+'/');let t=await h.text();ok(t.includes('window.CL_SERVER=""')&&h.headers.get('content-security-policy'),'index recebe CL_SERVER e CSP');
 h=await fetch(B+'/../server.js');ok(h.status!==200||!(await h.text()).includes('createServer'),'sem path traversal');
 h=await fetch(B+'/%2e%2e/server.js');ok(h.status===404,'path traversal codificado');
 fs.mkdirSync(path.join(pub,'.well-known'));fs.writeFileSync(path.join(pub,'.well-known','assetlinks.json'),'[]');h=await fetch(B+'/.well-known/assetlinks.json');ok(h.status===200,'assetlinks liberado');fs.writeFileSync(path.join(pub,'.segredo'),'x');h=await fetch(B+'/.segredo');ok(h.status===404,'arquivos ocultos bloqueados');
 h=await fetch(B+'/db.json');ok(h.status===404,'db não exposto');
 // entrar com Google (token OIDC assinado de verdade; as chaves públicas do Google são simuladas)
 {const kp=crypto.generateKeyPairSync('rsa',{modulusLength:2048}),jwk=Object.assign(kp.publicKey.export({format:'jwk'}),{kid:'k1',alg:'RS256',use:'sig'}),of=global.fetch;
  global.fetch=async(u,o)=>String(u).includes('googleapis.com/oauth2/v3/certs')?new Response(JSON.stringify({keys:[jwk]})):of(u,o);
  const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url'),tok=(o)=>{const h=b64({alg:'RS256',kid:'k1'}),p=b64(Object.assign({iss:'https://accounts.google.com',aud:'cid-test',exp:Math.floor(Date.now()/1000)+600,sub:'g-123',email:'goo@x.com',email_verified:true},o)),sg=crypto.sign('RSA-SHA256',Buffer.from(h+'.'+p),kp.privateKey).toString('base64url');return h+'.'+p+'.'+sg};
  const nn=()=>crypto.randomBytes(16).toString('hex');
  r=await J('/api/config');ok(r.j.google==='cid-test'&&r.j.apple==='','config expõe os ids públicos');
  let n1=nn();r=await J('/api/oauth',{m:'POST',b:{provider:'google',idToken:tok({nonce:n1}),nonce:n1}});ok(r.s===200&&r.j.token&&r.j.nick,'Google cria conta '+JSON.stringify(r.j));const G1=r.j;
  r=await J('/api/oauth',{m:'POST',b:{provider:'google',idToken:tok({nonce:n1}),nonce:n1}});ok(r.s===401,'nonce não pode ser reutilizado');
  n1=nn();r=await J('/api/oauth',{m:'POST',b:{provider:'google',idToken:tok({nonce:n1}),nonce:n1}});ok(r.s===200&&r.j.nick===G1.nick,'mesmo Google volta para a mesma conta');
  ok(r.j.pend===true,'conta nova pelo Google fica com nome pendente');
  r=await J('/api/me',{tok:G1.token});ok(r.j.pend===true,'/api/me informa nome pendente');
  r=await J('/api/nick-free?n=Jo4o');ok(r.j.ok===false&&/Números/.test(r.j.err),'nome com número não é livre');
  r=await J('/api/nick-free?n=alice');ok(r.j.ok===false&&/pertence/.test(r.j.err),'nome de outro jogador não é livre (ignora maiúsculas)');
  r=await J('/api/nick-free?n=joão%20victor');ok(r.j.ok===true&&r.j.nick==='João Victor','nome livre volta formatado');
  r=await J('/api/nick',{m:'POST',tok:G1.token,b:{nick:'Alice'}});ok(r.s===400&&/pertence/.test(r.j.err),'não aceita nome repetido');
  r=await J('/api/nick',{m:'POST',tok:G1.token,b:{nick:'Jo4o'}});ok(r.s===400,'não aceita número');
  r=await J('/api/nick',{m:'POST',tok:G1.token,b:{nick:'joão victor'}});ok(r.s===200&&r.j.nick==='João Victor','escolhe o nome (formatado)');
  r=await J('/api/me',{tok:G1.token});ok(r.j.nick==='João Victor'&&r.j.pend===false,'nome gravado e não pendente');
  r=await J('/api/nick',{m:'POST',tok:G1.token,b:{nick:'Outro Nome'}});ok(r.s===400,'só escolhe uma vez');
  r=await J('/api/nick-free?n=Jo%C3%A3o%20Victor');ok(r.j.ok===false,'nome escolhido passa a estar em uso');
  r=await reg({email:'z@x.com',password:'Senha1234',nick:'Zé2'});ok(r.s===400,'cadastro recusa número no nome');
  r=await J('/api/save',{m:'DELETE',tok:G1.token});r=await J('/api/me',{tok:G1.token});ok(r.j.pend===true,'recomeçar o personagem pede o nome de novo');
  r=await J('/api/nick',{m:'POST',tok:G1.token,b:{nick:'João Victor'}});ok(r.s===200,'pode manter o mesmo nome ao recomeçar');
  r=await reg({email:'z@x.com',password:'Senha1234',nick:'joão  victor'});ok(r.s===400,'cadastro recusa nome já usado (formatado)');
  n1=nn();r=await J('/api/oauth',{m:'POST',b:{provider:'google',idToken:tok({nonce:n1,aud:'outro'}),nonce:n1}});ok(r.s===401,'audiência errada recusada');
  n1=nn();r=await J('/api/oauth',{m:'POST',b:{provider:'google',idToken:tok({nonce:n1,exp:1}),nonce:n1}});ok(r.s===401,'token expirado recusado');
  n1=nn();r=await J('/api/oauth',{m:'POST',b:{provider:'google',idToken:tok({nonce:n1}).slice(0,-6)+'AAAAAA',nonce:n1}});ok(r.s===401,'assinatura adulterada recusada');
  n1=nn();r=await J('/api/oauth',{m:'POST',b:{provider:'apple',idToken:tok({nonce:n1}),nonce:n1}});ok(r.s===503,'Apple sem configuração informa');
  n1=nn();r=await J('/api/oauth',{m:'POST',tok:Bb.j.token,b:{provider:'google',idToken:tok({nonce:n1,sub:'g-999',email:'x@x.com'}),nonce:n1}});ok(r.s===200&&r.j.nick==='Bob','logado: vincula o Google à conta atual');
  n1=nn();r=await J('/api/oauth',{m:'POST',b:{provider:'google',idToken:tok({nonce:n1,sub:'g-999'}),nonce:n1}});ok(r.s===200&&r.j.nick==='Bob','entrar com o Google vinculado abre a conta do Bob');
  r=await J('/api/oauth',{m:'POST',tok:G1.token,b:{provider:'google',idToken:tok({nonce:nn()}),nonce:nn()}});ok(r.s===401,'nonce divergente recusado');
  h=await fetch(B+'/oauth/cb');ok(h.status===200&&(await h.text()).includes('postMessage'),'página de retorno do Google');
  global.fetch=of}

 {// ---- site, guildas, equipe, diamantes ----
  const S=require('./server.js');const D=S.DB;
  const accA=Object.values(D.accounts).find(a=>a.nick==='Alice'),accB=Object.values(D.accounts).find(a=>a.nick==='Bob');
  accA.rk={melee:40,dist:3,magic:1,def:2,mx:5,dx:0,gx:0,fx:0};accB.rk={melee:12,dist:25,magic:0,def:1};
  const TA=(await login('a@x.com','Senha1234')).j.token;const TB=(await login('b@x.com','Senha1234')).j.token;
  r=await J('/api/site/stats');ok(r.s===200&&r.j.accounts>=2,'site: stats públicas');
  r=await J('/api/site/rank?k=melee');ok(r.s===200&&r.j.list[0].n==='Alice'&&r.j.list[0].lv===40,'site: rank melee sem login');
  r=await J('/api/site/rank?k=dist');ok(r.j.list[0].n==='Bob','site: rank dist');
  r=await J('/api/site/rank?k=all');ok(r.j.list[0].n==='Alice','site: rank geral');
  r=await J('/api/site/rank?k=xx');ok(r.s===400,'site: classe inválida');
  r=await J('/api/guild/create',{m:'POST',tok:TA,b:{name:'<b>',tag:'AB'}});ok(r.s===400,'guilda: nome inválido');
  r=await J('/api/guild/create',{m:'POST',tok:TA,b:{name:'Cavaleiros Reais',tag:'x'}});ok(r.s===400,'guilda: sigla inválida');
  accB.rk.melee=1;accB.rk.dist=3;r=await J('/api/guild/create',{m:'POST',tok:TB,b:{name:'Novatos',tag:'NV'}});ok(r.s===400,'guilda: nível mínimo');
  accB.rk.dist=25;
  r=await J('/api/guild/create',{m:'POST',tok:TA,b:{name:'Cavaleiros Reais',tag:'cr'}});ok(r.s===200&&r.j.guild.tag==='CR'&&r.j.guild.members.length===1,'guilda: criar');
  const GID=r.j.guild.id;
  r=await J('/api/guild/create',{m:'POST',tok:TA,b:{name:'Outra',tag:'OT'}});ok(r.s===400,'guilda: já está em uma');
  r=await J('/api/guild/create',{m:'POST',tok:TB,b:{name:'cavaleiros reais',tag:'ZZ'}});ok(r.s===400,'guilda: nome duplicado');
  r=await J('/api/guild/create',{m:'POST',tok:TB,b:{name:'Outra',tag:'CR'}});ok(r.s===400,'guilda: sigla duplicada');
  r=await J('/api/guild/join',{m:'POST',tok:TB,b:{id:'nada'}});ok(r.s===404,'guilda: entrar em inexistente');
  r=await J('/api/guild/join',{m:'POST',tok:TB,b:{id:GID}});ok(r.s===200&&r.j.guild.count===2,'guilda: entrar');
  r=await J('/api/me',{tok:TB});ok(r.j.guild&&r.j.guild.tag==='CR'&&!r.j.guild.leader,'me mostra a guilda');
  r=await J('/api/guild/kick',{m:'POST',tok:TB,b:{nick:'Alice'}});ok(r.s===403,'guilda: só líder expulsa');
  r=await J('/api/guild/desc',{m:'POST',tok:TA,b:{desc:'Vamos <juntos>\nsempre'}});ok(r.s===200&&!/[<>\n]/.test(r.j.guild.desc),'guilda: descrição limpa');
  r=await J('/api/site/guilds');ok(r.j.list.length===1&&r.j.list[0].power===65,'site: lista de guildas e poder');
  r=await J('/api/site/guild?id='+GID);ok(r.j.guild.members[0].r==='leader'&&r.j.guild.members.length===2,'site: detalhe da guilda');
  r=await J('/api/site/rank?k=melee');ok(r.j.list[0].g==='CR','site: rank mostra a sigla da guilda');
  r=await J('/api/guild/lead',{m:'POST',tok:TA,b:{nick:'Bob'}});ok(r.s===200,'guilda: passar liderança');
  r=await J('/api/guild/kick',{m:'POST',tok:TB,b:{nick:'Alice'}});ok(r.s===200&&r.j.guild.count===1,'guilda: novo líder expulsa');
  r=await J('/api/guild/leave',{m:'POST',tok:TA});ok(r.s===400,'guilda: fora dela não pode sair');
  r=await J('/api/guild/leave',{m:'POST',tok:TB});ok(r.s===200,'guilda: último sai');
  r=await J('/api/site/guilds');ok(r.j.list.length===0,'guilda some quando fica vazia');
  r=await J('/api/guild/create',{m:'POST',tok:TA,b:{name:'Fecha',tag:'FC'}});const G2=r.j.guild.id;
  r=await J('/api/guild/join',{m:'POST',tok:TB,b:{id:G2}});r=await J('/api/guild/disband',{m:'POST',tok:TB});ok(r.s===403,'guilda: membro não desfaz');
  r=await J('/api/guild/disband',{m:'POST',tok:TA});ok(r.s===200,'guilda: líder desfaz');r=await J('/api/me',{tok:TB});ok(r.j.guild===null,'desfazer libera os membros');
  // equipe
  r=await J('/api/site/staff');ok(r.j.staff.length===0,'site: sem equipe no início');
  accA.role='admin';accB.role='gm';r=await J('/api/site/staff');ok(r.j.staff.length===2&&r.j.staff[0].role==='admin'&&r.j.staff[1].n==='Bob','site: equipe (admin antes de GM)');
  r=await J('/api/me',{tok:TA});ok(r.j.role==='admin','me mostra o cargo');
  r=await fetch(B+'/api/admin/role/'+accA.id+'/gm',{method:'POST'});ok(r.status===403,'admin: cargo exige token');
  // diamantes
  r=await J('/api/billing/verify',{m:'POST',tok:TA,b:{sku:'diamonds_100',token:'x'.repeat(30)}});ok(r.s===503,'diamantes: desligado sem configuração');
  r=await J('/api/me',{tok:TA});ok(r.j.diamonds===0,'diamantes começam em 0');
  // páginas
  h=await fetch(B+'/site',{redirect:'manual'});ok(h.status===301,'/site redireciona para /site/');
 }

 {// ---- CORS do site independente ----
  let x=await fetch(B+'/api/site/stats',{headers:{Origin:'https://site.test'}});ok(x.headers.get('access-control-allow-origin')==='https://site.test','cors: site permitido');
  x=await fetch(B+'/api/site/stats',{headers:{Origin:'https://outro.com'}});ok(x.headers.get('access-control-allow-origin')===null,'cors: origem desconhecida não ganha cabeçalho');
  x=await fetch(B+'/api/login',{method:'OPTIONS',headers:{Origin:'https://outro.com','Access-Control-Request-Method':'POST'}});ok(x.status===403,'cors: preflight de login recusado a estranhos');
  x=await fetch(B+'/api/login',{method:'OPTIONS',headers:{Origin:'https://site.test','Access-Control-Request-Method':'POST'}});ok(x.status===204&&/Authorization/.test(x.headers.get('access-control-allow-headers')),'cors: preflight do site liberado');
  x=await fetch(B+'/');const t=await x.text();ok(true,'raiz responde');
 }
 console.log(`\n${pass} passaram, ${fail} falharam`);process.exit(fail?1:0);
})().catch(e=>{console.log('ERRO',e);process.exit(1)});
