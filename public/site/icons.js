/* GERADO por build.js a partir de src/ui.js: os mesmos ícones do jogo. Não edite. */
(function(){'use strict';const Cx=window.Core,IT=Cx.ITEMS;
const hexMix=(a,b,t)=>{const p=h=>{h=String(h).replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');return[0,2,4].map(i=>parseInt(h.substr(i,2),16)||0)},A=p(a),B=p(b);return'#'+A.map((v,i)=>('0'+Math.round(v+(B[i]-v)*t).toString(16)).slice(-2)).join('')};
function wvTone(w){const c=w.c,a=w.a,m=w.m;
 return m==='metal'?{bl:hexMix(c,'#ffffff',.5),sh:hexMix(c,'#ffffff',.2)}:m==='crystal'?{bl:hexMix(c,'#ffffff',.6),sh:hexMix(c,'#ffffff',.35)}:m==='leather'?{bl:hexMix(c,'#dfe6ee',.55),sh:'#6b4423'}
  :m==='cloth'?{bl:hexMix(c,'#ffffff',.55),sh:hexMix(c,'#000000',.12)}:m==='bone'?{bl:'#e8e0c8',sh:'#d8d0b8'}:{bl:hexMix(c,'#ffffff',.38),sh:hexMix(c,'#000000',.25)}}
const RAR=Cx.RARITY,ATTR_N={str:'Força',agi:'Agilidade',int:'Inteligência',vit:'Vitalidade',pre:'Precisão'},ATTR_D={str:'Dano corpo a corpo',agi:'Dano à distância, velocidade, esquiva',int:'Dano e mana (magia)',vit:'Vida máxima e defesa',pre:'Crítico'};
const EL_N={phys:'Físico',fire:'Fogo',ice:'Gelo',arcane:'Arcano',shadow:'Sombra',poison:'Veneno'};
const BON_N={str:'Força',agi:'Agilidade',int:'Inteligência',vit:'Vitalidade',pre:'Precisão',def:'Defesa',crit:'Crítico',atkSpeed:'Vel. de ataque',move:'Movimento',luck:'Sorte',dodge:'Esquiva',magDmg:'Dano mágico'};
const fmtBon=(k,v)=>(v>0?'+':'')+(['crit','dodge','atkSpeed','magDmg'].includes(k)?Math.round(v*100)+'%':k==='move'?v+'%':v)+' '+BON_N[k];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- ícones desenhados em canvas ---------- */
const ICONS={};
/* fundos de raridade: só para itens que caem de monstros nível 100+ (Cx.rarityShown); o resto fica sem fundo */
const RBG={uncommon:['#52c25e','#10361a'],rare:['#4f9bff','#0d2350'],epic:['#a266f0','#2a1050'],ultra:['#ffd23f','#6a4a00'],legendary:['#ffffff','#9aa1b4']};
const eid=x=>typeof x==='string'?x:x.id,etier=x=>typeof x==='string'?Cx.tierOf({id:x}):Cx.tierOf(x),rarOn=x=>etier(typeof x==='string'?{id:x}:x)>1,d_ok=id=>IT[id]&&IT[id].rarity!=='common',erar=x=>etier(x)>0?Cx.TIERS[etier(x)].k:IT[eid(x)].rarity;
const rarB=x=>rarOn(x)?RAR[erar(x)].c:'var(--line)';
// ícones dos conjuntos: silhueta por peça + textura por material (couro, metal, pano, escama, cristal, osso) + enfeites de cada bioma
function setIcon(x,d){const S=Cx.SET_OF[d.id]||(d.slot==='necklace'&&d.icon?{m:'crystal',c:d.icon.c,a:hexMix(d.icon.c,'#ffffff',.55),k:'x'}:null);if(!S)return false;const sl=d.slot,m=S.m,c=(d.icon&&d.icon.c)||S.c,A=S.a,k=S.k;
 const lt=hexMix(c,'#ffffff',.35),dk=hexMix(c,'#000000',.45),ac=A;
 const P=(pts)=>{x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath()};
let sil={
  helmet:()=>{x.beginPath();x.moveTo(9,35);x.lineTo(9,23);x.quadraticCurveTo(9,8,24,8);x.quadraticCurveTo(39,8,39,23);x.lineTo(39,35);x.lineTo(31,35);x.lineTo(31,28);x.lineTo(17,28);x.lineTo(17,35);x.closePath()},
  armor:()=>P([[14,7],[20,10],[24,13],[28,10],[34,7],[43,13],[39,25],[35,22],[35,41],[13,41],[13,22],[9,25],[5,13]]),
  legs:()=>P([[11,7],[37,7],[38,19],[32,41],[25,41],[24,21],[23,41],[16,41],[10,19]]),
  boots:()=>{P([[4,9],[16,9],[16,27],[22,32],[22,41],[4,41]]);},
  shield:()=>{x.beginPath();x.moveTo(8,7);x.lineTo(40,7);x.lineTo(40,24);x.quadraticCurveTo(40,38,24,44);x.quadraticCurveTo(8,38,8,24);x.closePath()}}[sl];
 const VS={
  helmet_a:()=>{x.beginPath();x.moveTo(8,40);x.lineTo(8,26);x.quadraticCurveTo(7,10,21,8);x.quadraticCurveTo(30,7,38,2);x.quadraticCurveTo(36,12,40,24);x.lineTo(40,40);x.quadraticCurveTo(24,35,8,40);x.closePath()},
  helmet_m:()=>{x.beginPath();x.ellipse(24,37,21,6,0,0,7);x.moveTo(13,37);x.quadraticCurveTo(17,19,32,2);x.quadraticCurveTo(31,20,35,37);x.closePath()},
  armor_a:()=>P([[15,5],[21,9],[27,9],[33,5],[41,11],[45,28],[40,30],[44,43],[4,43],[8,30],[3,28],[7,11]]),
  armor_m:()=>{x.beginPath();x.moveTo(17,5);x.lineTo(31,5);x.quadraticCurveTo(36,12,38,24);x.lineTo(45,43);x.quadraticCurveTo(24,47,3,43);x.lineTo(10,24);x.quadraticCurveTo(12,12,17,5);x.closePath()}};
 const vsil=d.var?VS[sl+'_'+d.var]:null;if(vsil)sil=vsil;
 if(sl==='necklace'){x.save();x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=3;x.lineCap='round';x.strokeStyle=hexMix(A,'#ffffff',.25);x.lineWidth=2.6;x.beginPath();x.moveTo(8,6);x.quadraticCurveTo(24,40,40,6);x.stroke();x.restore();
  x.strokeStyle=dk;x.lineWidth=.8;x.setLineDash([2,3]);x.beginPath();x.moveTo(8,6);x.quadraticCurveTo(24,40,40,6);x.stroke();x.setLineDash([]);
  const g=x.createRadialGradient(22,28,1,24,31,10);g.addColorStop(0,'#fff');g.addColorStop(.4,c);g.addColorStop(1,dk);x.fillStyle=g;x.beginPath();
  if(m==='crystal'||m==='scale'){x.moveTo(24,22);x.lineTo(32,32);x.lineTo(24,43);x.lineTo(16,32)}else if(m==='bone'){x.arc(24,32,8,0,7)}else{x.moveTo(24,22);x.lineTo(31,28);x.lineTo(31,36);x.lineTo(24,42);x.lineTo(17,36);x.lineTo(17,28)}
  x.closePath();x.fill();x.strokeStyle=dk;x.lineWidth=1.2;x.stroke();x.fillStyle='rgba(255,255,255,.55)';x.beginPath();x.arc(21,29,2,0,7);x.fill();return true}
 if(sl==='backpack'){const ln=(w,col,pts)=>{x.strokeStyle=col;x.lineWidth=w;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke()},rr=(a,b,w,h,r)=>{x.beginPath();x.moveTo(a+r,b);x.lineTo(a+w-r,b);x.quadraticCurveTo(a+w,b,a+w,b+r);x.lineTo(a+w,b+h-r);x.quadraticCurveTo(a+w,b+h,a+w-r,b+h);x.lineTo(a+r,b+h);x.quadraticCurveTo(a,b+h,a,b+h-r);x.lineTo(a,b+r);x.quadraticCurveTo(a,b,a+r,b);x.closePath()};
  x.save();x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=3;x.shadowOffsetY=1.5;x.strokeStyle=dk;x.lineWidth=3;x.beginPath();x.arc(24,10,7,Math.PI,0);x.stroke();
  const g=x.createLinearGradient(8,8,40,44);g.addColorStop(0,lt);g.addColorStop(.5,c);g.addColorStop(1,dk);x.fillStyle=g;rr(9,9,30,34,8);x.fill();x.restore();
  rr(9,9,30,34,8);x.strokeStyle=dk;x.lineWidth=1.6;x.stroke();
  x.fillStyle=hexMix(c,'#000000',.22);rr(9,9,30,15,7);x.fill();x.strokeStyle=dk;x.lineWidth=1.2;x.stroke();
  x.fillStyle=hexMix(c,ac,.25);rr(14,29,20,11,3);x.fill();x.strokeStyle=dk;x.lineWidth=1;x.stroke();ln(1,dk,[[24,29],[24,40]]);
  x.fillStyle=ac;rr(21,20,6,7,1.5);x.fill();x.strokeStyle=dk;x.lineWidth=1;x.stroke();ln(2.4,hexMix(c,'#000000',.4),[[12,20],[12,40]]);ln(2.4,hexMix(c,'#000000',.4),[[36,20],[36,40]]);return true}
 if(sl==='accessory'){x.save();x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=3;x.strokeStyle=hexMix(A,'#ffffff',.2);x.lineWidth=5;x.beginPath();x.arc(24,29,11,0,7);x.stroke();x.restore();
  x.strokeStyle=dk;x.lineWidth=1.2;x.beginPath();x.arc(24,29,13.4,0,7);x.stroke();
  const g=x.createRadialGradient(22,13,1,24,15,8);g.addColorStop(0,'#fff');g.addColorStop(.35,c);g.addColorStop(1,dk);x.fillStyle=g;x.beginPath();
  if(m==='crystal'||m==='scale'){x.moveTo(24,5);x.lineTo(31,14);x.lineTo(24,22);x.lineTo(17,14)}else if(m==='bone'){x.arc(24,14,7,0,7)}else{x.moveTo(24,6);x.lineTo(30,12);x.lineTo(30,18);x.lineTo(24,23);x.lineTo(18,18);x.lineTo(18,12)}
  x.closePath();x.fill();x.strokeStyle=dk;x.lineWidth=1;x.stroke();return true}
 const draw=(pre)=>{x.save();x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=3;x.shadowOffsetY=1.5;sil();const g=x.createLinearGradient(8,6,40,42);g.addColorStop(0,lt);g.addColorStop(.5,c);g.addColorStop(1,dk);x.fillStyle=g;x.fill();x.restore();
  x.save();sil();x.clip();pre();x.restore();sil();x.strokeStyle=dk;x.lineWidth=1.6;x.stroke()};
 const ln=(w,col,pts)=>{x.strokeStyle=col;x.lineWidth=w;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke()};
 const dot=(px,py,r,col)=>{x.fillStyle=col;x.beginPath();x.arc(px,py,r,0,7);x.fill()};
 const varOver=(key)=>{x.lineJoin='round';
  if(key==='helmet_a'){/* capuz pontudo de caçador: abertura do rosto, dobra e fecho */x.fillStyle=hexMix(c,'#000000',.55);x.beginPath();x.ellipse(23,27,9.5,10.5,0,0,7);x.fill();   x.strokeStyle=hexMix(c,ac,.5);x.lineWidth=2.2;x.beginPath();x.ellipse(23,27,9.5,10.5,0,Math.PI*1.05,Math.PI*1.95);x.stroke();ln(1.4,dk,[[14,14],[19,22]]);ln(1.4,dk,[[31,12],[30,19]]);dot(24,39,2.4,ac);x.strokeStyle=dk;x.lineWidth=.9;x.beginPath();x.arc(24,39,2.4,0,7);x.stroke()}
  else if(key==='helmet_m'){ln(4,ac,[[14,32],[34,32]]);x.fillStyle=ac;x.beginPath();x.moveTo(27,20);x.lineTo(28.6,24);x.lineTo(33,24.4);x.lineTo(29.6,27);x.lineTo(30.8,31.4);x.lineTo(27,29);x.lineTo(23.2,31.4);x.lineTo(24.4,27);x.lineTo(21,24.4);x.lineTo(25.4,24);x.closePath();x.fill();x.strokeStyle=dk;x.lineWidth=.8;x.stroke();dot(32,5,1.8,'#fff')}
  else if(key==='armor_a'){/* casaco de caçador: gola em V, tira em diagonal, cinto com fivela, barra evasê */x.fillStyle=hexMix(c,'#000000',.4);x.beginPath();x.moveTo(17,5);x.lineTo(24,20);x.lineTo(31,5);x.lineTo(28,5);x.lineTo(24,12);x.lineTo(20,5);x.closePath();x.fill();
   ln(3,'#6a4524',[[12,9],[38,34]]);ln(1,dk,[[12,11],[38,36]]);ln(4,'#5a3a1c',[[7,32],[41,32]]);x.fillStyle=ac;x.fillRect(20,29,8,6);x.strokeStyle=dk;x.lineWidth=1;x.strokeRect(20,29,8,6);x.fillStyle=dk;x.fillRect(22.5,31,3,2);
   ln(2.4,hexMix(c,'#000000',.45),[[5,41],[43,41]]);for(const px of[11,19,29,37])ln(1,dk,[[px,35],[px-1,41]])}
  else if(key==='armor_m'){x.fillStyle=hexMix(c,'#000000',.3);x.beginPath();x.moveTo(17,5);x.lineTo(24,16);x.lineTo(31,5);x.lineTo(28,5);x.lineTo(24,10);x.lineTo(20,5);x.closePath();x.fill();ln(2.6,ac,[[8,41],[40,41]]);ln(3,hexMix(c,ac,.4),[[14,26],[34,26]]);x.fillStyle=ac;x.beginPath();x.moveTo(24,28);x.lineTo(26,32);x.lineTo(30,32.4);x.lineTo(27,35);x.lineTo(28,39);x.lineTo(24,37);x.lineTo(20,39);x.lineTo(21,35);x.lineTo(18,32.4);x.lineTo(22,32);x.closePath();x.fill()}};
 const tex=()=>{
  if(m==='leather'){ln(1,dk,[[10,20],[40,20]]);x.setLineDash([2,2]);ln(1,lt,[[9,17],[41,17]]);ln(1,lt,[[9,31],[41,31]]);x.setLineDash([]);ln(2.5,hexMix(c,'#3a2412',.6),[[8,26],[40,26]]);dot(24,26,2,ac)}
  else if(m==='metal'){ln(2,lt,[[8,9],[40,9]]);ln(1.2,dk,[[8,24],[40,24]]);ln(1.2,dk,[[24,9],[24,41]]);for(const[px,py]of[[12,12],[36,12],[12,34],[36,34],[24,24]])dot(px,py,1.5,ac);ln(2.5,ac,[[8,41],[40,41]])}
  else if(m==='cloth'){for(let i=0;i<7;i++){const px=9+i*5;x.strokeStyle=i%2?lt:dk;x.globalAlpha=.45;x.lineWidth=1.6;x.beginPath();x.moveTo(px,6);x.quadraticCurveTo(px+3,24,px-1,43);x.stroke()}x.globalAlpha=1;ln(3,ac,[[6,12],[42,12]]);ln(2,ac,[[6,38],[42,38]])}
  else if(m==='scale'){for(let r=0;r<8;r++)for(let q=0;q<8;q++){const px=5+q*5.6+(r%2?2.8:0),py=6+r*5;x.fillStyle=(r+q)%2?lt:hexMix(c,ac,.25);x.beginPath();x.arc(px,py,3.4,0,Math.PI);x.fill();x.strokeStyle=dk;x.lineWidth=.8;x.stroke()}}
  else if(m==='crystal'){x.globalAlpha=.75;const f=[[[8,8],[24,6],[20,24]],[[24,6],[40,10],[28,26]],[[8,40],[20,24],[30,42]],[[40,10],[42,38],[28,26]],[[20,24],[28,26],[30,42]]];f.forEach((t,i)=>{x.fillStyle=i%2?'#ffffff':hexMix(c,ac,.5);x.beginPath();x.moveTo(...t[0]);x.lineTo(...t[1]);x.lineTo(...t[2]);x.closePath();x.fill()});x.globalAlpha=1;ln(1,'#ffffffaa',[[8,8],[20,24],[30,42]])}
  else if(m==='bone'){for(let i=0;i<5;i++){ln(3.4,'#f3ead2',[[11,12+i*6],[24,15+i*6],[37,12+i*6]]);ln(1,'#00000055',[[11,14+i*6],[24,17+i*6],[37,14+i*6]])}ln(4,'#f3ead2',[[24,6],[24,42]]);dot(24,24,3,ac)}};
 draw(tex);
 if(vsil){varOver(sl+'_'+d.var);return true}
 // enfeites de cada bioma
 const horn=()=>{x.fillStyle='#efe6cf';x.strokeStyle='#5a4a30';x.lineWidth=1;for(const s of[-1,1]){x.beginPath();x.moveTo(24+s*14,13);x.quadraticCurveTo(24+s*24,10,24+s*21,0);x.quadraticCurveTo(24+s*18,8,24+s*10,10);x.closePath();x.fill();x.stroke()}};
 const spikes=(col)=>{x.fillStyle=col;for(const px of[14,19,24,29,34]){x.beginPath();x.moveTo(px-2.4,10);x.lineTo(px,px===24?0:3);x.lineTo(px+2.4,10);x.closePath();x.fill()}};
 const shards=()=>{x.fillStyle='rgba(235,250,255,.95)';x.strokeStyle='#6fb8e0';x.lineWidth=.8;for(const[px,h]of[[14,8],[24,14],[34,8]]){x.beginPath();x.moveTo(px-3,11);x.lineTo(px,11-h);x.lineTo(px+3,11);x.closePath();x.fill();x.stroke()}};
 const hood=()=>{x.fillStyle=dk;x.beginPath();x.moveTo(12,12);x.quadraticCurveTo(24,-4,36,12);x.lineTo(33,16);x.quadraticCurveTo(24,6,15,16);x.closePath();x.fill()};
 const wings=()=>{x.fillStyle=ac;for(const s of[-1,1]){x.beginPath();x.moveTo(24+s*14,18);x.lineTo(24+s*23,6);x.lineTo(24+s*21,13);x.lineTo(24+s*24,16);x.lineTo(24+s*20,20);x.lineTo(24+s*22,24);x.lineTo(24+s*14,26);x.closePath();x.fill()}};
 const ears=()=>{x.fillStyle=c;x.strokeStyle=dk;x.lineWidth=1;for(const s of[-1,1]){x.beginPath();x.moveTo(24+s*8,13);x.lineTo(24+s*12,2);x.lineTo(24+s*15,15);x.closePath();x.fill();x.stroke()}};
 const crest=(col)=>{x.fillStyle=col;x.beginPath();x.moveTo(16,10);x.quadraticCurveTo(24,-2,32,10);x.lineTo(27,12);x.quadraticCurveTo(24,4,21,12);x.closePath();x.fill()};
 const pauld=(col)=>{x.fillStyle=col;x.strokeStyle=dk;x.lineWidth=1;for(const s of[-1,1]){x.beginPath();x.ellipse(24+s*19,13,6,4.5,s*.5,0,7);x.fill();x.stroke()}};
 const gem=(px,py,col)=>{x.fillStyle=col;x.strokeStyle='#fff';x.lineWidth=.8;x.beginPath();x.moveTo(px,py-3.5);x.lineTo(px+3,py);x.lineTo(px,py+3.5);x.lineTo(px-3,py);x.closePath();x.fill();x.stroke()};
 if(sl==='helmet'){
  if(['orc','behemoth','vazio','obsidiana','escama','wyvern'].includes(k))horn();
  else if(['brasa','tempestade','hidra','ancestral','carapaca'].includes(k))spikes(ac);
  else if(m==='crystal'||['polar','glacial'].includes(k))shards();
  else if(['mortalha','sudario','teia','lich'].includes(k))hood();
  else if(k==='serafim')wings();else if(k==='goblin'||k==='lobo')ears();else if(k==='pedra'||k==='dunas')crest(ac);
  gem(24,22,ac)}
 else if(sl==='armor'){if(m==='metal'||m==='scale'||m==='bone'||m==='crystal')pauld(m==='crystal'?'rgba(235,250,255,.9)':hexMix(c,'#ffffff',.2));gem(24,18,ac)}
 else if(sl==='shield'){gem(24,24,ac);x.strokeStyle=ac;x.lineWidth=2;x.beginPath();x.arc(24,24,8,0,7);x.stroke()}
 else if(sl==='boots'){x.save();x.translate(24,0);x.scale(-1,1);x.translate(-24,0);x.translate(-0,0);x.restore();
  // segunda bota espelhada
  x.save();x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=3;P([[44,9],[32,9],[32,27],[26,32],[26,41],[44,41]]);const g=x.createLinearGradient(26,6,44,42);g.addColorStop(0,lt);g.addColorStop(.5,c);g.addColorStop(1,dk);x.fillStyle=g;x.fill();x.restore();x.strokeStyle=dk;x.lineWidth=1.6;P([[44,9],[32,9],[32,27],[26,32],[26,41],[44,41]]);x.stroke();ln(3,ac,[[4,13],[16,13]]);ln(3,ac,[[32,13],[44,13]])}
 if(d.var&&(sl==='legs'||sl==='boots')){ // marca de classe: arqueiro = tiras e cinto; mago = runa e barra enfeitada
  x.lineJoin='round';
  if(d.var==='a'){if(sl==='legs'){ln(3,ac,[[10,12],[38,12]]);ln(1.6,dk,[[17,14],[15,38]]);ln(1.6,dk,[[31,14],[33,38]]);x.fillStyle=ac;x.fillRect(19,13,10,7);x.strokeStyle=dk;x.lineWidth=1;x.strokeRect(19,13,10,7)}else{for(const py of[14,19,24])ln(2,ac,[[6,py],[15,py+1]]);ln(2,ac,[[28,14],[43,15]]);ln(2,ac,[[28,19],[43,20]])}}
  else{if(sl==='legs'){ln(3,ac,[[11,38],[22,38]]);ln(3,ac,[[26,38],[37,38]]);x.fillStyle=ac;x.beginPath();x.moveTo(24,15);x.lineTo(26,20);x.lineTo(31,20.4);x.lineTo(27,23.6);x.lineTo(28.4,29);x.lineTo(24,26);x.lineTo(19.6,29);x.lineTo(21,23.6);x.lineTo(17,20.4);x.lineTo(22,20);x.closePath();x.fill()}else{ln(3,ac,[[4,40],[16,40]]);ln(3,ac,[[28,40],[44,40]]);dot(10,16,2.4,ac);dot(38,16,2.4,ac)}}}
 return true}
function drawIcon(x,d,nobg,force){const R=RAR[d.rarity],col=(d.icon&&d.icon.c)||'#b9c0c8',k=(d.icon&&d.icon.k)||'material',id=d.id,on=force?(d.rarity!=='common'&&!!RBG[d.rarity]):rarOn(d);
 if(nobg){}else if(on){const[c1,c2]=RBG[d.rarity],g=x.createRadialGradient(24,26,2,24,24,34);g.addColorStop(0,c1);g.addColorStop(1,c2);x.fillStyle=g;x.fillRect(0,0,48,48);
  x.strokeStyle=R.c;x.lineWidth=3;x.strokeRect(1.5,1.5,45,45);x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=1;x.strokeRect(4.5,4.5,39,39)}
 else{const bg=x.createLinearGradient(0,0,0,48);bg.addColorStop(0,'#2c3446');bg.addColorStop(1,'#171c28');x.fillStyle=bg;x.fillRect(0,0,48,48);x.strokeStyle='#3a4358';x.lineWidth=2;x.strokeRect(1,1,46,46)}
 x.lineJoin='round';x.lineCap='round';
 if((d.set||d.slot==='necklace')&&setIcon(x,d))return;
 const line=(w,c,pts)=>{x.strokeStyle=c;x.lineWidth=w;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke()};
 const dot=(px,py,r,c)=>{x.fillStyle=c;x.beginPath();x.arc(px,py,r,0,7);x.fill()};
 const poly=(c,pts)=>{x.fillStyle=c;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.fill()};
 const rect=(c,a,b,w,h)=>{x.fillStyle=c;x.fillRect(a,b,w,h)};
 // sombra suave sob o objeto, para dar volume
 const sh=()=>{x.shadowColor='rgba(0,0,0,.55)';x.shadowBlur=3;x.shadowOffsetY=1.5};
 const blade=o=>{x.save();x.translate(24,27);x.rotate(Math.PI/4);sh();
  x.fillStyle=o.blade;x.beginPath();x.moveTo(-o.w/2,6);x.lineTo(-o.w/2,-o.len);x.lineTo(0,-o.len-6);x.lineTo(o.w/2,-o.len);x.lineTo(o.w/2,6);x.closePath();x.fill();x.shadowColor='transparent';
  if(o.fuller)rect('rgba(0,0,0,.3)',-1,-o.len+3,2,o.len);
  rect('rgba(255,255,255,.55)',-o.w/2,-o.len,1.5,o.len+6);if(o.edge)rect(o.edge,o.w/2-1.6,-o.len,1.6,o.len+6);
  if(o.crown){poly(o.guard,[[-9,7],[-9,0],[-5,4],[0,-2],[5,4],[9,0],[9,7]])}else rect(o.guard,-o.gw/2,5.5,o.gw,3.4);
  if(o.gem)dot(0,7,2.2,o.gem);rect('#6b4423',-1.8,9,3.6,8);rect('rgba(0,0,0,.25)',-1.8,11,3.6,1);dot(0,19.5,2.8,o.pommel);x.restore()};
 const bow=(r,th,c,tips)=>{x.save();sh();x.strokeStyle=c;x.lineWidth=th;x.beginPath();x.arc(12+(22-r)*.2,24,r,-1.15,1.15);x.stroke();x.restore();
  const a=-1.15,bx=12+(22-r)*.2;const p1=[bx+Math.cos(a)*r,24+Math.sin(a)*r],p2=[bx+Math.cos(-a)*r,24+Math.sin(-a)*r];line(1.2,'#f3f3f3',[p1,[bx+r*.52,24],p2]);
  if(tips){dot(p1[0],p1[1],2,tips);dot(p2[0],p2[1],2,tips)}};
 const shaft=c=>{x.save();sh();line(4,c,[[11,39],[31,15]]);x.restore()};
 // glifo do motivo de cada conjunto (armas de conjunto)
 const mot=(mo,px,py,c1,c2,sc)=>{sc=sc||1;const tri=(c,a,b2,cc)=>poly(c,[[px+a[0]*sc,py+a[1]*sc],[px+b2[0]*sc,py+b2[1]*sc],[px+cc[0]*sc,py+cc[1]*sc]]);
  switch(mo){
  case'wood':dot(px-3*sc,py-2*sc,2*sc,'#5f8f3a');dot(px+3*sc,py-3*sc,2*sc,'#7aa84a');break;
  case'jag':for(let i=-1;i<=1;i++)tri(c2,[px*0+i*3-1,0],[i*3+1,0],[i*3,-5]);break;
  case'cleaver':tri(c2,[-5,2],[-1,0],[-6,-5]);tri(c2,[5,2],[1,0],[6,-5]);break;
  case'ghost':dot(px,py-2*sc,3*sc,'rgba(220,235,255,.6)');dot(px+3*sc,py+1*sc,2*sc,'rgba(220,235,255,.45)');break;
  case'web':x.strokeStyle=c2;x.lineWidth=1;x.beginPath();x.arc(px,py,5*sc,0,7);x.stroke();x.beginPath();x.arc(px,py,2.5*sc,0,7);x.stroke();line(1,c2,[[px-5*sc,py],[px+5*sc,py]]);line(1,c2,[[px,py-5*sc],[px,py+5*sc]]);break;
  case'shell':dot(px,py,4*sc,c2);dot(px,py-3*sc,3*sc,c1);break;
  case'stone':poly('#8a8f98',[[px-4*sc,py+2*sc],[px-2*sc,py-3*sc],[px+3*sc,py-2*sc],[px+4*sc,py+3*sc]]);break;
  case'ice':for(let i=-1;i<=1;i++)tri('#e6f6ff',[i*3-1,0],[i*3+1,0],[i*3,-6]);break;
  case'fang':tri('#f3ecd8',[-5,2],[-2,0],[-6,-6]);tri('#f3ecd8',[5,2],[2,0],[6,-6]);break;
  case'glass':tri('#14101a',[-4,1],[4,1],[0,-7]);dot(px,py,1.8*sc,c2);break;
  case'flame':tri('#ff7a2a',[-3,1],[3,1],[0,-7]);tri('#ffd070',[-1.5,1],[1.5,1],[0,-4]);break;
  case'wing':line(2.2,'#fff3b0',[[px,py],[px-8*sc,py-5*sc]]);line(2.2,'#fff3b0',[[px,py],[px+8*sc,py-5*sc]]);line(1.6,'#fff',[[px,py],[px-7*sc,py+1*sc]]);line(1.6,'#fff',[[px,py],[px+7*sc,py+1*sc]]);break;
  case'skull':dot(px,py,4.5*sc,'#e8e2cc');dot(px-1.8*sc,py,1.1*sc,c2);dot(px+1.8*sc,py,1.1*sc,c2);break;
  case'crystal':poly(hexMix(c1,'#ffffff',.5),[[px,py-6*sc],[px+3*sc,py],[px,py+4*sc],[px-3*sc,py]]);break;
  case'bolt':line(2,'#9fe8ff',[[px-2*sc,py-6*sc],[px+1*sc,py-2*sc],[px-1*sc,py],[px+2*sc,py+5*sc]]);break;
  case'void':x.strokeStyle=c2;x.lineWidth=1.4;x.beginPath();x.arc(px,py,5*sc,0,7);x.stroke();dot(px,py,2.2*sc,c1);break;
  case'bone':line(2,'#e8e0c8',[[px-4*sc,py-2*sc],[px+4*sc,py-2*sc]]);line(2,'#e8e0c8',[[px-4*sc,py+1*sc],[px+4*sc,py+1*sc]]);dot(px,py-1*sc,1.6*sc,'#e8e0c8');break;
  case'rune':x.strokeStyle='#ffd24a';x.lineWidth=1.5;x.beginPath();x.arc(px,py,5*sc,0,7);x.stroke();line(1.5,'#ffd24a',[[px-2*sc,py-2*sc],[px+2*sc,py+2*sc]]);line(1.5,'#ffd24a',[[px+2*sc,py-2*sc],[px-2*sc,py+2*sc]]);break;
  case'halo':x.strokeStyle=c2;x.lineWidth=2;x.beginPath();x.ellipse(px,py,6*sc,2.5*sc,-.3,0,7);x.stroke();break;
  case'heart':dot(px-2*sc,py-1*sc,2.6*sc,'#ff4d6d');dot(px+2*sc,py-1*sc,2.6*sc,'#ff4d6d');poly('#ff4d6d',[[px-4.4*sc,py],[px+4.4*sc,py],[px,py+5*sc]]);break}};
 const wvt=d.wv?wvTone(d.wv):null,wc=d.wv?d.wv.c:'#999',wa=d.wv?d.wv.a:'#fff',wl=d.wv?d.wv.lv:1;
 switch(k){
 case'sword':
  if(d.wv){blade({blade:wvt.bl,len:Math.min(23,15+wl/22),w:6+(d.wv.i%3)+(d.wv.mo==='cleaver'?2:0),fuller:d.wv.i%2,guard:wa,gw:12+(d.wv.i%3)*2,crown:d.wv.mo==='halo'||d.wv.mo==='rune'?1:0,gem:wa,pommel:wa,edge:wa});
   mot(d.wv.mo,19,32,wc,wa,.9);mot(d.wv.mo,33,15,wc,wa,.55)}
  else if(id==='weapon_wood_dagger')blade({blade:'#c9a06a',len:11,w:5,guard:'#6b4423',gw:9,pommel:'#6b4423'});
  else if(id==='weapon_steel_sword')blade({blade:'#e6edf5',len:20,w:7,fuller:1,guard:'#9aa6b4',gw:15,pommel:'#9aa6b4',edge:'#b8c4d2'});
  else if(id==='weapon_ruby_blade')blade({blade:'#e8586a',len:20,w:8,fuller:1,guard:'#d9a62e',gw:15,gem:'#ff2d55',pommel:'#d9a62e',edge:'#a5182c'});
  else if(id==='weapon_obsidian_blade'){blade({blade:'#1c1626',len:21,w:8,fuller:1,guard:'#3a2a4a',gw:15,gem:'#ff5a1a',pommel:'#ff5a1a',edge:'#ff7a2a'});line(1.6,'#ff6a20',[[26,25],[37,14]]);dot(37,14,1.6,'#ffb070');dot(19,32,2,'#ff5a1a')}
  else if(id==='weapon_seraph_sword'){blade({blade:'#fffaf0',len:23,w:8,fuller:1,guard:'#ffd24a',crown:1,gem:'#fff6c0',pommel:'#ffd24a',edge:'#ffd24a'});
   for(const[a,b2]of[[[19,32],[8,22]],[[19,32],[10,40]],[[19,32],[6,30]],[[19,32],[14,43]]])line(2.4,'#fff3b0',[a,b2]);line(1,'#ffffff',[[19,32],[9,25]]);dot(19,32,2.4,'#fff')}
  else if(id==='weapon_ancient_king')blade({blade:'#ffe9a0',len:23,w:9,fuller:1,guard:'#e8b830',crown:1,gem:'#7fe0ff',pommel:'#e8b830',edge:'#c99a1c'});
  else blade({blade:col,len:17,w:6,guard:'#d9a62e',gw:13,pommel:'#7a5230'});break;
 case'eclipse':{const gl=x.createRadialGradient(24,24,2,24,24,24);gl.addColorStop(0,'rgba(255,214,120,.55)');gl.addColorStop(1,'rgba(120,60,200,0)');x.fillStyle=gl;x.fillRect(0,0,48,48);
  line(8,'#ffd27a',[[11,37],[35,11]]);line(6,'#6a2fd0',[[11,37],[35,11]]);line(2,'#d9b8ff',[[13,35],[35,13]]);line(4,'#2a1836',[[9,39],[16,32]]);line(5,'#e8b84a',[[14,27],[23,37]]);dot(36,10,3,'#fff0b0');break}
 case'bow':
  if(id==='weapon_short_bow')bow(15,3.5,'#a06a34');
  else if(id==='weapon_long_bow')bow(23,3,'#8a5a2b');
  else if(id==='weapon_composite_bow'){bow(19,4,'#c8d2dc','#6b4423');x.strokeStyle='#5b6b7b';x.lineWidth=1.5;x.beginPath();x.arc(14,24,19,-.9,.9);x.stroke()}
  else if(id==='weapon_elven_bow'){bow(21,3.5,'#59e0d0','#bff7ee');x.strokeStyle='#2a8f84';x.lineWidth=1;x.beginPath();x.arc(15,24,19,-.9,.9);x.stroke();dot(13,24,2,'#bff7ee')}
  else if(id==='weapon_storm_bow'){bow(22,4.5,'#e8b830','#7fe0ff');dot(13,24,3,'#7fe0ff');line(1.5,'#bff4ff',[[8,20],[12,24],[9,28]])}
  else if(id==='weapon_void_bow'){dot(14,24,8,'rgba(160,90,255,.28)');bow(21,4.5,'#2a1650','#c79bff');x.strokeStyle='#7a2fd0';x.lineWidth=1.2;x.beginPath();x.arc(15,24,19,-.9,.9);x.stroke();dot(14,24,3.2,'#c79bff');dot(13,23,1.2,'#fff')}
  else if(id==='weapon_seraph_bow'){bow(23,4.5,'#ffe9a0','#ffffff');for(const sg of[-1,1])for(let i=0;i<3;i++)line(2.2,i%2?'#fff':'#fff3b0',[[12,24],[5+i*1.5,24+sg*(8+i*4)]]);dot(13,24,3,'#fff')}
  else if(d.wv){const r=Math.min(24,16+wl/40);bow(r,3.5+(d.wv.i%2),wvt.sh==='#6b4423'?'#8a5a2b':wvt.sh,wa);mot(d.wv.mo,13,24,wc,wa,.9);if(d.wv.m==='metal'||d.wv.m==='scale'){x.strokeStyle=wa;x.lineWidth=1.2;x.beginPath();x.arc(14,24,r-2,-.9,.9);x.stroke()}}
  else bow(20,4,'#8a5a2b');
  line(2,'#d9d0b0',[[14,24],[40,24]]);poly('#cfd6dd',[[41,24],[35,21],[35,27]]);break;
 case'wand':shaft(d.wv?wvt.sh:id==='weapon_lich_staff'?'#d8d0b8':id==='weapon_seraph_staff'?'#ffd24a':id==='weapon_celestial_wand'?'#e8b830':id==='weapon_arcane_wand'?'#59e0d0':id==='weapon_crystal_wand'?'#c8d2dc':'#7a5230');
  if(d.wv){dot(33,13,5,wa);dot(33,13,8,'rgba(255,255,255,.18)');dot(31.5,11.5,1.6,'#fff');mot(d.wv.mo,33,13,wc,wa,.8)}
  else if(id==='weapon_twig_wand'){line(2,'#7a5230',[[24,26],[30,32]]);dot(33,13,4.5,'#7ddc6a');dot(32,11.5,1.6,'#fff')}
  else if(id==='weapon_lich_staff'){dot(33,14,6,'#e8e2cc');rect('#d8d0b8',30,18,6,3);dot(31,13,1.5,'#25c850');dot(35,13,1.5,'#25c850');poly('#7dff9a',[[30,8],[33,0],[36,8]]);poly('rgba(37,200,80,.6)',[[28,9],[27,3],[31,7]]);poly('rgba(37,200,80,.6)',[[38,9],[39,3],[35,7]])}
  else if(id==='weapon_seraph_staff'){x.strokeStyle='#ffe9a0';x.lineWidth=2.2;x.beginPath();x.ellipse(33,11,10,3.5,-.35,0,7);x.stroke();dot(33,13,5,'#fff');dot(33,13,9,'rgba(255,240,160,.25)');for(const sx of[-1,1])line(2,'#fff3b0',[[31+sx*2,17],[31+sx*10,24]])}
  else if(id==='weapon_oak_wand'){dot(33,13,5,'#4fb36a');dot(29,17,3,'#6fd36f');dot(37,17,3,'#6fd36f');dot(32,11,1.8,'#d6ffd0')}
  else if(id==='weapon_crystal_wand'){poly('#9fe3ff',[[33,5],[39,13],[33,22],[27,13]]);poly('#e8fbff',[[33,5],[36,13],[33,22]]);}
  else if(id==='weapon_arcane_wand'){dot(33,13,5,'#b27bff');x.strokeStyle='#59e0d0';x.lineWidth=1.8;x.beginPath();x.ellipse(33,13,10,4,-.6,0,7);x.stroke();dot(32,11.5,1.8,'#fff')}
  else if(id==='weapon_celestial_wand'){x.strokeStyle='#ffd24a';x.lineWidth=3;x.beginPath();x.arc(33,13,8,.6,5.7);x.stroke();dot(33,13,4.5,'#fff3b0');dot(33,13,8,'rgba(255,240,160,.25)')}
  else{dot(33,13,6,'#7aa8ff');dot(31,11,2,'#fff')}break;
 case'helmet':sh();
  if(id==='helm_leather_cap'){poly(col,[[9,31],[9,23],[15,13],[33,13],[39,23],[39,31]]);rect('#5a3b22',8,28,32,4);line(2,'#0004',[[24,13],[24,28]]);dot(24,13,2,'#d9a62e')}
  else if(id==='helm_iron'){poly(col,[[9,32],[9,22],[16,11],[32,11],[39,22],[39,32],[31,32],[31,25],[17,25],[17,32]]);rect('#7e8a96',22,20,4,12);dot(14,20,1.3,'#444');dot(34,20,1.3,'#444')}
  else if(id==='helm_steel'){poly(col,[[9,32],[9,22],[16,12],[32,12],[39,22],[39,32],[31,32],[31,26],[17,26],[17,32]]);poly('#d0343c',[[22,12],[26,12],[32,3],[25,6],[16,4]]);line(2,'#0005',[[17,26],[31,26]])}
  else{poly(col,[[10,33],[10,22],[17,12],[31,12],[38,22],[38,33],[31,33],[31,26],[17,26],[17,33]]);poly('#bff7ee',[[10,22],[1,12],[6,24],[1,26],[10,30]]);poly('#bff7ee',[[38,22],[47,12],[42,24],[47,26],[38,30]]);dot(24,18,2.5,'#ffd24a')}
  break;
 case'armor':sh();
  if(id==='armor_tunic'||id==='armor_leather_shirt'){poly(col,[[15,10],[33,10],[41,17],[36,23],[34,22],[34,40],[14,40],[14,22],[12,23],[7,17]]);rect('#0003',20,10,8,3);if(id==='armor_leather_shirt'){line(1.5,'#3b2616',[[24,13],[24,38]]);for(let yy=16;yy<38;yy+=5)line(1.2,'#3b2616',[[21,yy],[27,yy+2]]);rect('#5a3b22',14,30,20,2.5)}}
  else if(id==='armor_leather'){poly(col,[[14,10],[34,10],[41,18],[35,24],[35,40],[13,40],[13,24],[7,18]]);rect('#5a3b22',13,28,22,3);line(2,'#3b2616',[[24,10],[24,40]]);dot(24,29.5,2,'#d9a62e');line(1.5,'#3b2616',[[16,14],[20,22]]);line(1.5,'#3b2616',[[32,14],[28,22]])}
  else if(id==='armor_chain'){poly(col,[[14,10],[34,10],[41,18],[35,24],[35,40],[13,40],[13,24],[7,18]]);x.strokeStyle='rgba(0,0,0,.35)';x.lineWidth=1;for(let yy=14;yy<40;yy+=4)for(let xx=14+(yy%8?0:2);xx<36;xx+=4){x.beginPath();x.arc(xx,yy,1.6,0,7);x.stroke()}}
  else if(id==='armor_plate'){poly(col,[[15,10],[33,10],[36,14],[35,40],[13,40],[12,14]]);dot(9,15,6,'#e6ecf2');dot(39,15,6,'#e6ecf2');line(2,'#0005',[[24,11],[24,40]]);line(2,'#0004',[[14,26],[34,26]]);rect('#d9a62e',21,10,6,3)}
  else{poly('#59e0d0',[[15,10],[33,10],[36,14],[35,40],[13,40],[12,14]]);dot(9,15,6.5,'#9ff5ea');dot(39,15,6.5,'#9ff5ea');line(2,'#0b4d46',[[24,11],[24,40]]);poly('#ffd24a',[[24,16],[28,22],[24,30],[20,22]]);dot(24,22,2,'#fff')}break;
 case'legs':sh();poly(col,[[13,9],[35,9],[35,16],[29,40],[24,40],[24,22],[22,40],[17,40],[13,16]]);rect('#5a3b22',13,9,22,4);
  if(/plate/.test(id)){dot(18,22,3,'#e6ecf2');dot(30,22,3,'#e6ecf2')}else if(/chain/.test(id)){x.strokeStyle='rgba(0,0,0,.3)';for(let yy=16;yy<38;yy+=4){x.beginPath();x.arc(18,yy,1.5,0,7);x.stroke();x.beginPath();x.arc(30,yy,1.5,0,7);x.stroke()}}break;
 case'boots':sh();poly(col,[[15,10],[26,10],[26,28],[40,34],[40,40],[13,40],[13,30]]);rect('rgba(0,0,0,.3)',13,37,27,3);
  if(id==='boots_plate'){poly('#e6ecf2',[[15,14],[26,14],[26,20],[15,20]]);poly('#e6ecf2',[[13,30],[26,28],[26,34],[13,36]]);dot(12,13,3,'#bff7ee')}else if(id==='boots_iron'){rect('#7e8a96',14,16,12,3);rect('#7e8a96',14,23,12,3)}else{rect('#5a3b22',15,12,11,3);line(1.5,'#d9a62e',[[17,20],[24,20]])}break;
 case'shield':sh();
  if(id==='shield_wood'){dot(24,25,15,col);x.shadowColor='transparent';x.strokeStyle='#5a3b22';x.lineWidth=2;x.beginPath();x.arc(24,25,15,0,7);x.stroke();line(1.5,'#5a3b22',[[24,10],[24,40]]);line(1.5,'#5a3b22',[[15,16],[15,34]]);line(1.5,'#5a3b22',[[33,16],[33,34]]);dot(24,25,4.5,'#aab4be');dot(24,25,1.8,'#555')}
  else if(id==='shield_iron'){poly(col,[[24,5],[38,13],[36,30],[24,44],[12,30],[10,13]]);x.shadowColor='transparent';line(3,'#d9a62e',[[24,8],[24,41]]);line(3,'#d9a62e',[[12,20],[36,20]]);dot(24,20,3,'#c0392b')}
  else{poly(col,[[10,7],[38,7],[38,32],[24,45],[10,32]]);x.shadowColor='transparent';x.strokeStyle='#5b6b7b';x.lineWidth=2;x.strokeRect(13,10,22,19);for(const[px,py]of[[15,12],[33,12],[15,27],[33,27]])dot(px,py,1.4,'#e6ecf2');poly('#3e86c8',[[24,13],[30,22],[24,30],[18,22]]);dot(24,22,2.4,'#ffd24a')}break;
 case'accessory':sh();
  if(/ring/.test(id)){x.strokeStyle=col;x.lineWidth=5;x.beginPath();x.arc(24,29,9,0,7);x.stroke();const gc=id==='ring_fire'?'#ff6a2a':'#7ddc6a';poly('#fff6',[[24,11],[29,16],[24,21],[19,16]]);poly(gc,[[24,10],[30,16],[24,22],[18,16]]);dot(22,14,1.5,'#fff')}
  else{line(2,'#c9ced6',[[12,6],[24,26],[36,6]]);const gc=id==='amulet_twilight'?'#a266f0':'#5aa9ff';dot(24,31,9,col);dot(24,31,6,gc);dot(21.5,28.5,2,'#fff9')}break;
 case'potion_hp':case'potion_mp':{const c2=k==='potion_hp'?'#e0434d':'#3f8fe8';sh();rect('#8a6f45',20,6,8,4);rect('#cfd8e0',21,10,6,7);
  if(/big/.test(id)){poly('#cfd8e0',[[18,17],[30,17],[38,34],[34,41],[14,41],[10,34]]);poly(c2,[[14,28],[34,28],[38,34],[34,41],[14,41],[10,34]])}
  else{x.fillStyle='#cfd8e0';x.beginPath();x.arc(24,29,12.5,0,7);x.fill();x.fillStyle=c2;x.beginPath();x.arc(24,30,10,0,7);x.fill()}
  if(/_med/.test(id)){x.strokeStyle='#eef3f8';x.lineWidth=2.6;x.beginPath();x.ellipse(24,15.5,6,2.4,0,0,7);x.stroke()}else if(/_big|mega/.test(id)){x.strokeStyle='#ffd24a';x.lineWidth=2.8;x.beginPath();x.ellipse(24,15.5,6.5,2.6,0,0,7);x.stroke()}
  x.shadowColor='transparent';dot(19,27,2.5,'#fff8');if(/antidote/.test(id)){x.fillStyle='#4fb36a';x.beginPath();x.arc(24,30,10,0,7);x.fill();dot(19,27,2.5,'#fff8')}break}
 case'scroll':sh();poly('#e8dcb8',[[12,12],[36,12],[36,36],[12,36]]);rect('#c9b98a',10,10,4,28);rect('#c9b98a',34,10,4,28);line(2,'#a88',[[16,18],[32,18]]);line(2,'#a88',[[16,24],[32,24]]);line(2,'#a88',[[16,30],[28,30]]);dot(36,36,5,'#b33');break;
 case'material':sh();
  if(id==='mat_rat_tail'){x.strokeStyle='#e8a6a6';x.lineWidth=3.5;x.beginPath();x.moveTo(10,36);x.bezierCurveTo(20,40,18,22,30,26);x.bezierCurveTo(38,28,38,14,40,10);x.stroke()}
  else if(id==='mat_snake_fang'){poly('#f6f2e4',[[18,10],[30,10],[27,38],[21,38]]);poly('#cfc9b3',[[27,10],[30,10],[27,38]])}
  else if(id==='mat_goblin_ear'){poly('#6fbf4a',[[10,30],[22,12],[38,10],[30,22],[26,36]]);poly('#4a8f30',[[18,28],[24,18],[32,16],[26,28]])}
  else if(id==='arrow'){line(3,'#c9a56b',[[10,38],[36,12]]);poly('#dfe6ee',[[40,8],[30,10],[38,18]]);poly('#e04a4a',[[8,36],[14,30],[10,42]]);poly('#e04a4a',[[12,40],[18,34],[14,44]])}
  else if(id==='mat_bone_shard'){line(6,'#efe8d4',[[12,36],[34,14]]);dot(10,34,4,'#efe8d4');dot(14,38,4,'#efe8d4');dot(34,12,4,'#efe8d4');dot(38,16,4,'#efe8d4')}
  else if(id==='mat_orc_tusk'){x.strokeStyle='#efe3c0';x.lineWidth=7;x.beginPath();x.arc(36,34,22,Math.PI,Math.PI*1.45);x.stroke()}
  else if(id==='mat_ectoplasm'){x.fillStyle='rgba(120,220,255,.85)';x.beginPath();x.moveTo(24,8);x.bezierCurveTo(40,22,38,38,24,40);x.bezierCurveTo(10,38,8,22,24,8);x.fill();dot(20,28,3,'#fff9')}
  else if(id==='mat_dragon_scale'){poly('#d0462a',[[24,8],[38,16],[38,32],[24,40],[10,32],[10,16]]);poly('#f58a52',[[24,13],[33,18],[33,30],[24,35],[15,30],[15,18]]);line(1.5,'#7a1f10',[[24,13],[24,35]])}
  else if(id==='mat_twilight_fragment'){poly('#7a3fd0',[[24,6],[36,24],[26,42],[14,26]]);poly('#d9b8ff',[[24,6],[30,26],[26,42]]);dot(22,22,2,'#fff')}
  else{poly(R.c,[[24,9],[36,22],[30,39],[18,39],[12,22]]);poly('#fff4',[[24,9],[30,22],[24,39],[18,22]])}break;
 default:poly(R.c,[[24,9],[36,22],[30,39],[18,39],[12,22]]);poly('#fff4',[[24,9],[30,22],[24,39],[18,22]])}
 }
function iconURL(x){const id=eid(x),t=etier(x),key=t?id+'#'+t:id;if(ICONS[key])return ICONS[key];const d=IT[id],c=document.createElement('canvas');c.width=c.height=48;if(t)drawIcon(c.getContext('2d'),Object.assign({},d,{rarity:Cx.TIERS[t].k}),false,true);else drawIcon(c.getContext('2d'),d);return ICONS[key]=c.toDataURL()}
window.CLI={esc,iconURL,BON_N,EL_N,ATTR_N,ATTR_D,fmtBon,RAR};})();
