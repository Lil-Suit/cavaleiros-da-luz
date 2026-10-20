(function(){
'use strict';
const CFG=window.SITE_CFG||{},API=(CFG.API||'').replace(/\/+$/,''),GAME=CFG.GAME||'/';
const {esc,iconURL,BON_N,EL_N,ATTR_N,fmtBon,RAR}=window.CLI,Cx=window.Core,IT=Cx.ITEMS;
const $=s=>document.querySelector(s),app=$('#app');
const TOK='cl_site_tok',ls={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
$('#fPlay').href=GAME;$('#fPriv').href=GAME.replace(/\/?$/,'/')+'privacidade.html';
$('#burger').onclick=()=>$('#nav').classList.toggle('open');
const CLASS=[['melee','Guerreiro','⚔️'],['dist','Arqueiro','🏹'],['magic','Mago','🔮'],['def','Defesa','🛡️']];
let me=null;

/* ---------- API ---------- */
async function http(path,o){o=o||{};const h={};if(o.b)h['Content-Type']='application/json';const t=ls.get(TOK);if(t&&!o.anon)h.Authorization='Bearer '+t;
 const c=new AbortController(),to=setTimeout(()=>c.abort(),30000);
 try{const r=await fetch(API+path,{method:o.m||'GET',headers:h,body:o.b?JSON.stringify(o.b):undefined,signal:c.signal});let j={};try{j=await r.json()}catch(e){}return{s:r.status,j}}
 catch(e){return{s:0,j:{err:'Não consegui falar com o servidor do jogo. Se ele estava dormindo, tente de novo em 30 segundos.'}}}finally{clearTimeout(to)}}
async function pow(kind){const r=await http('/api/challenge?k='+kind,{anon:true});if(r.s!==200)throw new Error(r.j.err||'Falha');const c=r.j,enc=new TextEncoder();
 for(let n=0;;n++){const h=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(c.salt+':'+n)));let z=0;for(const b of h){if(b===0){z+=8;continue}z+=Math.clz32(b)-24;break}if(z>=c.bits)return{id:c.id,nonce:n};if(n%2000===1999)await new Promise(r=>setTimeout(r));}}
async function loadMe(){if(!ls.get(TOK)){me=null;return}const r=await http('/api/me');if(r.s===200)me=r.j;else{me=null;if(r.s===401)ls.del(TOK)}}
function navAcc(){const a=$('#navAcc');a.textContent=me?me.nick:'Entrar'}
const fmtDate=t=>new Date(t).toLocaleDateString('pt-BR');
const roleTag=r=>r==='admin'?'<span class="role admin">Admin</span>':r==='gm'?'<span class="role gm">GM</span>':'';
const medal=i=>i<3?`<span class="medal${i+1}">${i+1}º</span>`:(i+1)+'º';
const clsName=k=>(CLASS.find(c=>c[0]===k)||[])[1]||k;

/* ---------- páginas ---------- */
const P={};
P.inicio=async()=>{
 app.innerHTML=`<section class="hero"><img src="icon.png" width="96" height="96" alt=""><h1>Cavaleiros da Luz</h1><p>RPG de ação em 3D, online, direto no navegador e no celular. Escolha entre espada, arco e magia, suba no ranking, forme uma guilda e enfrente chefes lendários.</p>
 <a class="btn" href="${esc(GAME)}">▶ Jogar agora</a><a class="btn alt" href="#baixar">📱 Baixar o app</a><div class="stats" id="st"></div></section>
 <div class="grid"><div class="card"><h3>🏆 Ranking</h3><p class="muted">Veja os melhores de cada classe: Guerreiro, Arqueiro, Mago e Defesa.</p><a href="#ranking">Ver ranking →</a></div>
 <div class="card"><h3>🛡️ Guildas</h3><p class="muted">Crie ou entre em uma guilda aqui no site, com a mesma conta do jogo.</p><a href="#guildas">Ver guildas →</a></div>
 <div class="card"><h3>🖼️ Galeria de itens</h3><p class="muted">Todos os ${Object.keys(IT).length} itens do jogo, com ícone, como funcionam e onde conseguir.</p><a href="#galeria">Abrir galeria →</a></div>
 <div class="card"><h3>👑 Equipe</h3><p class="muted">Conheça os administradores e GMs que cuidam do reino.</p><a href="#equipe">Ver equipe →</a></div>
 <div class="card"><h3>❓ Ajuda</h3><p class="muted">Controles, classes, habilidades, esquiva, poções, PvP e mais.</p><a href="#ajuda">Abrir ajuda →</a></div></div>`;
 const r=await http('/api/site/stats',{anon:true});if(r.s===200)$('#st').innerHTML=`<div class="stat"><b>${r.j.accounts}</b>jogadores</div><div class="stat"><b>${r.j.online}</b>online agora</div><div class="stat"><b>${r.j.guilds}</b>guildas</div>`;
 else $('#st').innerHTML='<span class="muted small">'+esc(r.j.err||'')+'</span>';
};
let rkK='all';
P.ranking=async()=>{
 app.innerHTML=`<h1>🏆 Ranking</h1><p class="muted">Os 50 melhores. A pontuação de cada classe é o nível dessa habilidade (arma). “Geral” usa a melhor classe do jogador. Jogadores banidos não aparecem.</p><div class="tabs" id="rt"></div><div id="rb"><p class="muted">Carregando…</p></div>`;
 const tabs=[['all','Geral','🌟'],...CLASS];$('#rt').innerHTML=tabs.map(c=>`<button data-k="${c[0]}" class="${c[0]===rkK?'on':''}">${c[2]} ${c[1]}</button>`).join('');
 $('#rt').onclick=e=>{const b=e.target.closest('button');if(b){rkK=b.dataset.k;P.ranking()}};
 const r=await http('/api/site/rank?k='+rkK,{anon:true});
 $('#rb').innerHTML=r.s!==200?`<div class="msg">${esc(r.j.err||'Erro')}</div>`:r.j.list.length?`<div class="tw"><table><tr><th>#</th><th>Jogador</th><th>Guilda</th><th>Nível</th></tr>${r.j.list.map((x,i)=>`<tr><td class="n">${medal(i)}</td><td>${roleTag(x.role)} ${esc(x.n)}</td><td>${x.g?`<span class="tag">${esc(x.g)}</span>`:'—'}</td><td>${x.lv}</td></tr>`).join('')}</table></div>`:'<p class="muted">Ninguém no ranking ainda. Seja o primeiro!</p>';
};
P.equipe=async()=>{
 app.innerHTML=`<h1>👑 Equipe</h1><p class="muted">Administradores e GMs (Game Masters) do Cavaleiros da Luz. Em caso de problema, procure-os no jogo ou use a denúncia do chat.</p><div id="sb"><p class="muted">Carregando…</p></div>
 <h3>O que cada um faz</h3><div class="grid"><div class="card"><span class="role admin">Admin</span><p>Cuida do servidor, das contas e das punições mais graves.</p></div><div class="card"><span class="role gm">GM</span><p>Modera o chat, atende denúncias e ajuda jogadores.</p></div></div>`;
 const r=await http('/api/site/staff',{anon:true});
 $('#sb').innerHTML=r.s!==200?`<div class="msg">${esc(r.j.err||'Erro')}</div>`:r.j.staff.length?`<div class="tw"><table><tr><th>Cargo</th><th>Nome</th><th>Status</th></tr>${r.j.staff.map(x=>`<tr><td>${roleTag(x.role)}</td><td>${esc(x.n)}</td><td><span class="dot${x.on?' on':''}"></span>${x.on?'online':'offline'}</td></tr>`).join('')}</table></div>`:'<p class="muted">A equipe ainda não foi definida.</p>';
};
P.guildas=async(arg)=>{
 if(arg)return guildPage(arg);
 app.innerHTML=`<h1>🛡️ Guildas</h1><p class="muted">Guildas são criadas e geridas aqui, com a mesma conta do jogo. Precisa de uma classe no nível 10 ou mais. Até 30 membros.</p>
 <div class="row"><input id="gq" placeholder="Buscar por nome ou sigla" style="max-width:320px"><a class="btn" href="#conta">${me?'Minha conta / criar guilda':'Entrar para criar uma guilda'}</a></div><div id="gb" style="margin-top:12px"><p class="muted">Carregando…</p></div>`;
 const load=async()=>{const q=$('#gq').value.trim();const r=await http('/api/site/guilds'+(q?'?q='+encodeURIComponent(q):''),{anon:true});
  $('#gb').innerHTML=r.s!==200?`<div class="msg">${esc(r.j.err||'Erro')}</div>`:r.j.list.length?`<div class="tw"><table><tr><th>#</th><th>Guilda</th><th>Líder</th><th>Membros</th><th>Poder</th></tr>${r.j.list.map((g,i)=>`<tr class="clk" data-id="${esc(g.id)}"><td class="n">${medal(i)}</td><td><span class="tag">${esc(g.tag)}</span>${esc(g.name)}</td><td>${esc(g.leader)}</td><td>${g.count}/${g.max}</td><td>${g.power}</td></tr>`).join('')}</table></div><p class="muted small">Poder = soma do melhor nível de cada membro.</p>`:'<p class="muted">Nenhuma guilda encontrada.</p>'};
 let t;$('#gq').oninput=()=>{clearTimeout(t);t=setTimeout(load,300)};$('#gb').onclick=e=>{const tr=e.target.closest('tr[data-id]');if(tr)location.hash='#guildas/'+tr.dataset.id};load();
};
async function guildPage(id){
 app.innerHTML='<p class="muted">Carregando…</p>';const r=await http('/api/site/guild?id='+encodeURIComponent(id),{anon:true});
 if(r.s!==200){app.innerHTML=`<div class="msg">${esc(r.j.err||'Erro')}</div><a href="#guildas">← Guildas</a>`;return}
 const g=r.j.guild,mine=me&&me.guild&&me.guild.id===g.id;
 app.innerHTML=`<a href="#guildas">← Guildas</a><h1><span class="tag">${esc(g.tag)}</span>${esc(g.name)}</h1><p class="muted">Criada em ${fmtDate(g.created)} · Líder: <b>${esc(g.leader)}</b> · ${g.count}/${g.max} membros · Poder ${g.power}</p>${g.desc?`<p>${esc(g.desc)}</p>`:''}
 <div class="row" id="ga"></div><div id="gm"></div><div class="tw" style="margin-top:12px"><table><tr><th>#</th><th>Membro</th><th>Cargo</th><th>Nível</th><th>Status</th></tr>${g.members.map((m,i)=>`<tr><td class="n">${i+1}</td><td>${roleTag(m.role)} ${esc(m.n)}</td><td>${m.r==='leader'?'👑 Líder':'Membro'}</td><td>${m.lv}</td><td><span class="dot${m.on?' on':''}"></span>${m.on?'online':'offline'}</td></tr>`).join('')}</table></div>`;
 const ga=$('#ga');
 if(me&&!me.guild&&g.count<g.max){ga.innerHTML='<button class="btn" id="bj">Entrar nesta guilda</button>';$('#bj').onclick=async()=>{const x=await http('/api/guild/join',{m:'POST',b:{id:g.id}});if(x.s===200){await loadMe();guildPage(id)}else $('#gm').innerHTML=`<div class="msg">${esc(x.j.err||'Erro')}</div>`}}
 else if(!me)ga.innerHTML='<a class="btn alt" href="#conta">Entre na sua conta para participar</a>';
 else if(mine)ga.innerHTML='<a class="btn alt" href="#conta">Gerenciar minha guilda</a>';
}
P.galeria=()=>galeria();
P.baixar=()=>{
 const ps=CFG.PLAY_STORE;
 app.innerHTML=`<h1>📱 Baixar o app</h1><div class="grid"><div class="card"><h3>Google Play</h3><p class="muted">${ps?'O app oficial já está na loja.':'O app está sendo preparado para a Google Play. Em breve o botão aparece aqui.'}</p>${ps?`<a class="btn" href="${esc(ps)}">Instalar pela Google Play</a>`:'<button class="btn" disabled>Em breve</button>'}</div>
 <div class="card"><h3>Instalar agora (Android)</h3><ol class="small"><li>Abra <a href="${esc(GAME)}">o jogo</a> no Chrome.</li><li>Toque nos três pontinhos ⋮ e em <b>“Instalar app”</b> ou <b>“Adicionar à tela inicial”</b>.</li><li>Pronto: ele abre em tela cheia, como um app.</li></ol></div>
 <div class="card"><h3>iPhone</h3><ol class="small"><li>Abra <a href="${esc(GAME)}">o jogo</a> no Safari.</li><li>Toque em Compartilhar e em <b>“Adicionar à Tela de Início”</b>.</li></ol></div>
 <div class="card"><h3>Computador</h3><p class="muted">Basta abrir o jogo no navegador (Chrome, Edge, Firefox ou Safari).</p><a class="btn" href="${esc(GAME)}">▶ Jogar</a></div></div>`;
};
P.conta=async()=>{
 await loadMe();navAcc();
 if(!me){
  app.innerHTML=`<h1>Entrar</h1><p class="muted">Use o mesmo e-mail e a mesma senha do jogo. Não tem conta? <a href="${esc(GAME)}">Crie no jogo</a>.</p><div class="card" style="max-width:420px"><form id="lf"><label>E-mail</label><input type="email" id="le" autocomplete="username" required><label>Senha</label><input type="password" id="lp" autocomplete="current-password" required><div id="lm"></div><button class="btn" id="lb">Entrar</button></form></div>`;
  $('#lf').onsubmit=async e=>{e.preventDefault();const b=$('#lb');b.disabled=true;b.textContent='Verificando…';$('#lm').innerHTML='';
   try{const ch=await pow('login');const r=await http('/api/login',{m:'POST',anon:true,b:{email:$('#le').value,password:$('#lp').value,ch}});
    if(r.s===200&&r.j.token){ls.set(TOK,r.j.token);await loadMe();navAcc();P.conta();return}$('#lm').innerHTML=`<div class="msg">${esc(r.j.err||'Não foi possível entrar.')}</div>`}
   catch(er){$('#lm').innerHTML=`<div class="msg">${esc(er.message||'Erro')}</div>`}b.disabled=false;b.textContent='Entrar'};return}
 app.innerHTML=`<h1>Minha conta</h1><div class="card"><p><b>${esc(me.nick)}</b> ${roleTag(me.role)}<br><span class="muted small">${esc(me.email)}</span></p><p>💎 Diamantes: <b>${me.diamonds|0}</b></p><button class="btn alt sm" id="lo">Sair</button></div><div id="gc"></div>`;
 $('#lo').onclick=async()=>{await http('/api/logout',{m:'POST'});ls.del(TOK);me=null;navAcc();P.conta()};
 const gc=$('#gc');
 if(me.guild){const r=await http('/api/site/guild?id='+me.guild.id,{anon:true});const g=r.j.guild;if(!g){gc.innerHTML='';return}
  gc.innerHTML=`<h2><span class="tag">${esc(g.tag)}</span>${esc(g.name)}</h2><p class="muted">${g.count}/${g.max} membros · Poder ${g.power} · <a href="#guildas/${esc(g.id)}">ver página pública</a></p><div id="gm"></div>
  ${me.guild.leader?`<div class="card"><h3>Painel do líder</h3><label>Descrição (até 140 caracteres)</label><input id="gd" maxlength="140" value="${esc(g.desc)}"><div class="row" style="margin-top:8px"><button class="btn sm" id="gds">Salvar descrição</button></div>
  <h3>Membros</h3><div class="tw"><table>${g.members.filter(m=>m.r!=='leader').map(m=>`<tr><td>${esc(m.n)}</td><td>${m.lv}</td><td><button class="btn alt sm" data-lead="${esc(m.n)}">Passar liderança</button> <button class="btn red sm" data-kick="${esc(m.n)}">Expulsar</button></td></tr>`).join('')||'<tr><td class="muted">Só você por enquanto.</td></tr>'}</table></div>
  <div class="row" style="margin-top:12px"><button class="btn red sm" id="gdis">Desfazer a guilda</button></div></div>`:`<div class="row"><button class="btn red sm" id="glv">Sair da guilda</button></div>`}`;
  const act=async(a,b,ask)=>{if(ask&&!confirm(ask))return;const x=await http('/api/guild/'+a,{m:'POST',b:b||{}});if(x.s===200){await loadMe();P.conta()}else $('#gm').innerHTML=`<div class="msg">${esc(x.j.err||'Erro')}</div>`};
  gc.onclick=e=>{const t=e.target.closest('button');if(!t)return;if(t.id==='glv')conf('Sair da guilda?',()=>act('leave'));else if(t.id==='gdis')conf('Desfazer a guilda? Todos os membros saem.',()=>act('disband'));else if(t.id==='gds')act('desc',{desc:$('#gd').value});else if(t.dataset.kick)conf('Expulsar '+t.dataset.kick+'?',()=>act('kick',{nick:t.dataset.kick}));else if(t.dataset.lead)conf('Passar a liderança para '+t.dataset.lead+'? Você deixa de ser líder.',()=>act('lead',{nick:t.dataset.lead}))};
 }else{
  gc.innerHTML=`<h2>Criar uma guilda</h2><div class="card" style="max-width:460px"><p class="muted small">Precisa de uma classe no nível 10 ou mais. Nome: 3 a 20 letras ou números. Sigla: 2 a 4 letras ou números.</p><label>Nome da guilda</label><input id="gn" maxlength="20"><label>Sigla</label><input id="gt" maxlength="4" style="text-transform:uppercase"><div id="gm"></div><button class="btn" id="gc1">Criar guilda</button></div><p class="muted">Ou <a href="#guildas">procure uma guilda</a> para entrar.</p>`;
  $('#gc1').onclick=async()=>{const x=await http('/api/guild/create',{m:'POST',b:{name:$('#gn').value,tag:$('#gt').value}});if(x.s===200){await loadMe();location.hash='#guildas/'+x.j.guild.id}else $('#gm').innerHTML=`<div class="msg">${esc(x.j.err||'Erro')}</div>`};
 }
};
/* confirmação própria (sem confirm() do navegador) */
function conf(txt,yes){const m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="mbox"><p>${esc(txt)}</p><div class="row"><button class="btn sm" data-y>Sim</button><button class="btn alt sm" data-n>Não</button></div></div>`;
 m.onclick=e=>{const b=e.target.closest('button');if(e.target===m||(b&&b.hasAttribute('data-n')))m.remove();else if(b&&b.hasAttribute('data-y')){m.remove();yes()}};document.body.appendChild(m)}

/* ---------- ajuda ---------- */
P.ajuda=()=>{
 app.innerHTML=`<h1>❓ Ajuda</h1><div class="help">
 <details open><summary>Primeiros passos</summary><p>Crie uma conta no jogo com e-mail e senha (ou Google, quando disponível). Escolha um nome único: ele aparece no ranking, nas guildas e no chat. Seu progresso fica salvo na conta e vale em qualquer aparelho.</p></details>
 <details><summary>Controles</summary><ul><li><b>Mover:</b> <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ou setas (joystick no celular). <kbd>Shift</kbd> corre, <kbd>Espaço</kbd> pula.</li><li><b>Atacar:</b> botão esquerdo do mouse (ou o botão de ataque no celular). Segure para atacar repetidamente. Não há alvo fixo: o golpe só causa dano quando acerta, então mire e chegue perto.</li><li><b>Habilidades:</b> botão direito, <kbd>R</kbd>, <kbd>G</kbd> e <kbd>T</kbd> usam as habilidades da arma equipada.</li><li><b>Trocar de arma/classe:</b> <kbd>1</kbd> corpo a corpo · <kbd>2</kbd> arco · <kbd>3</kbd> magia (gasta mana).</li><li><b>Interagir:</b> <kbd>E</kbd> com NPCs e portais. Itens do chão são coletados ao passar por cima.</li><li><b>Poções:</b> <kbd>Q</kbd> vida · <kbd>Z</kbd> mana. Todas as teclas podem ser trocadas em Menu › Teclas.</li></ul></details>
 <details><summary>Classes e habilidades</summary><p>Cada arma é uma classe com seu próprio nível, que sobe quando você luta com ela. As habilidades desbloqueiam nos níveis <b>3, 8 e 14</b> da arma.</p><ul><li>⚔️ <b>Guerreiro (espada):</b> Giro · Golpe Sísmico · Investida.</li><li>🏹 <b>Arqueiro (arco):</b> Tripla · Flecha Perfurante · Chuva de Flechas.</li><li>🔮 <b>Mago (cajado):</b> Orbe de Brasas · Nova Gélida · Raio em Cadeia.</li></ul><p>Algumas habilidades podem ser <b>carregadas</b>: segure o botão e solte. Quanto maior a carga, maior o efeito (Golpe Sísmico, Flecha Perfurante e Nova Gélida). A <b>recarga é compartilhada</b>: usar a habilidade 1 de uma classe trava a 1 das outras também, e o mesmo vale para a 2 e a 3.</p></details>
 <details><summary>Esquiva (dash)</summary><p>A tecla <kbd>C</kbd> faz uma rolagem de esquiva: você fica invulnerável por instantes. A esquiva usa <b>cargas</b>: você começa com 3, ganha +1 a cada 50 níveis (máximo 12) e elas recarregam sozinhas, uma a cada 4 segundos, ficando mais rápidas com o nível. A barrinha das cargas aparece abaixo da barra de XP.</p></details>
 <details><summary>Atributos e equipamentos</summary><ul>${Object.keys(ATTR_N).map(k=>`<li><b>${ATTR_N[k]}:</b> ${esc(window.CLI.ATTR_D[k])}</li>`).join('')}</ul><p>Cada equipamento pede um nível mínimo. Itens de nível 100 ou mais possuem <b>raridade</b>: Básico, Comum, Raro, Épico, Ultra raro e Lendário, que aumenta seus bônus. Veja todos na <a href="#galeria">galeria</a>.</p></details>
 <details><summary>Poções e loja</summary><p>O lojista vende poções de vida e de mana em três tamanhos: pequena (cura 40%), média (65%) e grande (90%). Os preços são 20, 70 e 200 de ouro, e a venda rende 8, 30 e 80. A compra sempre pede confirmação (Sim/Não). As poções também caem de monstros, mas com pouca frequência.</p></details>
 <details><summary>Chefes e conjuntos</summary><p>Cada região tem monstros que soltam peças de um conjunto de armadura (capacete, armadura, calças, botas, escudo, acessório, cordão e mochila), além de armas. Os chefes soltam itens exclusivos. Consulte na <a href="#galeria">galeria</a> quem solta cada item e com que chance.</p></details>
 <details><summary>Online, chat e PvP</summary><p>Todos jogam no mesmo reino: vocês se veem, conversam e dividem o dano nos monstros. Há chat, trocas entre jogadores, mercado e denúncias. Chat ofensivo, nomes impróprios e trapaça são punidos pela equipe (veja a <a href="#equipe">equipe</a>). Em áreas de PvP, jogadores podem se enfrentar.</p></details>
 <details><summary>Guildas</summary><p>Crie sua guilda aqui no site, na aba <a href="#guildas">Guildas</a> / <a href="#conta">Conta</a>: precisa de uma classe no nível 10, nome de 3 a 20 caracteres e uma sigla de 2 a 4. O líder pode editar a descrição, expulsar e passar a liderança. Cada guilda tem até 30 membros e aparece no ranking de poder.</p></details>
 <details><summary>Problemas comuns</summary><ul><li><b>O jogo demora para abrir:</b> o servidor gratuito “dorme” quando ninguém joga e leva até 1 minuto para acordar. Aguarde.</li><li><b>Esqueci a senha:</b> na tela de entrada do jogo, use “Esqueci a senha”.</li><li><b>Fui silenciado:</b> o chat fica bloqueado por um tempo após denúncias; volta sozinho.</li></ul></details></div>`;
};

/* ---------- galeria de itens ---------- */
const SLOT_ORDER=['weaponMelee','weaponDist','weaponMagic','helmet','armor','legs','boots','shield','accessory','necklace','backpack'];
const STYLE_N={melee:'Guerreiro (corpo a corpo)',dist:'Arqueiro (à distância)',magic:'Mago (magia)'};
let SRC=null;
function sources(){if(SRC)return SRC;SRC={};const add=(id,o)=>{(SRC[id]=SRC[id]||[]).push(o)};
 for(const [mid,m] of Object.entries(Cx.MONSTERS))for(const d of m.drops||[])add(d.id,{t:'mob',n:m.name,lv:m.level,ch:d.chance,boss:/^boss_/.test(mid),min:d.min,max:d.max});
 for(const sh of Object.values(Cx.SHOPS))for(const [id,pr] of sh.stock)add(id,{t:'shop',n:sh.name,pr});
 for(const q of Object.values(Cx.QUESTS||{}))for(const [id,n] of (q.reward&&q.reward.items)||[])add(id,{t:'quest',n:q.name,q:n});
 return SRC}
const isBoss=id=>(sources()[id]||[]).some(s=>s.boss);
const pct=c=>c>=.1?Math.round(c*100)+'%':(c*100).toFixed(c<.01?2:1).replace('.',',')+'%';
function tiersOf(d){if(!Cx.needsTier(d))return[0];const mn=d.tierMin||1,a=[];for(let t=mn;t<=6;t++)a.push(t);return a}
function explain(id,tier){
 const d=IT[id],L=[],S=Cx.SET_OF&&Cx.SET_OF[id],mul=tier?Cx.TIERS[tier].mul:1;
 const rn=v=>Math.round(v*mul);
 if(d.type==='weapon'){const avg=(d.dmg.min+d.dmg.max)/2*mul;L.push(`<b>Arma de ${STYLE_N[d.style]}.</b> Dano ${rn(d.dmg.min)}–${rn(d.dmg.max)} por golpe, um golpe a cada ${(d.atkMs/1000).toFixed(2).replace('.',',')} s (cerca de ${(avg*1000/d.atkMs).toFixed(1).replace('.',',')} de dano por segundo, sem contar atributos, críticos e habilidades). O dano final cresce com ${ATTR_N[Cx.STYLE_ATTR[d.style]]} e com o nível da habilidade da arma. Ao equipar, você usa as habilidades dessa classe.`)}
 else if(d.type==='armor'){
  const sn=Cx.SLOT_NAME[d.slot];
  if(d.slot==='backpack')L.push(`<b>${sn}.</b> Aumenta o espaço do inventário${d.bag?` em ${d.bag} espaços${tier>=3?' (mais com raridade Raro ou acima)':''}`:''}.`);
  else if(d.slot==='accessory'||d.slot==='necklace')L.push(`<b>${sn}.</b> Dá bônus de atributos${d.def?` e ${rn(d.def)} de defesa`:''} enquanto estiver equipado.`);
  else L.push(`<b>${sn}.</b> Reduz o dano que você recebe: <b>${rn(d.def)} de defesa</b>. Quanto mais peças, mais defesa.`)}
 else if(d.type==='consumable'){const f=d.fx||{},a=[];if(f.healPct)a.push(`restaura ${Math.round(f.healPct*100)}% da vida máxima`);if(f.manaPct)a.push(`restaura ${Math.round(f.manaPct*100)}% da mana máxima`);if(f.cure)a.push('cura veneno');if(f.teleport)a.push('teleporta você de volta à vila');L.push(`<b>Consumível.</b> Ao usar, ${a.join(' e ')||'tem efeito especial'}. Empilha até ${d.stack}.`)}
 else if(d.type==='material')L.push(`<b>Material.</b> Item de coleta dos monstros. Pode ser vendido ao lojista ou negociado com outros jogadores. Empilha até ${d.stack}.`);
 else if(d.type==='skin')L.push(`<b>Skin (cosmético).</b> Muda apenas a aparência, sem alterar atributos. Use o item para liberar e depois equipe em Menu › Personagem › Aparência. Pode ser negociado antes de usar.`);
 if(S)L.push(`Faz parte do conjunto <b>${esc(S.n)}</b> (nível ${S.lv}).`);
 if(d.reqLevel)L.push(`Exige <b>nível ${d.reqLevel}</b>.`);
 const ra=Object.entries(d.reqAttr||{});if(ra.length)L.push('Exige '+ra.map(([k,v])=>`${ATTR_N[k]} ${v}`).join(', ')+'.');
 if(d.heal)L.push('Possui <b>efeito de cura</b> (só funciona com raridade Raro ou acima): '+(d.heal.aura?'aura que cura aliados num raio de 100 m.':'parte do dano que você leva vira cura.'));
 if(Cx.needsTier(d))L.push(tier?`Raridade <b>${Cx.TIERS[tier].n}</b>: bônus multiplicados por ×${Cx.TIERS[tier].mul}.`:'');
 return L.filter(Boolean)}
function statsList(id,tier){const d=IT[id],mul=tier?Cx.TIERS[tier].mul:1,o=[];
 for(const [k,v] of Object.entries(d.bonuses||{}))o.push(fmtBon(k,typeof v==='number'&&Math.abs(v)>=1?Math.round(v*mul):v));
 for(const [k,v] of Object.entries(d.res||{}))o.push(`${v>0?'+':''}${Math.round(v*mul)}% resistência a ${EL_N[k]||k}`);
 return o}
function whereList(id){const s=sources()[id]||[],o=[];
 const shops=s.filter(x=>x.t==='shop');if(shops.length)o.push('🛒 Vendido por '+shops.map(x=>`${esc(x.n)} (${x.pr} ouro)`).join(', '));
 const mobs=s.filter(x=>x.t==='mob').sort((a,b)=>b.ch-a.ch);
 for(const x of mobs.slice(0,8))o.push(`${x.boss?'👹 <b>Chefe</b> ':'🐾 '}${esc(x.n)} (nv ${x.lv}) — ${pct(x.ch)}${x.max>1?' · '+x.min+'–'+x.max+' un.':''}`);
 if(mobs.length>8)o.push(`… e mais ${mobs.length-8} monstros`);
 for(const x of s.filter(x=>x.t==='quest'))o.push(`📜 Recompensa da missão “${esc(x.n)}”`);
 if(!o.length)o.push('Item antigo: hoje não cai de monstros nem é vendido. Pode ser conseguido por troca ou Mercado com outros jogadores.');
 return o}
function openItem(id,tier0){
 const d=IT[id],ts=tiersOf(d);let tier=tier0!=null?tier0:ts[0];
 const m=document.createElement('div');m.className='modal';
 const draw=()=>{const L=explain(id,tier),st=statsList(id,tier),rar=tier?Cx.TIERS[tier].k:d.rarity;
  m.innerHTML=`<div class="mbox"><div class="head"><img src="${iconURL(tier?{id,t:tier}:id)}" alt=""><div><h3 style="margin:0">${esc(d.name)}</h3><div class="muted small">${esc(typeLabel(d))}${Cx.needsTier(d)&&tier?` · <span class="rar-${rar}">${Cx.TIERS[tier].n}</span>`:''}</div><div class="small">Vale ${d.sell} ouro ao vender</div></div></div>
  ${ts.length>1?`<div class="vars">${ts.map(t=>`<button data-t="${t}" class="${t===tier?'on':''}"><img src="${iconURL({id,t})}" alt="">${Cx.TIERS[t].n}</button>`).join('')}</div>`:''}
  ${d.type==='weapon'?`<p><b>Dano:</b> ${Math.round(d.dmg.min*(tier?Cx.TIERS[tier].mul:1))}–${Math.round(d.dmg.max*(tier?Cx.TIERS[tier].mul:1))}</p>`:''}
  ${st.length?`<h3>Bônus</h3><ul>${st.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
  <h3>Como funciona</h3>${d.desc?`<p class="muted">${esc(d.desc)}</p>`:''}${L.map(x=>`<p>${x}</p>`).join('')}
  <h3>Onde conseguir</h3><ul>${whereList(id).map(x=>`<li>${x}</li>`).join('')}</ul><div class="row" style="margin-top:12px"><button class="btn alt sm" data-x>Fechar</button></div></div>`};
 draw();m.onclick=e=>{if(e.target===m||e.target.closest('[data-x]')){m.remove();return}const b=e.target.closest('[data-t]');if(b){tier=+b.dataset.t;draw()}};document.body.appendChild(m)}
function typeLabel(d){if(d.type==='weapon')return STYLE_N[d.style].split(' ')[0]==='Guerreiro'?'Espada / arma corpo a corpo':d.style==='dist'?'Arco':'Cajado';if(d.type==='armor')return Cx.SLOT_NAME[d.slot];return{consumable:'Consumível',material:'Material',skin:'Skin'}[d.type]||d.type}
let GF={q:'',cat:'all',lim:60};
function galeria(){
 const all=Object.keys(IT);
 const cats=[['all','Todos'],['weapon','Armas'],['helmet','Capacetes'],['armor','Armaduras'],['legs','Calças'],['boots','Botas'],['shield','Escudos'],['accessory','Acessórios'],['necklace','Cordões'],['backpack','Mochilas'],['set','Conjuntos'],['boss','Itens de chefe'],['consumable','Poções'],['material','Materiais'],['skin','Skins']];
 const match=(id,c)=>{const d=IT[id];switch(c){case'all':return true;case'weapon':return d.type==='weapon';case'set':return !!d.set||!!d.wset;case'boss':return isBoss(id);case'consumable':case'material':case'skin':return d.type===c;default:return d.type==='armor'&&d.slot===c}};
 app.innerHTML=`<h1>🖼️ Galeria de itens</h1><p class="muted">Todos os <b>${all.length}</b> itens do jogo, sempre iguais ao que está no servidor. Toque num item para ver como funciona, os bônus por raridade e onde conseguir.</p>
 <input id="gs" placeholder="Buscar item pelo nome" value="${esc(GF.q)}"><div class="tabs" id="gc">${cats.map(c=>`<button data-c="${c[0]}" class="${GF.cat===c[0]?'on':''}">${c[1]}</button>`).join('')}</div><p class="muted small" id="gn"></p><div class="ig" id="gg"></div><div style="text-align:center"><button class="btn alt" id="gmore">Mostrar mais</button></div>`;
 const draw=()=>{const q=GF.q.toLowerCase();let l=all.filter(id=>match(id,GF.cat)&&(!q||IT[id].name.toLowerCase().includes(q)));
  l.sort((a,b)=>(IT[a].reqLevel||0)-(IT[b].reqLevel||0)||SLOT_ORDER.indexOf(IT[a].slot)-SLOT_ORDER.indexOf(IT[b].slot)||IT[a].name.localeCompare(IT[b].name));
  $('#gn').textContent=l.length+' itens';const sh=l.slice(0,GF.lim);
  $('#gg').innerHTML=sh.map(id=>{const d=IT[id];return`<div class="it" data-id="${id}"><img src="${iconURL(id)}" alt="" loading="lazy"><b>${esc(d.name)}</b><small>${d.reqLevel?'Nv '+d.reqLevel+' · ':''}${esc(typeLabel(d))}</small></div>`}).join('');
  $('#gmore').style.display=l.length>sh.length?'':'none'};
 $('#gs').oninput=e=>{GF.q=e.target.value;GF.lim=60;draw()};
 $('#gc').onclick=e=>{const b=e.target.closest('button');if(!b)return;GF.cat=b.dataset.c;GF.lim=60;document.querySelectorAll('#gc button').forEach(x=>x.classList.toggle('on',x===b));draw()};
 $('#gmore').onclick=()=>{GF.lim+=120;draw()};$('#gg').onclick=e=>{const c=e.target.closest('.it');if(c)openItem(c.dataset.id)};draw();
}

/* ---------- roteador ---------- */
async function route(){
 const h=(location.hash||'#inicio').slice(1),[pg,arg]=h.split('/'),f=P[pg]||P.inicio;
 document.querySelectorAll('nav a[data-p]').forEach(a=>a.classList.toggle('on',a.dataset.p===(P[pg]?pg:'inicio')));
 $('#nav').classList.remove('open');window.scrollTo(0,0);
 try{await f(arg)}catch(e){app.innerHTML=`<div class="msg">Algo deu errado ao abrir esta página. Recarregue.</div>`;console.error(e)}
 document.title={inicio:'Cavaleiros da Luz — Site oficial',ranking:'Ranking — Cavaleiros da Luz',guildas:'Guildas — Cavaleiros da Luz',equipe:'Equipe — Cavaleiros da Luz',galeria:'Galeria de itens — Cavaleiros da Luz',ajuda:'Ajuda — Cavaleiros da Luz',baixar:'Baixar — Cavaleiros da Luz',conta:'Conta — Cavaleiros da Luz'}[pg]||document.title;
}
window.addEventListener('hashchange',route);
loadMe().then(()=>{navAcc();route()});
})();
