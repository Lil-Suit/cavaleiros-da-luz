/* Reino de Arvelos — NÚCLEO DE REGRAS (autoritativo, sem dependência de renderização).
   Roda no navegador (inline no jogo) e no Node (testes). Toda validação de itens, dinheiro,
   drops, equipamentos, missões e persistência passa por aqui. O cliente apenas pede ações. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.Core=factory()})(typeof self!=='undefined'?self:this,function(){
'use strict';
const CFG={
 version:2,invSlots:28,goldCap:2000000000,
 groundMax:80,groundTtlMs:120000,ownerMs:60000,dropOwnMs:10000,pickupRange:2.4,
 attrPointsPerLevel:3,baseAttr:5,
 critMult:1.75,critCap:.6,dodgeCap:.3,atkSpeedCap:2,moveCap:.4,resCap:75,minAtkMs:300,
 luckMaxRel:.25,dropChanceCapRel:2,
 xpBase:25,xpGrow:1.2,skillBase:6,skillGrow:1.12,skillGain:.85,
 mitigationK_monster:2.2,mitigationK_player:2,
 deathGoldLoss:.1,eligibleMinDmgPct:.05,bossEligibleMinDmgPct:.1,
 txLogMax:100,chatMax:160
};
const RARITY={common:{n:'Básico',c:'#c9ced6',o:0},uncommon:{n:'Comum',c:'#6fd36f',o:1},rare:{n:'Raro',c:'#5aa9ff',o:2},epic:{n:'Épico',c:'#b46bff',o:3},ultra:{n:'Ultra rara',c:'#ffd23f',o:4},legendary:{n:'Lendário',c:'#ffffff',o:5}};
// Fundos coloridos: só equipamentos de nível 100+ têm fundo (sorteado ao cair, de 'sem fundo' a branco). Itens de nível 99 para baixo nunca têm fundo.
// Todo o resto fica sem fundo (aparência de "comum"). A raridade em si continua nos dados do item.
const RARITY_BG_MIN_MOB_LEVEL=100;
function rarityShown(id){return needsTier(ITEMS[id])}
/* ===== FUNDOS (níveis de qualidade) — todo equipamento de nível 100+ vem com um fundo, sorteado ao cair =====
   Básico (fácil/fraco) → Comum → Raro → Épico → Ultra raro → Lendário (raríssimo/forte). Cada fundo aumenta os atributos do item. */
const TIERS=[null,{k:'common',n:'Básico',mul:1,w:45},{k:'uncommon',n:'Comum',mul:1.08,w:28},{k:'rare',n:'Raro',mul:1.18,w:15},{k:'epic',n:'Épico',mul:1.3,w:7},{k:'ultra',n:'Ultra raro',mul:1.46,w:4},{k:'legendary',n:'Lendário',mul:1.7,w:1}];
const TIER_MIN_REQ=100;
const needsTier=d=>!!d&&(d.type==='weapon'||d.type==='armor')&&((d.reqLevel||0)>=TIER_MIN_REQ||!!d.tiered);
const LEGACY_TIER={common:1,uncommon:2,rare:3,epic:4,ultra:5,legendary:6};
function tierOf(e){const d=e&&ITEMS[e.id];if(!needsTier(d))return 0;const t=e.t|0,mn=d.tierMin||1;return Math.max(mn,t>=1&&t<=6?t:(LEGACY_TIER[d.rarity]||1))}
const tierMul=e=>{const t=tierOf(e);return t?TIERS[t].mul:1};
const effRarity=e=>{const t=tierOf(e);return t?TIERS[t].k:(ITEMS[e.id]||{}).rarity};
function rollTier(rng,boost,min){rng=rng||Math.random;min=min||1;const w=TIERS.slice(1).map((q,i)=>i+1<min?0:q.w*(boost&&i>=3?boost:1)),tot=w.reduce((a,b)=>a+b,0);let r=rng()*tot;for(let i=0;i<6;i++){r-=w[i];if(r<0)return i+1}return min}
const SLOTS=['weaponMelee','weaponDist','weaponMagic','helmet','armor','legs','boots','shield','accessory','necklace','backpack'];
const SLOT_NAME={weaponMelee:'Arma corpo a corpo',weaponDist:'Arco',weaponMagic:'Cajado',helmet:'Capacete',armor:'Armadura',legs:'Calças',boots:'Botas',shield:'Escudo',accessory:'Acessório',necklace:'Cordão',backpack:'Mochila'};
const STYLES=['melee','dist','magic'];
const STYLE_ATTR={melee:'str',dist:'agi',magic:'int'};
const cap=s=>s[0].toUpperCase()+s.slice(1);

/* ============ ITENS ============ */
const ITEMS={};
const add=o=>{ITEMS[o.id]=Object.assign({bonuses:{},res:{},reqAttr:{},stack:1,sell:0,desc:'',def:0},o)};
const MET={wood:'#8a5a2b',iron:'#aab4be',steel:'#d5dce4',ruby:'#d63b4a',gold:'#ffd24a',mithril:'#59e0d0',leather:'#8a5a2b',cloth:'#7d8bd1',plate:'#cfd6dd'};
const W=(style,rows)=>rows.forEach(r=>add({id:r[0],name:r[1],type:'weapon',slot:'weapon'+cap(style),style,rarity:r[2],reqLevel:r[3],dmg:{min:r[4],max:r[5]},atkMs:r[6],sell:r[7],icon:{k:style==='melee'?'sword':style==='dist'?'bow':'wand',c:MET[r[8]]},desc:r[9]||''}));
W('melee',[
 ['weapon_wood_dagger','Adaga de Madeira','common',1,4,7,750,5,'wood','Leve e rápida. Boa para quem está começando.'],
 ['weapon_iron_sword','Espada de Ferro','common',5,10,15,800,75,'iron'],
 ['weapon_steel_sword','Espada de Aço','uncommon',14,22,34,850,450,'steel'],
 ['weapon_ruby_blade','Lâmina Rubi','rare',30,46,66,1000,2250,'ruby'],
 ['weapon_ancient_king','Espada do Rei Antigo','legendary',45,82,110,1000,11000,'gold','Pertenceu a um rei que ninguém lembra.']]);
W('dist',[
 ['weapon_short_bow','Arco Curto','common',1,4,7,1000,5,'wood'],
 ['weapon_long_bow','Arco Longo','common',5,10,15,1000,75,'wood'],
 ['weapon_composite_bow','Arco Composto','uncommon',14,22,34,1000,450,'steel'],
 ['weapon_elven_bow','Arco Élfico','rare',30,46,66,1000,2250,'mithril'],
 ['weapon_storm_bow','Arco da Tempestade','legendary',45,82,110,1000,11000,'gold']]);
W('magic',[
 ['weapon_twig_wand','Graveto Mágico','common',1,5,8,1150,5,'wood'],
 ['weapon_oak_wand','Cajado de Carvalho','common',5,11,17,1150,75,'wood'],
 ['weapon_crystal_wand','Cajado de Cristal','uncommon',14,24,36,1150,450,'steel'],
 ['weapon_arcane_wand','Cajado Arcano','rare',30,50,70,1150,2250,'mithril'],
 ['weapon_celestial_wand','Cajado Celestial','legendary',45,86,116,1150,11000,'gold']]);
add({id:'weapon_eclipse_sword',name:'Espada do Eclipse',type:'weapon',slot:'weaponMelee',style:'melee',rarity:'epic',reqLevel:25,
 dmg:{min:38,max:52},atkMs:1200,bonuses:{str:5},sell:4500,icon:{k:'eclipse'},
 desc:'Forjada durante um eclipse, sua lâmina guarda o brilho de uma estrela que desapareceu.'});
const A=rows=>rows.forEach(r=>add({id:r[0],name:r[1],type:'armor',slot:r[2],rarity:r[3],reqLevel:r[4],def:r[5],sell:r[6],icon:{k:r[2],c:MET[r[7]]},bonuses:r[8]||{},res:r[9]||{},desc:r[10]||''}));
A([
 ['helm_leather_cap','Capuz de Couro','helmet','common',2,1,20,'leather'],
 ['helm_iron','Elmo de Ferro','helmet','common',10,4,120,'iron'],
 ['helm_steel','Elmo de Aço','helmet','uncommon',20,7,600,'steel'],
 ['helm_mithril','Elmo de Mithril','helmet','rare',38,12,3000,'mithril'],
 ['armor_tunic','Túnica Simples','armor','common',1,0,2,'cloth'],
 ['armor_leather_shirt','Camisa de Couro','armor','common',1,1,6,'leather',{},{},'Costurada com retalhos de couro. Simples, mas protege.'],
 ['armor_leather','Armadura de Couro','armor','common',5,4,60,'leather'],
 ['armor_chain','Cota de Malha','armor','uncommon',15,10,400,'iron'],
 ['armor_plate','Armadura de Placas','armor','rare',30,20,2000,'plate'],
 ['armor_mithril','Armadura de Mithril','armor','legendary',45,36,9000,'mithril'],
 ['legs_leather','Calças de Couro','legs','common',1,1,10,'leather'],
 ['legs_chain','Calças de Malha','legs','uncommon',14,5,250,'iron'],
 ['legs_plate','Grevas de Placas','legs','rare',28,10,1200,'plate'],
 ['boots_leather','Botas de Couro','boots','common',1,1,8,'leather'],
 ['boots_iron','Botas de Ferro','boots','common',12,3,100,'iron'],
 ['boots_plate','Botas de Placas','boots','rare',26,6,900,'plate',{move:3}],
 ['shield_wood','Escudo de Madeira','shield','common',6,3,40,'wood'],
 ['shield_iron','Escudo de Ferro','shield','uncommon',16,7,300,'iron'],
 ['shield_tower','Escudo Torre','shield','rare',32,13,1800,'plate'],
 ['ring_vigor','Anel de Vigor','accessory','uncommon',10,0,350,'gold',{vit:3}],
 ['amulet_precision','Amuleto de Precisão','accessory','rare',18,0,1500,'gold',{pre:4,crit:.01}],
 ['ring_fire','Anel de Brasa','accessory','rare',22,0,1600,'ruby',{},{fire:20}],
 ['amulet_twilight','Amuleto Crepuscular','accessory','epic',28,0,3800,'gold',{int:4,pre:3,luck:5},{shadow:15},'Um lembrete de que a escuridão também brilha.'],
 // ---- drops exclusivos de bosses de mundo (raridade azul) ----
 ['boots_swift','Botas Velozes','boots','rare',10,3,900,'leather',{move:14},{},'Leves como o vento: +14% de velocidade.'],
 ['neck_fang','Cordão da Presa','accessory','rare',10,0,1100,'gold',{str:5},{},'Um cordão com a presa do Rei Goblin: +5 de força.'],
 ['neck_hawk','Colar do Falcão','accessory','rare',14,0,1700,'gold',{agi:7,crit:.02},{},'+7 de agilidade e mais chance de crítico.'],
 ['boots_viper','Botas da Víbora','boots','rare',14,4,1800,'leather',{move:16},{},'Couro de serpente: +16% de velocidade.'],
 ['neck_arcane','Cordão Arcano','accessory','rare',20,0,2800,'gold',{int:8},{},'+8 de inteligência.'],
 ['boots_bone','Botas Ósseas','boots','rare',20,6,3000,'iron',{move:18},{},'+18% de velocidade.'],
 ['neck_warlord','Cordão do Senhor da Guerra','accessory','rare',26,0,5200,'gold',{str:10,vit:3},{},'+10 de força e +3 de vitalidade.'],
 ['boots_warlord','Botas do Senhor da Guerra','boots','rare',26,9,5400,'plate',{move:20},{},'+20% de velocidade.'],
 ['neck_dragon','Cordão do Dragão Ancião','accessory','rare',36,0,12000,'ruby',{str:10,agi:10,int:10},{fire:15},'+10 em força, agilidade e inteligência.'],
 ['neck_gorgon','Cordão da Górgona','accessory','rare',50,0,22000,'ruby',{str:12,agi:12,int:12},{shadow:15},'+12 em força, agilidade e inteligência.'],
 ['boots_gorgon','Botas da Górgona','boots','rare',50,14,23000,'ruby',{move:30},{shadow:15},'+30% de velocidade.'],
 ['boots_dragon','Botas do Dragão','boots','rare',36,12,12500,'ruby',{move:26},{fire:15},'+26% de velocidade.']
]);
const C=(id,name,rarity,sell,stack,fx,desc,k)=>add({id,name,type:'consumable',rarity,sell,stack,fx,desc,icon:{k}});
C('potion_hp_small','Poção de Vida Pequena','common',8,50,{healPct:.4},'Restaura 40% da vida máxima.','potion_hp');
C('potion_mp_small','Poção de Mana Pequena','common',8,50,{manaPct:.4},'Restaura 40% da mana máxima.','potion_mp');
C('potion_hp_med','Poção de Vida Média','common',30,50,{healPct:.65},'Restaura 65% da vida máxima.','potion_hp');
C('potion_mp_med','Poção de Mana Média','common',30,50,{manaPct:.65},'Restaura 65% da mana máxima.','potion_mp');
C('potion_hp_big','Poção de Vida Grande','uncommon',80,50,{healPct:.9},'Restaura 90% da vida máxima.','potion_hp');
C('antidote','Antídoto','common',15,50,{cure:'poison'},'Remove o veneno.','potion_mp');
C('scroll_town','Pergaminho de Retorno','uncommon',30,20,{teleport:'town'},'Leva você de volta à vila.','scroll');
const Mt=(id,name,rarity,sell,desc)=>add({id,name,type:'material',rarity,sell,stack:99,desc:desc||'',icon:{k:'material'}});
Mt('mat_rat_tail','Cauda de Rato','common',2);Mt('mat_snake_fang','Presa de Cobra','common',5);Mt('mat_slime_goo','Gosma de Slime','common',3);Mt('mat_goblin_ear','Orelha de Goblin','common',12);
Mt('mat_bone_shard','Fragmento de Osso','common',20);Mt('mat_orc_tusk','Presa de Orc','uncommon',45);Mt('mat_ectoplasm','Ectoplasma','uncommon',90);
Mt('mat_feather','Pena de Pássaro','common',4);Mt('mat_rotten_flesh','Carne Podre','common',25);Mt('mat_wolf_fang','Presa de Lobo','uncommon',160);Mt('mat_plasma_core','Núcleo de Plasma','rare',380);
Mt('mat_dragon_scale','Escama de Dragão','rare',600);Mt('mat_twilight_fragment','Fragmento Crepuscular','rare',400,'Material de fabricação raro.');

// ---- cavernas e Ilha Eldorath (nível 150+) ----
Object.assign(MET,{obsidian:'#2b2733',void:'#7a4cff',abyss:'#2fd6c2',seraph:'#ffe9a0',frost:'#a8e6ff'});
Mt('mat_bat_wing','Asa de Morcego','common',8);Mt('mat_spider_silk','Seda de Aranha','common',14);Mt('mat_spore_cap','Chapéu de Esporos','uncommon',40);Mt('mat_stinger','Ferrão de Escorpião','uncommon',70);
Mt('mat_stone_core','Núcleo de Pedra','uncommon',180);Mt('mat_frost_wing','Asa Glacial','uncommon',260);Mt('mat_yeti_fur','Pelo de Yeti','rare',520);Mt('mat_magma_heart','Coração de Magma','rare',900);
Mt('mat_obsidian_shard','Estilhaço de Obsidiana','rare',9000);Mt('mat_void_scale','Escama do Vazio','rare',14000);Mt('mat_lich_dust','Pó de Lich','rare',20000);Mt('mat_titan_ice','Gelo de Titã','rare',32000);
Mt('mat_snow_scale','Escama de Neve','epic',70000,'Branca como a primeira nevasca.');Mt('mat_ice_crystal','Cristal de Gelo Eterno','rare',34000,'Frio demais para derreter.');Mt('mat_glacius_heart','Coração de Glacius','epic',600000,'Pulsa devagar, como uma geleira.');
Mt('mat_ember_scale','Escama de Brasa','rare',38000,'Ainda quente ao toque.');Mt('mat_frost_scale','Escama Glacial','rare',46000,'Nunca derrete.');Mt('mat_storm_scale','Escama da Tempestade','epic',60000,'Estala com eletricidade.');Mt('mat_void_heart','Coração do Vazio','epic',95000,'Pulsa em silêncio.');Mt('mat_elder_scale','Escama Ancestral','epic',150000,'Brilha como ouro velho.');
Mt('mat_hydra_fang','Presa de Hidra','rare',45000);Mt('mat_seraph_feather','Pena de Serafim','epic',70000);Mt('mat_worm_chitin','Quitina de Verme','epic',110000);Mt('mat_behemoth_horn','Chifre de Behemoth','epic',220000);
W('melee',[['weapon_obsidian_blade','Lâmina de Obsidiana','epic',150,520,700,1000,90000,'obsidian','Forjada no coração do Colosso. Corta sombras.'],['weapon_seraph_sword','Espada do Serafim','legendary',220,880,1150,1000,400000,'seraph','Brilha como a última luz do dia.']]);
W('dist',[['weapon_void_bow','Arco do Vazio','epic',150,520,700,1000,90000,'void','Suas flechas desaparecem antes de acertar — e reaparecem no alvo.'],['weapon_seraph_bow','Arco do Serafim','legendary',220,880,1150,1000,400000,'seraph']]);
W('magic',[['weapon_lich_staff','Cajado do Lich','epic',150,540,720,1150,90000,'void','Sussurra nomes de reis esquecidos.'],['weapon_seraph_staff','Cajado do Serafim','legendary',220,900,1180,1150,400000,'seraph']]);
A([['helm_abyss','Elmo Abissal','helmet','epic',150,80,60000,'abyss',{vit:12}],['armor_abyss','Armadura Abissal','armor','epic',150,150,110000,'abyss',{vit:20}],['legs_abyss','Grevas Abissais','legs','epic',150,100,80000,'abyss',{vit:14}],
 ['boots_abyss','Botas Abissais','boots','epic',150,60,70000,'abyss',{move:30,agi:10}],['shield_abyss','Escudo Abissal','shield','epic',150,110,90000,'abyss',{vit:16}],
 ['ring_behemoth','Anel do Behemoth','accessory','legendary',200,0,300000,'gold',{str:30,agi:30,int:30,vit:20},{fire:20,shadow:20,ice:20}],
 ['amulet_titan','Amuleto do Titã','accessory','epic',180,0,160000,'frost',{vit:40,pre:20},{ice:30}]]);
C('potion_hp_mega','Elixir Supremo','rare',400,50,{healPct:1},'Restaura toda a vida.','potion_hp');
C('potion_mp_big','Poção de Mana Grande','uncommon',80,50,{manaPct:.9},'Restaura 90% da mana máxima.','potion_mp');

/* ============ MONSTROS (regras) ============ */
const D=(id,chance,min,max,extra)=>Object.assign({id,chance,min:min||1,max:max||min||1},extra||{});
const MONSTERS={
 bird:{name:'Pássaro',level:4,hp:70,atk:11,def:2,xp:17,gold:[6,16],speed:3.9,aggro:9,atkCd:1.1,respawn:14,element:'phys',
  drops:[D('mat_feather',.3,1,2),D('potion_hp_small',.1,1,2),D('potion_mp_small',.06),D('potion_hp_med',.015),D('boots_leather',.04),D('helm_leather_cap',.03),D('weapon_long_bow',.015)]},
 slime:{name:'Slime',level:5,hp:90,atk:12,def:3,xp:22,gold:[5,15],speed:2.4,aggro:8,atkCd:1.2,respawn:12,element:'phys',
  drops:[D('mat_slime_goo',.28,1,2),D('potion_hp_small',.1,1,2),D('potion_mp_small',.06),D('potion_hp_med',.015),D('helm_leather_cap',.03),D('boots_leather',.04),D('weapon_oak_wand',.015),D('shield_wood',.012)]},
 rat:{name:'Rato',level:1,hp:55,atk:9,def:2,xp:10,gold:[4,12],speed:3.2,aggro:10,respawn:14,atkCd:1.1,element:'phys',
  drops:[D('boots_leather',.05),D('legs_leather',.05),D('armor_leather_shirt',.05),D('helm_leather_cap',.04),D('potion_hp_small',.12,1,2),D('potion_mp_small',.05),D('potion_hp_med',.015),D('weapon_iron_sword',.015),D('armor_leather',.012),D('shield_wood',.012)]},
 cobra:{name:'Cobra',level:3,hp:65,atk:12,def:2,xp:20,gold:[8,22],speed:3.3,aggro:9,respawn:14,element:'phys',onHit:{status:'poison',chance:.25,val:2,dur:6},
  drops:[D('mat_snake_fang',.28,1,2),D('antidote',.08),D('potion_hp_small',.1,1,2),D('potion_mp_small',.05),D('potion_hp_med',.015),D('helm_leather_cap',.03),D('legs_leather',.03),D('armor_leather',.012)]},
 goblin:{name:'Goblin',level:10,hp:95,atk:20,def:5,xp:55,gold:[10,26],speed:3.4,aggro:10,respawn:14,element:'phys',
  drops:[D('mat_goblin_ear',.6,1,2),D('potion_hp_small',.1,1,2),D('potion_mp_small',.08),D('weapon_iron_sword',.015),D('armor_leather',.015),D('shield_wood',.02),D('helm_iron',.01)]},
 skeleton:{name:'Esqueleto',level:25,hp:330,atk:56,def:16,xp:230,gold:[40,90],speed:4.0,aggro:10,respawn:14,element:'phys',res:{fire:-25,phys:10},
  drops:[D('mat_bone_shard',.6,1,3),D('potion_hp_small',.12,1,2),D('weapon_steel_sword',.012),D('boots_iron',.02),D('legs_chain',.012),D('ring_vigor',.01),D('scroll_town',.05)]},
 orc:{name:'Orc',level:22,hp:380,atk:58,def:18,xp:280,gold:[70,160],speed:3.9,aggro:11,respawn:14,element:'phys',
  drops:[D('mat_orc_tusk',.5,1,2),D('potion_hp_big',.08),D('armor_chain',.015),D('shield_iron',.015),D('weapon_composite_bow',.012),D('weapon_crystal_wand',.012),D('amulet_precision',.006)]},
 wraith:{name:'Espectro',level:32,hp:800,atk:100,def:30,xp:700,gold:[190,420],speed:4.3,aggro:12,respawn:14,element:'shadow',onHit:{status:'slow',chance:.3,val:.6,dur:3},res:{phys:30,fire:-20,shadow:60},
  drops:[D('mat_ectoplasm',.5,1,2),D('potion_mp_small',.2,1,3),D('weapon_ruby_blade',.004),D('weapon_arcane_wand',.004),D('weapon_elven_bow',.004),D('helm_steel',.01),D('ring_fire',.006)]},
 dragon:{name:'Dragão',level:45,hp:3000,atk:190,def:55,xp:3500,gold:[1100,2500],speed:4.9,aggro:14,respawn:70,breath:{kind:'fire',range:20,cd:3.4},element:'fire',onHit:{status:'burn',chance:.35,val:12,dur:4},res:{fire:80,ice:-30},
  drops:[D('mat_dragon_scale',.7,1,2),D('potion_hp_big',.4,1,3),D('weapon_ancient_king',.003),D('weapon_storm_bow',.003),D('weapon_celestial_wand',.003),D('armor_mithril',.01),D('armor_plate',.03),D('legs_plate',.03),D('boots_plate',.03),D('shield_tower',.02)]},
 zombie:{name:'Zumbi',level:20,hp:300,atk:40,def:8,xp:150,gold:[30,70],speed:2.7,aggro:10,respawn:14,element:'phys',onHit:{status:'poison',chance:.2,val:3,dur:5},
  drops:[D('mat_rotten_flesh',.6,1,2),D('potion_hp_small',.12,1,2),D('boots_iron',.02),D('helm_iron',.015),D('antidote',.06)]},
 skel_archer:{name:'Esqueleto Arqueiro',level:40,hp:520,atk:95,def:24,xp:900,gold:[150,330],speed:4.7,aggro:20,respawn:14,element:'phys',res:{fire:-25,phys:10},ranged:{range:17,keep:12,cd:2.1,kind:'dist'},
  drops:[D('mat_bone_shard',.7,2,4),D('potion_hp_big',.1),D('weapon_elven_bow',.006),D('weapon_composite_bow',.02),D('boots_plate',.015),D('amulet_precision',.01)]},
 skel_knight:{name:'Esqueleto Cavaleiro',level:45,hp:900,atk:120,def:46,xp:1500,gold:[220,480],speed:4.9,aggro:12,respawn:14,element:'phys',res:{fire:-25,phys:25},
  drops:[D('mat_bone_shard',.8,3,5),D('potion_hp_big',.12),D('weapon_ruby_blade',.006),D('shield_tower',.03),D('armor_plate',.03),D('legs_plate',.03),D('helm_steel',.03)]},
 wolf:{name:'Lobo',level:60,hp:1500,atk:150,def:40,xp:3200,gold:[300,600],speed:7,aggro:16,respawn:14,atkCd:.9,element:'phys',onHit:{status:'slow',chance:.25,val:.7,dur:2},
  drops:[D('mat_wolf_fang',.6,1,2),D('potion_hp_big',.25,1,2),D('legs_plate',.03),D('boots_plate',.03),D('weapon_arcane_wand',.006),D('armor_mithril',.006)]},
 ghost:{name:'Fantasma',level:75,hp:1200,atk:190,def:30,xp:5500,gold:[500,1000],speed:6.2,aggro:24,respawn:14,element:'shadow',res:{phys:40,shadow:60,fire:-20},ranged:{range:21,keep:15,cd:2.6,kind:'shadow'},
  drops:[D('mat_ectoplasm',.7,1,3),D('potion_hp_big',.3,1,2),D('ring_fire',.02),D('amulet_twilight',.01),D('weapon_celestial_wand',.004)]},
 ghostskel:{name:'Esqueleto Fantasma',level:72,hp:1000,atk:170,def:28,xp:5000,gold:[450,900],speed:5.9,aggro:22,respawn:14,element:'arcane',res:{phys:30,fire:-20},ranged:{range:19,keep:13,cd:2.0,kind:'plasma'},
  drops:[D('mat_plasma_core',.45),D('mat_bone_shard',.8,3,5),D('potion_hp_big',.25),D('weapon_storm_bow',.004),D('weapon_ancient_king',.004)]},
 sentinel:{name:'Sentinela da Cripta',level:28,hp:520,atk:70,def:22,xp:380,gold:[120,260],speed:3.5,aggro:11,respawn:30,element:'phys',res:{shadow:30},region:'crypt',
  drops:[D('mat_bone_shard',.7,2,4),D('mat_ectoplasm',.2),D('potion_hp_big',.1),D('helm_steel',.02),D('legs_plate',.01),D('boots_plate',.01),D('shield_tower',.005)]},
 twilight_guardian:{name:'Guardião do Crepúsculo',level:30,hp:6000,atk:85,def:28,xp:4000,gold:[900,1500],speed:3.2,aggro:30,respawn:300,element:'shadow',boss:true,region:'crypt',
  res:{shadow:50,fire:-10},
  drops:[D('weapon_eclipse_sword',.0075,1,1),D('mat_twilight_fragment',.6,1,3),D('mat_ectoplasm',.5,2,4),D('potion_hp_big',.35,1,2),D('potion_mp_small',.5,2,5),
   D('scroll_town',.2),D('amulet_twilight',.04),D('armor_plate',.03),D('helm_mithril',.02)]},
 bat:{name:'Morcego',level:6,hp:75,atk:14,def:2,xp:26,gold:[4,10],speed:5.2,aggro:11,respawn:14,atkCd:1.0,element:'phys',cave:1,
  drops:[D('mat_bat_wing',.55,1,2),D('potion_hp_small',.07),D('skin_drop_a',.003)]},
 spider:{name:'Aranha das Cavernas',level:12,hp:150,atk:26,def:6,xp:75,gold:[10,30],speed:4.4,aggro:11,respawn:14,element:'phys',onHit:{status:'poison',chance:.35,val:3,dur:6},cave:1,
  drops:[D('mat_spider_silk',.6,1,3),D('antidote',.1),D('potion_hp_small',.1),D('weapon_iron_sword',.02)]},
 mushroom:{name:'Cogumelo Venenoso',level:16,hp:260,atk:32,def:12,xp:120,gold:[18,45],speed:2.2,aggro:12,respawn:14,element:'phys',res:{fire:-30},ranged:{range:12,keep:7,cd:2.6,kind:'spore'},cave:1,
  drops:[D('mat_spore_cap',.6,1,2),D('antidote',.15),D('potion_mp_small',.12),D('armor_chain',.01)]},
 scorpion:{name:'Escorpião Gigante',level:20,hp:340,atk:48,def:18,xp:200,gold:[30,70],speed:4.6,aggro:12,respawn:14,element:'phys',onHit:{status:'poison',chance:.4,val:5,dur:6},cave:1,
  drops:[D('mat_stinger',.55,1,2),D('antidote',.15),D('potion_hp_big',.05),D('legs_chain',.015)]},
 golem:{name:'Golem de Pedra',level:28,hp:1500,atk:95,def:40,xp:560,gold:[90,200],speed:2.9,aggro:12,respawn:20,atkCd:1.8,element:'phys',res:{phys:20,ice:-20,fire:10},onHit:{status:'stun',chance:.2,val:0,dur:.8},cave:1,
  drops:[D('mat_stone_core',.55),D('potion_hp_big',.1),D('shield_iron',.03),D('armor_plate',.012),D('helm_mithril',.006)]},
 icebat:{name:'Morcego Glacial',level:34,hp:700,atk:110,def:20,xp:850,gold:[80,160],speed:6.2,aggro:14,respawn:14,element:'ice',onHit:{status:'slow',chance:.35,val:.65,dur:3},res:{ice:60,fire:-40},cave:1,
  drops:[D('mat_frost_wing',.55,1,2),D('potion_hp_big',.12),D('potion_mp_big',.05)]},
 yeti:{name:'Yeti',level:40,hp:2600,atk:150,def:38,xp:1700,gold:[200,420],speed:4.8,aggro:15,respawn:20,atkCd:1.3,element:'ice',onHit:{status:'slow',chance:.3,val:.65,dur:3},res:{ice:70,fire:-35},cave:1,
  drops:[D('mat_yeti_fur',.55),D('potion_hp_big',.25,1,2),D('armor_mithril',.008),D('legs_plate',.03),D('amulet_precision',.01)]},
 salamander:{name:'Salamandra de Magma',level:52,hp:3400,atk:200,def:45,xp:3300,gold:[320,640],speed:4.5,aggro:16,respawn:20,element:'fire',onHit:{status:'burn',chance:.4,val:16,dur:4},res:{fire:90,ice:-40},ranged:{range:14,keep:7,cd:2.4,kind:'fire'},cave:1,
  drops:[D('mat_magma_heart',.5),D('potion_hp_big',.3,1,2),D('ring_fire',.03),D('weapon_ruby_blade',.01),D('weapon_arcane_wand',.01)]},
 // ---- Ilha Eldorath: só nível 150 ou mais ----
 colossus:{name:'Colosso de Obsidiana',level:150,hp:160000,atk:1500,def:320,xp:0,xpFromLevel:55,gold:[8000,16000],speed:3.6,aggro:18,respawn:60,atkCd:2.0,element:'phys',res:{phys:30,fire:60,ice:-30},onHit:{status:'stun',chance:.2,val:0,dur:1},far:1,
  drops:[D('mat_obsidian_shard',.7,1,2),D('weapon_obsidian_blade',.012),D('helm_abyss',.012),D('armor_abyss',.008),D('potion_hp_mega',.2),D('skin_drop_b',.01)]},
 dragon_ember:{name:'Dragão de Brasas',level:170,hp:170000,atk:1900,def:300,xp:0,xpFromLevel:49,gold:[10000,20000],speed:5.6,aggro:26,respawn:70,atkCd:1.4,element:'fire',res:{fire:90,ice:-40},breath:{kind:'fire',range:23,cd:3.0},onHit:{status:'burn',chance:.4,val:60,dur:5},far:1,
  drops:[D('mat_ember_scale',.7,1,2),D('armor_abyss',.01),D('weapon_obsidian_blade',.01),D('potion_hp_mega',.25),D('skin_drop_b',.012)]},
 dragon_frost:{name:'Dragão Glacial',level:185,hp:240000,atk:2200,def:380,xp:0,xpFromLevel:47,gold:[12000,24000],speed:3.3,aggro:26,respawn:70,atkCd:1.5,element:'ice',res:{ice:90,fire:-40},breath:{kind:'ice',range:23,cd:3.2},onHit:{status:'slow',chance:.35,val:.5,dur:3},far:1,
  drops:[D('mat_frost_scale',.7,1,2),D('shield_abyss',.01),D('helm_abyss',.01),D('potion_hp_mega',.25),D('skin_drop_c',.012)]},
 dragon_storm:{name:'Dragão da Tempestade',level:200,hp:260000,atk:2400,def:330,xp:0,xpFromLevel:46,gold:[13000,26000],speed:7.0,aggro:30,respawn:75,atkCd:1.3,element:'arcane',res:{arcane:70,phys:10},breath:{kind:'bolt',range:26,cd:2.6},onHit:{status:'stun',chance:.2,val:0,dur:.9},far:1,
  drops:[D('mat_storm_scale',.7,1,2),D('weapon_void_bow',.012),D('boots_abyss',.012),D('potion_hp_mega',.25),D('skin_drop_c',.012)]},
 dragon_void:{name:'Dragão do Vazio',level:240,hp:450000,atk:3200,def:450,xp:0,xpFromLevel:43,gold:[22000,44000],speed:6.4,aggro:30,respawn:80,atkCd:1.4,element:'shadow',res:{shadow:90,phys:25},breath:{kind:'void',range:26,cd:2.8},onHit:{status:'slow',chance:.35,val:.55,dur:3},far:1,
  drops:[D('mat_void_heart',.7,1,2),D('weapon_lich_staff',.012),D('legs_abyss',.012),D('potion_hp_mega',.3),D('skin_drop_d',.012)]},
 dragon_elder:{name:'Dragão Ancestral',level:270,hp:700000,atk:4200,def:600,xp:0,xpFromLevel:40,gold:[40000,80000],speed:5.2,aggro:30,respawn:90,atkCd:1.6,element:'fire',res:{fire:60,ice:40,shadow:40,phys:40},breath:{kind:'holy',range:28,cd:3.0},onHit:{status:'burn',chance:.4,val:90,dur:6},far:1,
  drops:[D('mat_elder_scale',.8,1,3),D('weapon_seraph_sword',.004),D('weapon_seraph_staff',.004),D('weapon_seraph_bow',.004),D('ring_behemoth',.006),D('potion_hp_mega',.4,1,2),D('skin_drop_e',.02)]},
 dragon_ice:{name:'Dragão da Neve',level:215,hp:330000,atk:2900,def:420,xp:0,xpFromLevel:44,gold:[16000,32000],speed:3.6,aggro:28,respawn:75,atkCd:1.4,element:'ice',res:{ice:95,fire:-45},breath:{kind:'ice',range:25,cd:2.8},onHit:{status:'slow',chance:.4,val:.45,dur:3.5},far:1,
  drops:[D('mat_snow_scale',.7,1,2),D('mat_ice_crystal',.4,1,2),D('helm_abyss',.01),D('boots_abyss',.01),D('potion_hp_mega',.3),D('skin_drop_c',.014)]},
 ice_man:{name:'Homem de Gelo',level:175,hp:140000,atk:1800,def:300,xp:0,xpFromLevel:49,gold:[9000,18000],speed:3.1,aggro:20,respawn:50,atkCd:1.5,element:'ice',res:{ice:80,fire:-40,phys:10},onHit:{status:'slow',chance:.35,val:.6,dur:3},far:1,
  drops:[D('mat_ice_crystal',.7,1,2),D('armor_abyss',.008),D('legs_abyss',.01),D('potion_hp_mega',.2),D('skin_drop_b',.01)]},
 ice_emperor:{name:'Imperador Glacius',level:300,hp:2500000,atk:5200,def:800,xp:0,xpFromLevel:36,gold:[120000,200000],speed:3,aggro:34,respawn:240,atkCd:1.8,element:'ice',res:{ice:95,phys:40,fire:-35},breath:{kind:'ice',range:32,cd:2.2},onHit:{status:'stun',chance:.25,val:0,dur:1.2},far:1,
  drops:[D('mat_glacius_heart',1),D('mat_snow_scale',1,2,4),D('mat_ice_crystal',1,3,6),D('weapon_seraph_sword',.02),D('weapon_seraph_staff',.02),D('weapon_seraph_bow',.02),D('ring_behemoth',.04),D('potion_hp_mega',1,2,4),D('skin_drop_e',.08)]},
 wyvern:{name:'Wyvern do Vazio',level:165,hp:150000,atk:1750,def:300,xp:0,xpFromLevel:50,gold:[9000,18000],speed:6.5,aggro:26,respawn:60,atkCd:1.4,element:'shadow',res:{shadow:60,phys:15},breath:{kind:'void',range:24,cd:3.2},onHit:{status:'slow',chance:.25,val:.6,dur:3},far:1,
  drops:[D('mat_void_scale',.7,1,2),D('weapon_void_bow',.012),D('boots_abyss',.012),D('legs_abyss',.01),D('potion_hp_mega',.2),D('skin_drop_b',.01)]},
 lich:{name:'Lich Real',level:180,hp:190000,atk:2100,def:280,xp:0,xpFromLevel:48,gold:[11000,22000],speed:4.2,aggro:26,respawn:60,element:'shadow',res:{shadow:80,phys:20,fire:-25},ranged:{range:23,keep:15,cd:2.2,kind:'void'},far:1,
  drops:[D('mat_lich_dust',.7,1,3),D('weapon_lich_staff',.012),D('shield_abyss',.012),D('potion_mp_big',.4,2,3),D('potion_hp_mega',.2),D('skin_drop_c',.01)]},
 frost_titan:{name:'Titã Glacial',level:195,hp:380000,atk:2600,def:450,xp:0,xpFromLevel:45,gold:[14000,28000],speed:2.3,aggro:18,respawn:70,atkCd:2.2,element:'ice',res:{ice:90,phys:35,fire:-40},onHit:{status:'slow',chance:.4,val:.55,dur:3},far:1,
  drops:[D('mat_titan_ice',.7,1,2),D('amulet_titan',.012),D('armor_abyss',.01),D('potion_hp_mega',.25),D('skin_drop_c',.01)]},
 hydra:{name:'Hidra Abissal',level:210,hp:300000,atk:2800,def:340,xp:0,xpFromLevel:42,gold:[16000,32000],speed:4.0,aggro:20,respawn:70,atkCd:1.5,element:'phys',res:{ice:30,fire:-20},onHit:{status:'poison',chance:.5,val:60,dur:8},ranged:{range:17,keep:6,cd:1.9,kind:'venom'},far:1,
  drops:[D('mat_hydra_fang',.7,1,2),D('potion_hp_mega',.3),D('helm_abyss',.012),D('legs_abyss',.012),D('skin_drop_d',.01)]},
 seraph:{name:'Serafim Caído',level:230,hp:280000,atk:3300,def:360,xp:0,xpFromLevel:40,gold:[20000,40000],speed:5.5,aggro:28,respawn:80,element:'fire',res:{fire:70,shadow:-30},ranged:{range:25,keep:14,cd:2.0,kind:'holy'},onHit:{status:'burn',chance:.4,val:70,dur:5},far:1,
  drops:[D('mat_seraph_feather',.7,1,2),D('weapon_seraph_staff',.006),D('weapon_seraph_sword',.006),D('weapon_seraph_bow',.006),D('potion_hp_mega',.3),D('skin_drop_d',.012)]},
 sandworm:{name:'Verme das Areias',level:250,hp:450000,atk:3800,def:420,xp:0,xpFromLevel:38,gold:[26000,52000],speed:6.0,aggro:22,respawn:80,atkCd:2.0,element:'phys',res:{phys:25,ice:-20},onHit:{status:'stun',chance:.25,val:0,dur:1.2},far:1,
  drops:[D('mat_worm_chitin',.7,1,2),D('armor_abyss',.012),D('boots_abyss',.012),D('potion_hp_mega',.3),D('skin_drop_e',.012)]},
 behemoth:{name:'Behemoth Ancestral',level:300,hp:900000,atk:5200,def:600,xp:0,xpFromLevel:35,gold:[40000,90000],speed:5.2,aggro:24,respawn:120,atkCd:2.4,element:'phys',res:{phys:40,fire:30,ice:30},onHit:{status:'stun',chance:.3,val:0,dur:1.2},far:1,
  drops:[D('mat_behemoth_horn',.7,1,2),D('ring_behemoth',.01),D('weapon_seraph_sword',.01),D('weapon_seraph_bow',.01),D('weapon_seraph_staff',.01),D('potion_hp_mega',.4,1,2),D('skin_drop_e',.02)]},
 // ---- BOSSES DE MUNDO: surgem em horas aleatórias; quanto mais fortes, mais demoram a reaparecer. Precisam de grupo. ----
 boss_goblin_king:{name:'Rei Goblin',level:14,hp:2600,atk:34,def:8,xp:900,gold:[150,300],speed:3.6,aggro:18,respawn:1e9,element:'phys',wb:{tier:1,base:9,bio:['C','D','N'],stomp:{r:6,mult:1.5,cd:8}},
  drops:[D('boots_swift',.45),D('neck_fang',.45),D('potion_hp_small',1,2,4),D('mat_goblin_ear',1,3,5),D('weapon_steel_sword',.08)]},
 boss_viper_queen:{name:'Rainha Víbora',level:20,hp:4200,atk:52,def:12,xp:1600,gold:[260,480],speed:3.8,aggro:18,respawn:1e9,element:'phys',onHit:{status:'poison',chance:.5,val:4,dur:8},wb:{tier:2,base:15,bio:['K','E'],stomp:{r:6.5,mult:1.4,cd:8}},
  drops:[D('neck_hawk',.45),D('boots_viper',.45),D('potion_hp_big',.6,1,2),D('amulet_precision',.12)]},
 boss_bone_lord:{name:'Senhor dos Ossos',level:28,hp:7000,atk:80,def:20,xp:2800,gold:[450,800],speed:3.8,aggro:18,respawn:1e9,element:'phys',res:{fire:-25,phys:10},wb:{tier:3,base:24,bio:['T','F','P'],stomp:{r:7,mult:1.5,cd:7}},
  drops:[D('neck_arcane',.45),D('boots_bone',.45),D('potion_hp_big',.8,1,3),D('mat_bone_shard',1,4,8),D('ring_fire',.1)]},
 boss_orc_warlord:{name:'Gorrok, Senhor da Guerra',level:36,hp:11000,atk:120,def:32,xp:5000,gold:[800,1400],speed:3.8,aggro:20,respawn:1e9,element:'phys',wb:{tier:4,base:38,bio:['L','M','H'],stomp:{r:8,mult:1.6,cd:7}},
  drops:[D('neck_warlord',.45),D('boots_warlord',.45),D('potion_hp_big',1,2,4),D('armor_chain',.2),D('shield_iron',.2)]},
 boss_ancient_dragon:{name:'Dragão Ancião',level:50,hp:22000,atk:210,def:60,xp:12000,gold:[2000,4000],speed:4,aggro:22,respawn:1e9,element:'fire',onHit:{status:'burn',chance:.4,val:14,dur:4},res:{fire:80,ice:-30},wb:{tier:5,base:60,bio:['Q','R','S'],stomp:{r:10,mult:1.8,cd:6}},
  drops:[D('neck_dragon',.4),D('boots_dragon',.4),D('mat_dragon_scale',1,3,5),D('potion_hp_big',1,3,5),D('armor_mithril',.06),D('weapon_ancient_king',.03)]},
 boss_medusa:{name:'Medusa',level:80,hp:45000,atk:260,def:70,xp:20000,gold:[4000,7000],speed:4.6,aggro:26,respawn:1e9,element:'shadow',res:{shadow:50},ranged:{range:15,keep:7,cd:3.2,kind:'shadow'},wb:{tier:6,base:80,bio:['J'],stomp:{r:9,mult:1.6,cd:7},petrify:{every:5,dur:.5}},
  drops:[D('neck_gorgon',.4),D('boots_gorgon',.4),D('mat_plasma_core',1,2,4),D('potion_hp_big',1,3,6),D('weapon_celestial_wand',.04),D('weapon_ancient_king',.04)]},
};
for(const id in MONSTERS)MONSTERS[id].id=id;
// Eventos temporários alteram taxas sem mexer no código central
const EVENTS={
 eclipse_week:{name:'Semana do Eclipse',mult:{epic:1.5,rare:1.25},only:null},
 goblin_hunt:{name:'Caçada aos Goblins',mult:{common:1.5},only:['goblin']}
};

/* ============ MERCADO DOS JOGADORES E TROCA DIRETA ============ */
const MARKET_MAX=8,MARKET_FEE=.03;
function marketList(st,uid,qty,price){const i=findUid(st,uid);if(i<0)return{ok:false,err:'notfound'};const id=st.inv[i].id,d=ITEMS[id];
 if(!Number.isInteger(qty)||qty<1||qty>st.inv[i].qty)return{ok:false,err:'qty'};if(!Number.isInteger(price)||price<1||price>1e9)return{ok:false,err:'price'};
 st.market=st.market||[];if(st.market.length>=MARKET_MAX)return{ok:false,err:'full'};
 const r=removeUid(st,uid,qty);if(!r.ok)return r;const lid=mint();st.market.push(Object.assign({lid,id,qty,price},r.item&&r.item.t?{t:r.item.t}:{}));return{ok:true,lid}}
function marketCancel(st,lid){const i=(st.market||[]).findIndex(x=>x.lid===lid);if(i<0)return{ok:false,err:'notfound'};const l=st.market[i];if(roomFor(st,l.id)<l.qty)return{ok:false,err:'full'};
 addItem(st,l.id,l.qty,null,l.t);st.market.splice(i,1);return{ok:true}}
// um comprador paga price*qty; o vendedor recebe 97% (3% de taxa de mercado)
function marketSale(st,lid,qty){const i=(st.market||[]).findIndex(x=>x.lid===lid);if(i<0)return{ok:false,err:'notfound'};const l=st.market[i];
 if(!Number.isInteger(qty)||qty<1||qty>l.qty)return{ok:false,err:'qty'};const gross=l.price*qty,net=Math.floor(gross*(1-MARKET_FEE));if(st.gold+net>CFG.goldCap)return{ok:false,err:'cap'};
 st.gold+=net;l.qty-=qty;const id=l.id;if(l.qty<=0)st.market.splice(i,1);logTx(st,{k:'market',id,qty,gold:net});return{ok:true,id,qty,gross,net,t:l.t}}
// valor de referência de um item (para negociar): preço de loja, ou 2,2× o valor de venda
function itemValue(id){const d=ITEMS[id];if(!d)return 0;for(const sh in SHOPS){const e=SHOPS[sh].stock.find(x=>x[0]===id);if(e)return e[1]}return Math.max(4,Math.round((d.sell||2)*2.2))}
const offerValue=o=>(o.gold|0)+(o.items||[]).reduce((a,it)=>a+itemValue(it.id)*it.qty,0);
function tradeCheck(st,off){if(!off||!Number.isInteger(off.gold||0)||(off.gold||0)<0||(off.gold||0)>st.gold)return'gold';const seen=new Set();
 for(const it of off.items||[]){if(seen.has(it.uid))return'dup';seen.add(it.uid);const i=findUid(st,it.uid);if(i<0)return'item';if(!Number.isInteger(it.qty)||it.qty<1||it.qty>st.inv[i].qty)return'qty'}return null}
// troca atômica entre dois estados (jogador↔jogador/bot). Cada oferta: {gold, items:[{uid,qty}]}. Nada muda se algo falhar.
function tradeExec(a,offA,b,offB){let e=tradeCheck(a,offA)||tradeCheck(b,offB);if(e)return{ok:false,err:e};
 const ca=JSON.parse(JSON.stringify({inv:a.inv,gold:a.gold})),cb=JSON.parse(JSON.stringify({inv:b.inv,gold:b.gold})),moved=(off,from,to,ref)=>{
  for(const it of off.items||[]){const r=removeUid(from,it.uid,it.qty);if(!r.ok)return false;const ad=addItem(to,r.item.id,r.item.qty,null,r.item.t);if(!ad.ok||ad.left>0)return false}
  from.gold-=off.gold||0;to.gold+=off.gold||0;return to.gold<=CFG.goldCap};
 if(!moved(offA,ca,cb)||!moved(offB,cb,ca))return{ok:false,err:'full'};
 a.inv=ca.inv;a.gold=ca.gold;b.inv=cb.inv;b.gold=cb.gold;logTx(a,{k:'trade2',gold:(offB.gold||0)-(offA.gold||0)});return{ok:true}}

/* ============ SKINS (cosmético) ============ */
// 5 skins por classe (personagem) e 5 para cada: espada, cajado, arco, escudo, aljava, mascote. Viram itens negociáveis; ao USAR, a skin é liberada na conta.
const SKIN_SLOTS={char_melee:'Aparência do Guerreiro',char_dist:'Aparência do Arqueiro',char_magic:'Aparência do Mago',sword:'Espada',staff:'Cajado',bow:'Arco',shield:'Escudo',quiver:'Aljava',pet:'Mascote do Mago'};
const SKIN_NAMES={
 char_melee:['Cavaleiro Carmesim','Guarda Noturno','Paladino Dourado','Cavaleiro de Gelo','Lorde de Obsidiana'],
 char_dist:['Caçador da Mata','Sombra Verde','Patrulheiro Dourado','Atirador Polar','Espectro Carmesim'],
 char_magic:['Arcano Violeta','Piromante','Sábio Dourado','Criomante','Mago do Vazio'],
 sword:['Espada Flamejante','Lâmina de Gelo','Lâmina Venenosa','Espada Solar','Lâmina do Vazio'],
 staff:['Cajado de Brasas','Cajado Glacial','Cajado da Floresta','Cajado Solar','Cajado do Vazio'],
 bow:['Arco Flamejante','Arco Glacial','Arco Venenoso','Arco Solar','Arco do Vazio'],
 shield:['Escudo do Leão','Escudo Glacial','Escudo da Hera','Escudo Solar','Escudo do Vazio'],
 quiver:['Aljava Carmesim','Aljava de Gelo','Aljava Verde','Aljava Dourada','Aljava do Vazio'],
 pet:['Fênix Filhote','Raposa de Gelo','Espírito da Floresta','Dragãozinho Dourado','Olho do Vazio']};
const SKIN_RAR=['uncommon','rare','epic','epic','legendary'];
const SKINS=[];
for(const slot in SKIN_NAMES)SKIN_NAMES[slot].forEach((n,i)=>{const id=`skin_${slot}_${i+1}`;SKINS.push({id,slot,n:i+1,name:n});
 add({id,name:'Skin: '+n,type:'skin',skin:{slot,n:i+1},rarity:SKIN_RAR[i],sell:3000*Math.pow(4,i),stack:1,icon:{k:'skin'},desc:`${SKIN_SLOTS[slot]} — item cosmético. Use para liberar a aparência; depois equipe em Personagem › Aparência. Pode ser negociado antes de usar.`})});
/* ============ CONJUNTOS DE ARMADURA (v34) ============
   Cada nível/bioma tem o seu visual e cada monstro larga PEÇAS ESPECÍFICAS do conjunto do seu bioma (chance boa);
   as outras peças do mesmo conjunto caem com chance bem menor. Peças espectrais (mortos-vivos) são cinza e translúcidas. */
const hexMix=(h,t,k)=>{const n=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)),a=n(h),b=n(t);return'#'+a.map((v,i)=>Math.round(v+(b[i]-v)*k).toString(16).padStart(2,'0')).join('')};
const SET_SLOTS=['helmet','armor','legs','boots','shield','accessory'],SC={h:'helmet',a:'armor',l:'legs',b:'boots',s:'shield',r:'accessory'};
const SET_NOUN={
 leather:['Capuz','Gibão','Calças','Botas','Broquel','Anel'],metal:['Elmo','Armadura','Grevas','Botas','Escudo','Anel'],cloth:['Capuz','Túnica','Calças','Sandálias','Escudo','Anel'],
 scale:['Elmo','Couraça','Grevas','Botas','Escudo','Anel'],bone:['Elmo','Peitoral','Grevas','Botas','Escudo','Anel'],crystal:['Coroa','Couraça','Grevas','Botas','Escudo','Anel']};
const SETS=[
 {k:'campo',n:'Retalhos do Campo',lv:1,m:'leather',c:'#a8794a',a:'#d9c27a',at:'vit',mobs:{rat:'lh',cobra:'ab',slime:'sr',bird:'rh'}},
 {k:'goblin',n:'Goblin Verde',lv:8,m:'leather',c:'#5f8f3a',a:'#c9d98a',at:'agi',mobs:{goblin:'ha',boss_goblin_king:'halbs'}},
 {k:'orc',n:'Orc Rubro',lv:20,m:'metal',c:'#8f3b2e',a:'#d0a24a',at:'str',mobs:{orc:'as',boss_orc_warlord:'halbs'}},
 {k:'mortalha',n:'Mortalha Cinzenta',lv:20,m:'cloth',c:'#a9b3bd',a:'#dfe8f0',at:'int',g:1,el:'shadow',mobs:{zombie:'al',skeleton:'hs',wraith:'rb'}},
 {k:'sudario',n:'Sudário Espectral',lv:40,m:'cloth',c:'#8fa0b4',a:'#c8d8ee',at:'int',g:1,el:'shadow',mobs:{skel_archer:'hb',skel_knight:'as',ghostskel:'lr',ghost:'ah',twilight_guardian:'halbs'}},
 {k:'teia',n:'Teia Sombria',lv:8,m:'cloth',c:'#4a3f66',a:'#9a8fc8',at:'agi',mobs:{bat:'br',spider:'al'}},
 {k:'carapaca',n:'Carapaça de Esporos',lv:18,m:'scale',c:'#6e8a3c',a:'#d6c96a',at:'vit',el:'poison',mobs:{mushroom:'hs',scorpion:'ab',boss_viper_queen:'halbs'}},
 {k:'pedra',n:'Pedra Viva',lv:28,m:'metal',c:'#7c7f86',a:'#b8bcc4',at:'vit',mobs:{golem:'als',sentinel:'hb',boss_bone_lord:'halbs'}},
 {k:'polar',n:'Gelo Polar',lv:36,m:'scale',c:'#8fc9e8',a:'#e6f6ff',at:'int',el:'ice',mobs:{icebat:'br',yeti:'hal'}},
 {k:'escama',n:'Escama Rubra',lv:45,m:'scale',c:'#b5382a',a:'#ffb347',at:'str',el:'fire',mobs:{dragon:'halbs',salamander:'ah',boss_ancient_dragon:'halbs'}},
 {k:'lobo',n:'Lobo Cinzento',lv:60,m:'leather',c:'#6b7078',a:'#c9ced6',at:'agi',mobs:{wolf:'albh',boss_medusa:'halbs'}},
 {k:'obsidiana',n:'Obsidiana',lv:150,m:'metal',c:'#2b2733',a:'#7a4cff',at:'str',mobs:{colossus:'als'}},
 {k:'brasa',n:'Brasa Viva',lv:170,m:'scale',c:'#d1481f',a:'#ffc23a',at:'str',el:'fire',mobs:{dragon_ember:'halbs'}},
 {k:'wyvern',n:'Escama do Vazio',lv:165,m:'scale',c:'#5b3a8f',a:'#c79bff',at:'agi',el:'shadow',mobs:{wyvern:'hbr'}},
 {k:'lich',n:'Lich Real',lv:180,m:'cloth',c:'#4d3a7a',a:'#9dffd0',at:'int',el:'shadow',mobs:{lich:'ahr'}},
 {k:'gelo_cristal',n:'Gelo Cristalino',lv:175,m:'crystal',c:'#bfe6f8',a:'#ffffff',at:'int',el:'ice',mobs:{ice_man:'alsb'}},
 {k:'glacial',n:'Glacial Profundo',lv:185,m:'scale',c:'#4f8fc4',a:'#bff0ff',at:'int',el:'ice',mobs:{dragon_frost:'halbs'}},
 {k:'tita',n:'Titã do Gelo',lv:195,m:'crystal',c:'#7fb8d8',a:'#e8f8ff',at:'vit',el:'ice',mobs:{frost_titan:'alsr'}},
 {k:'tempestade',n:'Tempestade',lv:200,m:'scale',c:'#4a5a8a',a:'#ffe14a',at:'agi',mobs:{dragon_storm:'halbs'}},
 {k:'hidra',n:'Hidra Abissal',lv:210,m:'scale',c:'#2f6b4a',a:'#9dff6a',at:'vit',el:'poison',mobs:{hydra:'halbs'}},
 {k:'neve',n:'Neve Eterna',lv:215,m:'crystal',c:'#f2f8ff',a:'#6fc8ff',at:'int',el:'ice',mobs:{dragon_ice:'halbs'}},
 {k:'serafim',n:'Serafim Caído',lv:230,m:'metal',c:'#e8d49a',a:'#fff3b0',at:'int',el:'fire',mobs:{seraph:'halbs'}},
 {k:'vazio',n:'Vazio Profundo',lv:240,m:'scale',c:'#2a1a4a',a:'#b56bff',at:'int',el:'shadow',mobs:{dragon_void:'halbs'}},
 {k:'dunas',n:'Dunas Antigas',lv:250,m:'bone',c:'#c9a35a',a:'#f0dca0',at:'str',mobs:{sandworm:'halbs'}},
 {k:'ancestral',n:'Dragão Ancestral',lv:270,m:'scale',c:'#c9962a',a:'#fff0a0',at:'str',el:'fire',mobs:{dragon_elder:'halbs'}},
 {k:'imperial',n:'Imperador do Gelo',lv:300,m:'crystal',c:'#d8f0ff',a:'#4fc8ff',at:'int',el:'ice',mobs:{ice_emperor:'halbsr'}},
 {k:'behemoth',n:'Behemoth',lv:300,m:'bone',c:'#8a6f4a',a:'#e0c080',at:'vit',mobs:{behemoth:'halbs'}},
 // ---- conjuntos exclusivos de chefes (v45): cura ----
 // Sagrado: aura que cura aliados num raio de 100 m (só dos chefes mais fortes). Vínculo de Vida: parte do dano que você leva vira cura (chefes iniciais).
 // Só raridade Raro ou acima (Raro → Lendário); o efeito cresce com o fundo.
 {k:'sagrado',n:'Curandeiro Sagrado',lv:260,m:'cloth',c:'#fff4d6',a:'#7dffb0',at:'int',heal:'aura',mobs:{seraph:'halbs',sandworm:'halbs',dragon_elder:'halbs',behemoth:'halbs',ice_emperor:'halbs'}},
 {k:'vinculo',n:'Vínculo de Vida',lv:30,m:'leather',c:'#c94a6a',a:'#ffd0dc',at:'vit',heal:'vital',mobs:{boss_orc_warlord:'halbs',boss_ancient_dragon:'halbs'}}];   // itens de chefe: no máximo 2 chefes por conjunto
// valores de cura por peça (fração; vezes o fator do fundo)
const HEAL_W={aura:{helmet:.005,armor:.01,legs:.007,boots:.004,shield:.006,accessory:.006,necklace:.005},vital:{helmet:.008,armor:.016,legs:.011,boots:.006,shield:.012,accessory:.01,necklace:.008}};
const HEAL_TF={3:1,4:1.5,5:2.2,6:3},HEAL_CAP={aura:.15,vital:.25},HEAL_R=100,HEAL_EVERY=3;
const BAG_BASE=lv=>Math.min(20,2+Math.round(lv/16));

// cada item antigo também ganha uma cor própria (nenhum par do mesmo tipo repete a cor)
{const used={},pal=['#b5651d','#4f7f5a','#6b7fb5','#b0505a','#c9a03a','#5aa0a0','#8a5fb0','#9a9a5a','#c47a4a','#5f6f8f','#7a9a4a','#a05a7a'];let pi=0;
 for(const id in ITEMS){const d=ITEMS[id];if(d.set||!d.icon||!d.icon.c||(d.type!=='armor'&&d.type!=='weapon'))continue;const key=d.type==='armor'?d.slot:d.slot;used[key]=used[key]||new Set();
  let c=d.icon.c,tries=0;while(used[key].has(c)&&tries++<12)c=hexMix(d.icon.c,pal[(pi++)%pal.length],.35+.05*tries);d.icon.c=c;used[key].add(c)}}
const WMOTIF={campo:'wood',goblin:'jag',orc:'cleaver',mortalha:'ghost',sudario:'ghost',teia:'web',carapaca:'shell',pedra:'stone',polar:'ice',escama:'fang',lobo:'fang',obsidiana:'glass',brasa:'flame',wyvern:'wing',lich:'skull',gelo_cristal:'crystal',glacial:'ice',tita:'crystal',tempestade:'bolt',hidra:'fang',neve:'crystal',serafim:'wing',vazio:'void',dunas:'bone',ancestral:'rune',imperial:'crystal',behemoth:'bone',sagrado:'halo',vinculo:'heart'};
const WDMG_PTS=[[1,4],[5,10],[14,22],[30,46],[45,82],[150,520],[220,880],[300,1300]];
const wdmgMin=lv=>{let i=0;while(i<WDMG_PTS.length-2&&lv>WDMG_PTS[i+1][0])i++;const a=WDMG_PTS[i],b=WDMG_PTS[i+1];return Math.max(1,Math.round(a[1]+(b[1]-a[1])*Math.max(0,Math.min(1,(lv-a[0])/(b[0]-a[0])))))};
const SET_OF={},VAR_OF={};   // id da peça -> conjunto / classe da variante
const lvR_=lv=>Math.min(40,5+Math.round(lv/8));
{const defK=(lv)=>lv<=45?.75*lv:34+(lv-45)*1.1,W_={helmet:.53,armor:1,legs:.66,boots:.4,shield:.73,accessory:0};
 for(const S of SETS){const lv=S.lv,rar=lv>=250?'legendary':lv>=150?'epic':lv>=60?'epic':lv>=24?'rare':lv>=8?'uncommon':'common',nn=SET_NOUN[S.m];
  S.items={};SET_SLOTS.forEach((sl,i)=>{const id=`set_${S.k}_${sl}`,col=sl==='helmet'?hexMix(S.c,'#ffffff',.14):sl==='armor'?S.c:sl==='legs'?hexMix(S.c,'#000000',.16):sl==='boots'?hexMix(S.c,'#000000',.32):sl==='shield'?hexMix(S.c,S.a,.45):S.a;
   const who=Object.keys(S.mobs).filter(m=>S.mobs[m].split('').some(ch=>SC[ch]===sl)).map(m=>MONSTERS[m].name);
   const el=S.el,lvR=Math.min(40,5+Math.round(lv/8)),n=Math.ceil(lv/12)+1;
   add({id,name:`${nn[i]} de ${S.n}`,type:'armor',slot:sl,rarity:rar,reqLevel:lv,def:Math.max(1,Math.round(defK(lv)*W_[sl]*(sl==='accessory'?1:1.25))),cls:'melee',sell:Math.round(Math.max(6,(defK(lv)*W_[sl]||defK(lv)*.6))*lv*4)+10,
    icon:{k:sl,c:col},bonuses:sl==='accessory'?{[S.at]:n}:(sl==='boots'&&lv>=40?{move:Math.min(14,2+Math.round(lv/25))}:{}),res:el&&(sl==='accessory'||sl==='armor')?{[el]:lvR}:{},ghost:!!S.g,set:S.k,...(S.heal?{tiered:true,tierMin:3,heal:{[S.heal]:HEAL_W[S.heal][sl]}}:{}),
    desc:`Conjunto ${S.n}.${S.heal?(S.heal==='aura'?' Aura: cura aliados num raio de 100 m (só funciona com raridade Raro ou acima).':' Parte do dano que você leva vira cura (só funciona com raridade Raro ou acima).'):''}${S.g?' Cinza e translúcido, como os mortos-vivos.':''} Cai principalmente de: ${who.join(', ')||'—'}.`});
   S.items[sl]=id;SET_OF[id]=S});
  // cordão e mochila de cada conjunto (mochila = mais espaços no inventário)
  {const who=Object.keys(S.mobs).map(m=>MONSTERS[m].name),el=S.el,n=Math.ceil(lv/14)+1;
   add({id:`set_${S.k}_necklace`,name:`Cordão de ${S.n}`,type:'armor',slot:'necklace',rarity:rar,reqLevel:lv,def:Math.max(1,Math.round(defK(lv)*.3)),cls:'melee',sell:Math.round(defK(lv)*lv*1.5)+10,icon:{k:'necklace',c:S.a},bonuses:{[S.at]:n,pre:Math.ceil(lv/40)},res:el?{[el]:lvR_(lv)}:{},ghost:!!S.g,set:S.k,...(S.heal?{tiered:true,tierMin:3,heal:{[S.heal]:HEAL_W[S.heal].necklace}}:{}),
    desc:`Cordão do conjunto ${S.n}. Cai de: ${who.join(', ')}.`});
   S.items.necklace=`set_${S.k}_necklace`;SET_OF[S.items.necklace]=S;
   add({id:`set_${S.k}_backpack`,name:`Mochila de ${S.n}`,type:'armor',slot:'backpack',rarity:rar,reqLevel:lv,def:0,cls:'melee',sell:Math.round(defK(lv)*lv*1.2)+10,icon:{k:'backpack',c:hexMix(S.c,S.a,.3)},bonuses:{},res:{},ghost:!!S.g,set:S.k,bag:BAG_BASE(lv),
    desc:`Mochila do conjunto ${S.n}: +${BAG_BASE(lv)} espaços no inventário (mais com raridade Raro ou acima). Cai de: ${who.join(', ')}.`});
   S.items.backpack=`set_${S.k}_backpack`;SET_OF[S.items.backpack]=S}
  // conjuntos completos por classe: arqueiro (gorro, casaco, calças, botas: velocidade) e mago (chapéu, manto, calças, botas: dano mágico). Escudo só no melee.
  S.vars={};const el=S.el;
  const VN={dist:{helmet:'Capuz Rastreador',armor:'Casaco Rastreador',legs:'Calças Ágeis',boots:'Botas Ágeis'},magic:{helmet:'Chapéu de Mago',armor:'Manto',legs:'Calças Arcanas',boots:'Botas Arcanas'}};
  for(const [cl,sfx] of[['dist','a'],['magic','m']])for(const sl of['helmet','armor','legs','boots']){
   const id=`set_${S.k}_${sl}_${sfx}`,nm=VN[cl][sl]+' de '+S.n,base=Math.round(defK(lv)*W_[sl]),
    base0=sl==='helmet'?hexMix(S.c,'#ffffff',.14):sl==='armor'?S.c:sl==='legs'?hexMix(S.c,'#000000',.16):hexMix(S.c,'#000000',.32),
    col=hexMix(base0,cl==='dist'?'#7a9a4a':S.a,cl==='dist'?.28:.34),dm=cl==='dist'?.72:.55;
   const bon=cl==='dist'
    ?{helmet:{agi:Math.ceil(lv/22),move:Math.max(2,Math.round(lv/28)),atkSpeed:+(.01+lv/3000).toFixed(3)},armor:{agi:Math.ceil(lv/22),move:Math.max(2,Math.round(lv/20)),atkSpeed:+(.015+lv/2000).toFixed(3)},
      legs:{agi:Math.ceil(lv/26),move:Math.max(2,Math.round(lv/24)),atkSpeed:+(.01+lv/3500).toFixed(3)},boots:{agi:Math.ceil(lv/30),move:Math.max(3,Math.round(lv/15)),atkSpeed:+(.008+lv/4000).toFixed(3)}}[sl]
    :{helmet:{int:Math.ceil(lv/22),magDmg:+(.04+lv/1500).toFixed(3)},armor:{int:Math.ceil(lv/22),magDmg:+(.06+lv/1000).toFixed(3)},
      legs:{int:Math.ceil(lv/26),magDmg:+(.04+lv/1800).toFixed(3)},boots:{int:Math.ceil(lv/30),magDmg:+(.03+lv/2200).toFixed(3)}}[sl];
   const who=Object.keys(S.mobs).filter(m=>S.mobs[m].split('').some(ch=>SC[ch]===sl)).map(m=>MONSTERS[m].name);
   add({id,name:nm,type:'armor',slot:sl,rarity:rar,reqLevel:lv,def:Math.max(1,Math.round(base*dm)),cls:cl,var:sfx,sell:Math.round(Math.max(6,defK(lv)*W_[sl])*lv*4)+10,
    icon:{k:sl,c:col},bonuses:bon,res:el&&sl==='armor'?{[el]:lvR_(lv)}:{},ghost:!!S.g,set:S.k,...(S.heal?{tiered:true,tierMin:3,heal:{[S.heal]:HEAL_W[S.heal][sl]}}:{}),
    desc:`${cl==='dist'?'Estilo arqueiro: mais velocidade.':'Estilo mago: mais dano mágico.'} Conjunto ${S.n}. Cai principalmente de: ${who.join(', ')||'—'}.`});
   S.vars[sl+'_'+sfx]=id;SET_OF[id]=S;VAR_OF[id]=cl}
  // arma característica do conjunto: espada, arco e cajado com visual próprio (cores e motivo do conjunto)
  {const mo=WMOTIF[S.k]||'wood',idx=SETS.indexOf(S),dm=wdmgMin(lv),wv={c:S.c,a:S.a,m:S.m,mo,i:idx,lv},who=Object.keys(S.mobs).map(m=>MONSTERS[m].name);S.wpn=[];
   for(const[sty,sl,nm,ik,ms,nn2]of[['melee','weaponMelee','Espada','sword',1000,'sword'],['dist','weaponDist','Arco','bow',1000,'bow'],['magic','weaponMagic','Cajado','wand',1150,'staff']]){
    const id=`set_${S.k}_${nn2}`;add({id,name:`${nm} de ${S.n}`,type:'weapon',slot:sl,style:sty,rarity:rar,reqLevel:lv,dmg:{min:dm,max:Math.round(dm*1.35)},atkMs:ms,sell:Math.round(dm*lv*1.2)+20,icon:{k:ik,c:hexMix(S.c,S.a,.22)},wv,wset:S.k,
     desc:`Arma do conjunto ${S.n}. Cai de: ${who.join(', ')}.`});S.wpn.push(id)}}
  // drops: peças específicas por monstro (boa chance) + as outras peças do conjunto (bem mais raras)
  const pc0=lv<30?.03:lv<100?.02:.013;   // metade da chance antiga: peças de conjunto são especiais
  for(const mid in S.mobs){const m=MONSTERS[mid];if(!m)continue;const prim=new Set(S.mobs[mid].split('').map(ch=>SC[ch])),pc=prim.size>3?pc0*.6:pc0;
   m.drops=(m.drops||[]).filter(d=>{const it=ITEMS[d.id];return!(it&&it.type==='armor'&&['helmet','armor','legs','boots','shield'].includes(it.slot)&&!it.set)});
   const boss5=prim.size>=5;for(const sl of SET_SLOTS)m.drops.push(D(S.items[sl],prim.has(sl)?pc:pc/9,1,1));
   for(const sl of['necklace','backpack'])m.drops.push(D(S.items[sl],boss5?pc:pc/9,1,1));
   for(const vid of Object.values(S.vars)){const sl=ITEMS[vid].slot;m.drops.push(D(vid,prim.has(sl)?pc:pc/9,1,1))}for(const wid of S.wpn)m.drops.push(D(wid,pc0*(boss5?.8:.35),1,1))}}}

// cordões especiais do Imperador do Gelo: Cordão da Cura (dano vira cura) e Cordão do Curandeiro (aura 100 m). Só raridade Raro → Lendário.
add({id:'necklace_cura',name:'Cordão da Cura',type:'armor',slot:'necklace',rarity:'legendary',reqLevel:200,def:20,cls:'melee',sell:60000,icon:{k:'necklace',c:'#ff7a9a'},bonuses:{vit:12},res:{ice:20},tiered:true,tierMin:3,heal:{vital:.03},
 desc:'Cordão do gelo eterno: parte do dano que você leva vira cura (mais com a raridade: Raro → Lendário). Cai do Imperador do Gelo.'});
add({id:'necklace_healer',name:'Cordão do Curandeiro',type:'armor',slot:'necklace',rarity:'legendary',reqLevel:200,def:20,cls:'melee',sell:60000,icon:{k:'necklace',c:'#7dffe0'},bonuses:{int:12},res:{ice:20},tiered:true,tierMin:3,heal:{aura:.012},
 desc:'Cordão do gelo eterno: aura que cura aliados num raio de 100 m (mais com a raridade: Raro → Lendário). Cai do Imperador do Gelo.'});
if(MONSTERS.ice_emperor){MONSTERS.ice_emperor.drops.push(D('necklace_cura',.08,1,1),D('necklace_healer',.08,1,1))}
// grupos de queda: 'skin_drop_a'..'e' viram todas as skins do nível 1..5 (chance dividida)
for(const k in MONSTERS){const m=MONSTERS[k];if(!m.drops)continue;const out=[];
 for(const d of m.drops){const mm=/^skin_drop_([a-e])$/.exec(d.id);if(!mm){out.push(d);continue}const n=mm[1].charCodeAt(0)-96,lst=SKINS.filter(q=>q.n===n);for(const q of lst)out.push(D(q.id,d.chance/lst.length,1,1))}
 m.drops=out}
for(const [k,t] of Object.entries({spider:'a',mushroom:'a',scorpion:'a',golem:'b',icebat:'b',yeti:'b',salamander:'c'})){const n=t.charCodeAt(0)-96,lst=SKINS.filter(q=>q.n===n);for(const q of lst)MONSTERS[k].drops.push(D(q.id,.004/lst.length*3,1,1))}
const skinState=st=>(st.skins||(st.skins={have:{},eq:{}}));
function unlockSkin(st,id){const d=ITEMS[id];if(!d||d.type!=='skin')return{ok:false,err:'noskin'};skinState(st).have[id]=true;return{ok:true}}
function equipSkin(st,slot,id){const S=skinState(st);if(id===null){delete S.eq[slot];return{ok:true}}const d=ITEMS[id];if(!d||d.type!=='skin'||d.skin.slot!==slot)return{ok:false,err:'noskin'};if(!S.have[id])return{ok:false,err:'locked'};S.eq[slot]=id;return{ok:true}}
const skinOf=(st,slot)=>{const S=st&&st.skins;return(S&&S.eq[slot]&&S.have[S.eq[slot]])?S.eq[slot]:null};

/* ============ HABILIDADES / STATUS ============ */
const SKILLS={
 melee:[
  {id:'whirl',name:'Giro',ic:'🌀',req:3,mana:8,cd:5,mult:1.4,radius:4.8,el:'phys',desc:'Gira a lâmina e atinge todos ao redor.'},
  {id:'quake',name:'Golpe Sísmico',ic:'💥',req:8,mana:12,cd:7,mult:1.8,radius:4.2,range:2.8,el:'phys',status:{id:'stun',dur:1},desc:'Pancada em área à frente que atordoa. Segure para carregar: agacha, salta mais alto, causa mais dano em área maior e atordoa até 2s.'},
  {id:'charge',name:'Investida',ic:'⚡',req:14,mana:10,cd:8,mult:1.3,dash:7,el:'phys',desc:'Avança com o escudo e acerta o primeiro alvo.'}],
 dist:[
  {id:'triple',name:'Tripla',ic:'🏹',req:3,mana:10,cd:4,mult:.95,el:'phys',desc:'Três flechas em leque.'},
  {id:'pierce',name:'Flecha Perfurante',ic:'📍',req:8,mana:12,cd:6,mult:1.6,range:26,pierce:4,el:'phys',desc:'Atravessa até 4 alvos em linha. Segure até 3 s para carregar: quanto mais carga, mais dano (até 3× um ataque básico), alcance e alvos atravessados.'},
  {id:'rain',name:'Chuva de Flechas',ic:'🌧️',req:14,mana:20,cd:12,mult:.7,radius:5,ticks:5,el:'phys',desc:'Cobre uma área com flechas por 2,5s.'}],
 magic:[
  {id:'fire',name:'Orbe de Brasas',ic:'🔥',req:3,mana:14,cd:3.6,mult:2,radius:3.6,el:'fire',status:{id:'burn',dur:4,dmgPct:.15},desc:'Esfera de fogo que explode e queima.'},
  {id:'frost',name:'Nova Gélida',ic:'❄️',req:8,mana:18,cd:9,mult:1.1,radius:5.2,el:'ice',status:{id:'slow',dur:3,val:.55},desc:'Segure para carregar: mais dano, área e lentidão. 100% congela por 2s e o gelo se quebra.'},
  {id:'bolt',name:'Raio em Cadeia',ic:'⚡',req:14,mana:22,cd:8,mult:1.5,chain:3,chainRange:6.5,range:21,el:'arcane',desc:'Salta entre inimigos próximos.'}]
};
const STATUS={
 burn:{kind:'dot',tick:1,dur:4,name:'Queimadura',ic:'🔥'},poison:{kind:'dot',tick:1,dur:6,name:'Veneno',ic:'☠️'},
 slow:{kind:'mod',dur:3,name:'Lentidão',ic:'🐌'},stun:{kind:'ctrl',dur:1,name:'Atordoado',ic:'💫'}};
function applyStatus(t,id,val,dur){const d=STATUS[id];if(!d)return;const s=t.statuses||(t.statuses=[]),ex=s.find(x=>x.id===id),nd=dur||d.dur;
 if(ex){ex.t=Math.max(ex.t,nd);ex.val=Math.max(ex.val||0,val||0)}else s.push({id,t:nd,val:val||0,acc:0})}
function tickStatuses(t,dt){const out=[],s=t.statuses;if(!s||!s.length)return out;
 for(let i=s.length-1;i>=0;i--){const x=s[i],d=STATUS[x.id];x.t-=dt;if(d.kind==='dot'){x.acc+=dt;while(x.acc>=d.tick){x.acc-=d.tick;out.push({id:x.id,dmg:Math.max(1,Math.round(x.val))})}}if(x.t<=0)s.splice(i,1)}return out}
/* velocidade por nível: começa em 60% da antiga (−40%) e vai subindo até 130% da antiga (+30%) no nível 1000 */
/* esquiva: barra de cargas que recarrega sozinha; começa com 3 e cresce com o nível (+1 a cada 50, até 12) */
const dashMax=l=>Math.min(12,3+Math.floor(Math.max(1,l||1)/50)),dashRegen=l=>Math.max(2.4,4-(l||1)/300);
const levelSpeed=l=>.6+.7*Math.min(1,(Math.max(1,l||1)-1)/999);
function speedMul(t){let m=1;for(const x of t.statuses||[]){if(x.id==='slow')m=Math.min(m,x.val||.6);if(x.id==='stun')m=0}return m}
const hasStatus=(t,id)=>!!(t.statuses||[]).find(x=>x.id===id);
function cureStatus(t,id){if(t.statuses)t.statuses=t.statuses.filter(x=>x.id!==id)}

/* ============ LOJAS ============ */
const SHOPS={
 merchant:{npc:'merchant',name:'Lojista',stock:[['potion_hp_small',20],['potion_mp_small',20],['potion_hp_med',70],['potion_mp_med',70],['potion_hp_big',200],['potion_mp_big',200],['antidote',40],['scroll_town',80],
  ['armor_tunic',10],['armor_leather',150],['helm_leather_cap',60],['legs_leather',70],['boots_leather',50],['shield_wood',90]]},
 smith:{npc:'smith',name:'Ferreiro Bruno',stock:[['weapon_wood_dagger',20],['weapon_short_bow',20],['weapon_twig_wand',20],['weapon_iron_sword',150],['weapon_long_bow',150],['weapon_oak_wand',150],
  ['helm_iron',300],['boots_iron',250]]}
};
// Economia: os NPCs só vendem o básico. Equipamentos melhores, materiais e skins vêm dos monstros e circulam entre os jogadores (Mercado e Troca).
const shopPrice=(shop,id)=>{const e=SHOPS[shop]&&SHOPS[shop].stock.find(s=>s[0]===id);return e?e[1]:null};

/* ============ MISSÕES ============ */
const QUESTS={
 q_rats:{name:'Pragas na Vila',giver:'guide',reqLevel:1,desc:'Os ratos dos campos estão se aproximando da vila. Elimine 6 deles.',obj:[{k:'kill',mon:'rat',n:6}],reward:{xp:60,gold:40,items:[['potion_hp_small',3]]}},
 q_snakes:{name:'Trilha das Cobras',giver:'guide',reqLevel:3,after:'q_rats',desc:'Explore a Floresta das Cobras e elimine 5 cobras.',obj:[{k:'zone',zone:'Floresta das Cobras'},{k:'kill',mon:'cobra',n:5}],reward:{xp:110,gold:70,items:[['antidote',2]]}},
 q_goblin:{name:'Orelhas de Goblin',giver:'guide',reqLevel:8,after:'q_snakes',desc:'O ferreiro paga bem por orelhas de goblin. Traga 5.',obj:[{k:'collect',item:'mat_goblin_ear',n:5}],reward:{xp:260,gold:140,items:[['shield_iron',1]]}},
 q_smith:{name:'Recado do Ferreiro',giver:'guide',reqLevel:8,after:'q_goblin',desc:'Fale com o Ferreiro Bruno na praça.',obj:[{k:'talk',npc:'smith'}],reward:{xp:150,gold:80,items:[['boots_iron',1]]}},
 q_crypt:{name:'Limpando a Cripta',giver:'guide',reqLevel:20,after:'q_smith',desc:'Entre na Cripta do Horizonte pelo portal e derrote 6 sentinelas.',obj:[{k:'kill',mon:'sentinel',n:6}],reward:{xp:1200,gold:600,items:[['potion_hp_big',3]]}},
 q_boss:{name:'O Guardião do Crepúsculo',giver:'guide',reqLevel:25,after:'q_crypt',desc:'No fundo da cripta, o Guardião protege uma relíquia. Derrote-o.',obj:[{k:'kill',mon:'twilight_guardian',n:1}],reward:{xp:3000,gold:2500,items:[['amulet_precision',1]]}},
 q_relic:{name:'A Relíquia do Eclipse',giver:'guide',reqLevel:25,after:'q_boss',desc:'Dizem que o Guardião guarda a Espada do Eclipse. Obtenha-a.',obj:[{k:'have',item:'weapon_eclipse_sword',n:1}],reward:{xp:2000,gold:5000,items:[]}}
};
for(const id in QUESTS)QUESTS[id].id=id;

/* ============ UIDs ============ */
let UID=1;const mint=()=>'u'+(UID++);
function floorUid(u){const n=parseInt(String(u).slice(1),10);if(n>=UID)UID=n+1}

/* ============ ESTADO DO PERSONAGEM ============ */
const levelXp=l=>l<=60?Math.round(CFG.xpBase*Math.pow(CFG.xpGrow,l-1)):Math.round(CFG.xpBase*Math.pow(CFG.xpGrow,59)*Math.pow(1.065,l-60));   // depois do nível 60 a curva suaviza (senão o nível 150 seria impossível)
/* ECONOMIA: poções médias aparecem nos mobs de nível médio e a quantidade de drops comuns é bem menor (nem todo monstro solta algo) */
{const EARLY=new Set(['bird','slime','rat','cobra']);
 for(const k in MONSTERS){const m=MONSTERS[k];if(EARLY.has(k)||m.boss||m.wb||!m.drops)continue;
  const add=[];for(const e of m.drops){const it=ITEMS[e.id];if(!it)continue;
   if(m.level>=10&&m.level<=70&&(e.id==='potion_hp_small'||e.id==='potion_mp_small')&&!m.drops.some(x=>x.id===e.id.replace('small','med')))add.push(D(e.id.replace('small','med'),e.chance*.5));
   if(it.type==='material'&&e.chance<1)e.chance=+(e.chance*(it.rarity==="common"||it.rarity==="uncommon"?.33:.6)).toFixed(3);
   else if(it.type==='consumable'&&e.chance<1)e.chance=+(e.chance*.5).toFixed(3)}
  m.drops.push(...add)}}
for(const k in MONSTERS){const m=MONSTERS[k];if(m.xpFromLevel)m.xp=Math.max(1,Math.round(levelXp(m.level)/m.xpFromLevel))}
const skillNeed=l=>Math.round(CFG.skillBase*Math.pow(CFG.skillGrow,l));
function newCharacter(name){
 const st={v:CFG.version,name:name||'Herói',level:1,xp:0,gold:30,points:0,attrs:{str:CFG.baseAttr,agi:CFG.baseAttr,int:CFG.baseAttr,vit:CFG.baseAttr,pre:CFG.baseAttr},
  hp:1,mp:1,mode:'melee',sk:{melee:{lv:1,xp:0},dist:{lv:1,xp:0},magic:{lv:1,xp:0},def:{lv:1,xp:0}},
  inv:new Array(CFG.invSlots).fill(null),bank:[],bankGold:0,eq:{},quests:{active:{},done:{}},daily:null,kills:0,deaths:0,txlog:[]};
 for(const s of SLOTS)st.eq[s]=null;
 for(const id of['weapon_wood_dagger','weapon_short_bow','weapon_twig_wand','armor_tunic'])st.eq[ITEMS[id].slot]={uid:mint(),id,qty:1};
 addItem(st,'potion_hp_small',3);addItem(st,'potion_mp_small',2);addItem(st,'scroll_town',1);
 const S=stats(st);st.hp=S.maxHp;st.mp=S.maxMp;return st}

/* ============ ATRIBUTOS DERIVADOS ============ */
const FISTS={min:1,max:2,atkMs:900};
function bonusSum(st){const b={str:0,agi:0,int:0,vit:0,pre:0,def:0,crit:0,atkSpeed:0,move:0,luck:0,dodge:0,magDmg:0,res:{}};
 for(const s of SLOTS){const e=st.eq[s];if(!e)continue;const d=ITEMS[e.id];if(!d)continue;
  const m=tierMul(e);for(const k in d.bonuses)b[k]=(b[k]||0)+d.bonuses[k]*m;b.def+=Math.round((d.def||0)*m);for(const r in d.res)b.res[r]=(b.res[r]||0)+d.res[r]*m}return b}
function healSum(st){const h={aura:0,vital:0};for(const s of SLOTS){const e=st.eq[s],d=e&&ITEMS[e.id];if(!d||!d.heal)continue;const f=HEAL_TF[tierOf(e)]||0;for(const k in d.heal)h[k]+=d.heal[k]*f}
 for(const k in h)h[k]=Math.min(HEAL_CAP[k],h[k]);return h}
/* ---- mochila: o inventário cresce com a mochila equipada ---- */
const INV_MAX=CFG.invSlots+40;
const bagExtra=e=>{const d=e&&ITEMS[e.id];return d&&d.bag?Math.min(40,Math.round(d.bag*tierMul(e))):0};
const invTarget=st=>CFG.invSlots+bagExtra(st.eq.backpack);
function fitInv(st){const n=invTarget(st);if(st.inv.length<n){while(st.inv.length<n)st.inv.push(null);return true}if(st.inv.length>n){for(let i=n;i<st.inv.length;i++)if(st.inv[i])return false;st.inv.length=n}return true}
function stats(st){const b=bonusSum(st),A={};for(const k of['str','agi','int','vit','pre'])A[k]=st.attrs[k]+b[k];
 const lv=st.level,maxHp=40+A.vit*6+lv*8,maxMp=16+A.int*3+lv*4;
 const atkSpeed=Math.min(CFG.atkSpeedCap,1+A.agi*.008+b.atkSpeed);
 const crit=Math.min(CFG.critCap,.03+A.pre*.004+A.agi*.002+b.crit);
 const dodge=Math.min(CFG.dodgeCap,A.agi*.003+b.dodge);
 const moveMul=1+Math.min(CFG.moveCap,A.agi*.002+b.move*.01);
 const def=b.def+A.vit*.4+st.sk.def.lv*.6;
 const res={};for(const r in b.res)res[r]=Math.min(CFG.resCap,b.res[r]);
 const weapon={};for(const s of STYLES){const e=st.eq['weapon'+cap(s)],d=e&&ITEMS[e.id],w=d?{min:Math.round(d.dmg.min*tierMul(e)),max:Math.round(d.dmg.max*tierMul(e)),atkMsBase:d.atkMs,uid:e.uid,id:e.id}:{min:FISTS.min,max:FISTS.max,atkMsBase:FISTS.atkMs,uid:null,id:null};
  w.atkMs=Math.max(CFG.minAtkMs,Math.round(w.atkMsBase/atkSpeed));weapon[s]=w}
 return{A,maxHp,maxMp,def,atkSpeed,crit,dodge,moveMul,res,luck:b.luck,magDmg:b.magDmg,weapon,heal:healSum(st)}}
function rollHit(st,style,mult,rng){const S=stats(st),w=S.weapon[style],base=w.min+Math.floor(rng()*(w.max-w.min+1));
 let raw=(base*(1+S.A[STYLE_ATTR[style]]*.02)+st.sk[style].lv*.5+st.level*.2)*(mult||1);const crit=rng()<S.crit;if(style==='magic')raw*=1+(S.magDmg||0);if(crit)raw*=CFG.critMult;return{raw,crit,base}}
function elementMult(mon,el){const r=(mon.res&&mon.res[el])||0;return 1-r/100}
function dmgToMonster(raw,mon,el){const m=elementMult(mon,el||'phys');if(m<=0)return 0;return Math.max(1,Math.round(raw*m*100/(100+mon.def*CFG.mitigationK_monster)))}
function monsterHit(st,mon,rng,S){S=S||stats(st);if(rng()<S.dodge)return{dodged:true,dmg:0,element:mon.element};
 const el=mon.element||'phys',raw=mon.atk*(.6+.4*rng()),res=el==='phys'?0:(S.res[el]||0);
 return{dodged:false,element:el,dmg:Math.max(1,Math.round(raw*(1-res/100)*100/(100+S.def*CFG.mitigationK_player)))}}
function xpFor(mon,lv){const over=lv-mon.level-10;return Math.max(1,Math.round(mon.xp*(over>0?Math.max(.1,1-over*.05):1)))}
function gainXp(st,amt){let ups=0;st.xp+=Math.max(0,amt|0);let need;while(st.xp>=(need=levelXp(st.level))){st.xp-=need;st.level++;st.points+=CFG.attrPointsPerLevel;ups++}return ups}
function gainSkill(st,key,amt){const s=st.sk[key];s.xp+=amt*CFG.skillGain;   // habilidades sobem 15% mais devagar
 let ups=0,need;while(s.xp>=(need=skillNeed(s.lv))){s.xp-=need;s.lv++;ups++}return ups}
function spendPoint(st,attr){if(!['str','agi','int','vit','pre'].includes(attr))return{ok:false,err:'attr'};if(st.points<1)return{ok:false,err:'points'};st.points--;st.attrs[attr]++;return{ok:true}}
function deathPenalty(st){const lost=Math.floor(st.gold*CFG.deathGoldLoss);st.gold-=lost;st.deaths++;return lost}

/* ============ INVENTÁRIO ============ */
const stackMax=id=>(ITEMS[id]&&ITEMS[id].stack)||1;
function roomFor(st,id){const m=stackMax(id);let room=0;for(const e of st.inv){if(!e)room+=m;else if(m>1&&e.id===id)room+=m-e.qty}return room}
const freeSlots=st=>st.inv.reduce((a,e)=>a+(e?0:1),0);
function addItem(st,id,qty,keepUid,tier){
 if(!ITEMS[id]||!Number.isInteger(qty)||qty<1||qty>9999)return{ok:false,err:'invalid',added:0,left:qty|0};
 const m=stackMax(id);let left=qty;
 if(m>1)for(const e of st.inv){if(left<=0)break;if(e&&e.id===id&&e.qty<m){const t=Math.min(m-e.qty,left);e.qty+=t;left-=t}}
 for(let i=0;i<st.inv.length&&left>0;i++){if(!st.inv[i]){const t=Math.min(m,left);st.inv[i]=Object.assign({uid:(m===1&&keepUid)?keepUid:mint(),id,qty:t},(m===1&&tier&&needsTier(ITEMS[id]))?{t:tier|0}:{});left-=t}}
 return{ok:left<qty,added:qty-left,left}}
function addAll(st,id,qty,keepUid,tier){if(!ITEMS[id]||!Number.isInteger(qty)||qty<1||roomFor(st,id)<qty)return{ok:false,err:'full'};return addItem(st,id,qty,keepUid,tier)}
const findUid=(st,uid)=>st.inv.findIndex(e=>e&&e.uid===uid);
function removeUid(st,uid,qty){const i=findUid(st,uid);if(i<0)return{ok:false,err:'notfound'};const e=st.inv[i];
 if(!Number.isInteger(qty)||qty<1||qty>e.qty)return{ok:false,err:'qty'};const out={uid:e.uid,id:e.id,qty};if(e.t)out.t=e.t;
 if(qty===e.qty)st.inv[i]=null;else e.qty-=qty;return{ok:true,item:out}}
/* ============ BANCO (Cidade 2) ============ */
const BANK_SLOTS=60;
function bankDeposit(st,uid,qty){const i=findUid(st,uid);if(i<0)return{ok:false,err:'Item não encontrado.'};const e=st.inv[i];qty=Math.max(1,Math.min(e.qty,qty|0||1));
 const m=stackMax(e.id);let left=qty;const slots=st.bank.slice();let free=BANK_SLOTS-st.bank.length;
 if(m>1)for(const b of st.bank)if(b.id===e.id)left-=Math.min(m-b.qty,left);
 if(left>0&&Math.ceil(left/m)>free)return{ok:false,err:'Banco cheio.'};
 const keep=e.uid;removeUid(st,uid,qty);left=qty;
 if(m>1)for(const b of st.bank){if(b.id===e.id&&b.qty<m&&left>0){const t=Math.min(m-b.qty,left);b.qty+=t;left-=t}}
 while(left>0){const t=Math.min(m,left);st.bank.push(Object.assign({uid:(m===1?keep:mint()),id:e.id,qty:t},(m===1&&e.t)?{t:e.t}:{}));left-=t}
 return{ok:true,id:e.id,qty}}
function bankWithdraw(st,uid,qty){const i=st.bank.findIndex(b=>b.uid===uid);if(i<0)return{ok:false,err:'Item não está no banco.'};const b=st.bank[i];qty=Math.max(1,Math.min(b.qty,qty|0||1));
 if(roomFor(st,b.id)<qty)return{ok:false,err:'Mochila cheia.'};
 addItem(st,b.id,qty,b.uid,b.t);if(qty>=b.qty)st.bank.splice(i,1);else b.qty-=qty;return{ok:true,id:b.id,qty}}
function bankGoldMove(st,amt,dir){amt=Math.floor(Number(amt));if(!(amt>0))return{ok:false,err:'Valor inválido.'};
 if(dir==='in'){if(st.gold<amt)return{ok:false,err:'Ouro insuficiente.'};st.gold-=amt;st.bankGold+=amt}
 else{if(st.bankGold<amt)return{ok:false,err:'Saldo insuficiente.'};if(st.gold+amt>CFG.goldCap)return{ok:false,err:'Limite de ouro.'};st.bankGold-=amt;st.gold+=amt}return{ok:true}}
function moveSlot(st,from,to){const n=st.inv.length;if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=n||to>=n||from===to)return{ok:false,err:'slot'};
 const a=st.inv[from],b=st.inv[to];if(!a)return{ok:false,err:'empty'};
 if(b&&a.id===b.id&&stackMax(a.id)>1){const t=Math.min(stackMax(a.id)-b.qty,a.qty);b.qty+=t;a.qty-=t;if(a.qty<=0)st.inv[from]=null}
 else{st.inv[from]=b;st.inv[to]=a}return{ok:true}}
function splitStack(st,uid,qty){const i=findUid(st,uid);if(i<0)return{ok:false,err:'notfound'};const e=st.inv[i];
 if(!Number.isInteger(qty)||qty<1||qty>=e.qty)return{ok:false,err:'qty'};const f=st.inv.indexOf(null);if(f<0)return{ok:false,err:'full'};
 e.qty-=qty;st.inv[f]={uid:mint(),id:e.id,qty};return{ok:true}}
let IGNORE_REQ=false;const setIgnoreReq=v=>{IGNORE_REQ=!!v};   // modo de teste: equipar qualquer item
function meetsReq(st,d){if(IGNORE_REQ)return{ok:true};if(st.level<(d.reqLevel||0))return{ok:false,err:'level',need:d.reqLevel};
 for(const k in d.reqAttr||{})if(st.attrs[k]<d.reqAttr[k])return{ok:false,err:'attr',need:d.reqAttr[k],attr:k};return{ok:true}}
function equip(st,uid){const i=findUid(st,uid);if(i<0)return{ok:false,err:'notfound'};const e=st.inv[i],d=ITEMS[e.id];
 if(!d||(d.type!=='weapon'&&d.type!=='armor'))return{ok:false,err:'notequip'};const r=meetsReq(st,d);if(!r.ok)return r;
 const prev=st.eq[d.slot];st.eq[d.slot]=e;st.inv[i]=prev||null;
 if(d.slot==='backpack'&&!fitInv(st)){st.eq[d.slot]=prev||null;st.inv[i]=e;return{ok:false,err:'bagfull'}}
 return{ok:true,slot:d.slot}}
function unequip(st,slot){if(!SLOTS.includes(slot))return{ok:false,err:'slot'};const e=st.eq[slot];if(!e)return{ok:false,err:'empty'};
 const f=slot==='backpack'?st.inv.findIndex((x,i)=>!x&&i<CFG.invSlots):st.inv.indexOf(null);if(f<0)return{ok:false,err:'full'};st.inv[f]=e;st.eq[slot]=null;
 if(slot==='backpack'&&!fitInv(st)){st.eq[slot]=e;st.inv[f]=null;return{ok:false,err:'bagfull'}}return{ok:true}}
function useItem(st,uid){const i=findUid(st,uid);if(i<0)return{ok:false,err:'notfound'};const e=st.inv[i],d=ITEMS[e.id];if(!d||(d.type!=='consumable'&&d.type!=='skin'))return{ok:false,err:'notuse'};
 if(d.type==='skin'){if(skinState(st).have[d.id])return{ok:false,err:'have'};unlockSkin(st,d.id);st.inv[i]=null;return{ok:true,fx:{skin:d.id},id:d.id}}
 if(--e.qty<=0)st.inv[i]=null;return{ok:true,fx:d.fx,id:d.id}}
function logTx(st,t){st.txlog.push(Object.assign({t:Date.now()},t));if(st.txlog.length>CFG.txLogMax)st.txlog.shift()}
const SELL_PCT={common:.10,uncommon:.12,rare:.15,epic:.30};   // ultra (amarelo) e lendária (branco) não podem ser vendidas
function sellPrice(d,e){const p=SELL_PCT[(e&&needsTier(d))?effRarity(e):d.rarity];return(!p||!d.sell||d.sell<1)?0:Math.max(1,Math.floor(d.sell*p))}
function sellItem(st,uid,qty){const i=findUid(st,uid);if(i<0)return{ok:false,err:'notfound'};const e=st.inv[i],d=ITEMS[e.id];
 if(!Number.isInteger(qty)||qty<1||qty>e.qty)return{ok:false,err:'qty'};if(!sellPrice(d,e))return{ok:false,err:'nosell'};
 const total=sellPrice(d,e)*qty;if(st.gold+total>CFG.goldCap)return{ok:false,err:'cap'};
 const r=removeUid(st,uid,qty);if(!r.ok)return r;st.gold+=total;logTx(st,{k:'sell',id:d.id,qty,gold:total});return{ok:true,gold:total}}
function buyItem(st,shop,id,qty){const price=shopPrice(shop,id);if(price===null)return{ok:false,err:'nostock'};
 if(!Number.isInteger(qty)||qty<1||qty>200)return{ok:false,err:'qty'};const total=price*qty;if(st.gold<total)return{ok:false,err:'gold'};
 if(roomFor(st,id)<qty)return{ok:false,err:'full'};
 st.gold-=total;addItem(st,id,qty);logTx(st,{k:'buy',shop,id,qty,gold:-total});return{ok:true,gold:-total}}
function countItem(st,id){let n=0;for(const e of st.inv)if(e&&e.id===id)n+=e.qty;return n}
function countAnywhere(st,id){let n=countItem(st,id);for(const s of SLOTS)if(st.eq[s]&&st.eq[s].id===id)n++;return n}
function removeItems(st,id,qty){let left=qty;for(let i=0;i<st.inv.length&&left>0;i++){const e=st.inv[i];if(e&&e.id===id){const t=Math.min(left,e.qty);e.qty-=t;left-=t;if(e.qty<=0)st.inv[i]=null}}return left===0}

/* ============ DROPS ============ */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
/* Modelo: cada entrada é um sorteio INDEPENDENTE (Bernoulli). p = base × (1 + sorte) × evento,
   com sorte limitada a +25% relativo e teto absoluto de 2,5× a base (e nunca acima de 1). */
function dropChance(entry,ctx){const p=entry.chance;if(p>=1)return 1;
 const luck=Math.min(CFG.luckMaxRel,Math.max(0,(ctx.luck||0)/100));let mult=1+luck;
 const rar=entry.rarity||(ITEMS[entry.id]&&ITEMS[entry.id].rarity);
 for(const e of ctx.events||[]){const ev=EVENTS[e];if(!ev)continue;if(ev.only&&!ev.only.includes(ctx.monsterId))continue;if(ev.mult&&ev.mult[rar])mult*=ev.mult[rar]}
 return Math.min(1,p*mult,p*CFG.dropChanceCapRel*(1+CFG.luckMaxRel))}
function rollDrops(monsterId,ctx){ctx=Object.assign({},ctx);const mon=MONSTERS[monsterId];if(!mon)return{gold:0,items:[]};const rng=ctx.rng||Math.random;ctx.monsterId=monsterId;
 const gold=mon.gold[0]+Math.floor(rng()*(mon.gold[1]-mon.gold[0]+1)),items=[];
 for(const e of mon.drops){if(e.cond&&e.cond.event&&!(ctx.events||[]).includes(e.cond.event))continue;
  if(rng()<dropChance(e,ctx)){const q=e.min+Math.floor(rng()*(e.max-e.min+1)),o={id:e.id,qty:q};if(needsTier(ITEMS[e.id]))o.t=rollTier(rng,(mon.boss||mon.wb)?1.6:1,ITEMS[e.id].tierMin);items.push(o)}}
 return{gold,items}}
function simulateDrops(monsterId,n,rng,ctx){const counts={},rolls=Object.assign({},ctx,{rng});let gold=0;
 for(let i=0;i<n;i++){const r=rollDrops(monsterId,rolls);gold+=r.gold;for(const it of r.items)counts[it.id]=(counts[it.id]||0)+it.qty}
 const rate={};for(const id in counts)rate[id]=counts[id]/n;return{n,counts,rate,avgGold:gold/n}}
function isEligible(mon,dmgDealt){const min=(mon.boss||mon.wb)?CFG.bossEligibleMinDmgPct:CFG.eligibleMinDmgPct;return dmgDealt>0&&dmgDealt>=mon.hp*min}

/* ---- itens no chão ---- */
function newGround(){return{items:[],seq:1,audit:[]}}
const GROUND_TTL={uncommon:150000,rare:150000,epic:180000,ultra:300000,legendary:600000};
// tempo no chão: sem fundo de raridade 2 min · verde/azul 2:30 · roxo 3 min · amarelo 5 min · branco 10 min
const groundTtl=(id,t)=>{const d=ITEMS[id];if(needsTier(d))return GROUND_TTL[tierOf({id,t})>0?TIERS[tierOf({id,t})].k:d.rarity]||120000;return d&&rarityShown(id)&&GROUND_TTL[d.rarity]||120000};
function groundSpawn(g,inst,x,z,reg,owner,now,opt){opt=opt||{};const it={gid:g.seq++,inst:Object.assign({uid:inst.uid||mint(),id:inst.id,qty:inst.qty},inst.t?{t:inst.t|0}:{}),x,z,reg:reg||'world',owner:owner||null,t0:now,ttl:groundTtl(inst.id,inst.t),team:opt.team||null,ownUntil:owner?now+(opt.ownMs||CFG.ownerMs):0};
 g.items.push(it);while(g.items.length>CFG.groundMax)g.items.shift();return it}
function spawnKillDrops(g,monsterId,pos,owner,now,ctx){const r=rollDrops(monsterId,ctx),out=[],rng=(ctx&&ctx.rng)||Math.random;
 for(const d of r.items){const it=groundSpawn(g,{uid:mint(),id:d.id,qty:d.qty,t:d.t},pos.x+(rng()-.5)*2,pos.z+(rng()-.5)*2,pos.reg,owner,now,{team:ctx&&ctx.team});out.push(it);
  if(['epic','ultra','legendary'].includes(effRarity({id:d.id,t:d.t})))g.audit.push({t:now,monster:monsterId,id:d.id,uid:it.inst.uid,owner})}
 return{gold:r.gold,ground:out}}
function groundExpire(g,now){const b=g.items.length;g.items=g.items.filter(i=>now-i.t0<(i.ttl||CFG.groundTtlMs));return b-g.items.length}
function groundPickup(g,st,gid,who,pos,now){const i=g.items.findIndex(x=>x.gid===gid);if(i<0)return{ok:false,err:'gone'};const it=g.items[i];
 if(now-it.t0>=(it.ttl||CFG.groundTtlMs)){g.items.splice(i,1);return{ok:false,err:'expired'}}
 if(it.owner&&it.owner!==who&&!(it.team&&it.team.includes(who))&&now<it.ownUntil)return{ok:false,err:'owned'};
 if((pos.reg||'world')!==it.reg)return{ok:false,err:'region'};
 if(Math.hypot(pos.x-it.x,pos.z-it.z)>CFG.pickupRange)return{ok:false,err:'far'};
 const d=ITEMS[it.inst.id],q=it.inst.qty;if(roomFor(st,d.id)<1)return{ok:false,err:'full'};
 const take=Math.min(q,roomFor(st,d.id)),r=addItem(st,d.id,take,take===q?it.inst.uid:null,it.inst.t);if(!r.added)return{ok:false,err:'full'};
 if(r.added>=q)g.items.splice(i,1);else it.inst.qty=q-r.added;return{ok:true,id:d.id,qty:r.added,partial:r.added<q}}

/* ============ MISSÕES (lógica) ============ */
function questAvailable(st,id){const q=QUESTS[id];if(!q||st.quests.done[id]||st.quests.active[id])return false;if(st.level<q.reqLevel)return false;if(q.after&&!st.quests.done[q.after])return false;return true}
function acceptQuest(st,id){if(!questAvailable(st,id))return{ok:false,err:'unavailable'};st.quests.active[id]={p:QUESTS[id].obj.map(()=>0)};return{ok:true}}
function objProgress(st,q,qs,i){const o=q.obj[i];if(o.k==='collect')return Math.min(o.n,countItem(st,o.item));if(o.k==='have')return Math.min(o.n,countAnywhere(st,o.item));return Math.min(o.n||1,qs.p[i]||0)}
function questStatus(st,id){const q=QUESTS[id],qs=st.quests.active[id];if(!qs)return null;
 const rows=q.obj.map((o,i)=>({o,have:objProgress(st,q,qs,i),need:o.n||1}));return{rows,done:rows.every(r=>r.have>=r.need)}}
function questEvent(st,ev){const changed=[];for(const id in st.quests.active){const q=QUESTS[id],qs=st.quests.active[id];
 q.obj.forEach((o,i)=>{if(o.k==='kill'&&ev.k==='kill'&&ev.mon===o.mon&&qs.p[i]<o.n){qs.p[i]++;changed.push(id)}
  else if(o.k==='zone'&&ev.k==='zone'&&ev.zone===o.zone&&!qs.p[i]){qs.p[i]=1;changed.push(id)}
  else if(o.k==='talk'&&ev.k==='talk'&&ev.npc===o.npc&&!qs.p[i]){qs.p[i]=1;changed.push(id)}})}
 return changed}
function turnInQuest(st,id){const q=QUESTS[id],s=questStatus(st,id);if(!s)return{ok:false,err:'inactive'};if(!s.done)return{ok:false,err:'incomplete'};
 // simula numa cópia para garantir espaço (contando os itens que serão consumidos)
 const tmp={inv:JSON.parse(JSON.stringify(st.inv))};
 for(const o of q.obj)if(o.k==='collect')removeItems(tmp,o.item,o.n);
 for(const[iid,n]of q.reward.items||[]){if(roomFor(tmp,iid)<n)return{ok:false,err:'full'};addItem(tmp,iid,n)}
 for(const o of q.obj)if(o.k==='collect')removeItems(st,o.item,o.n);
 for(const[iid,n]of q.reward.items||[])addItem(st,iid,n);
 st.gold=Math.min(CFG.goldCap,st.gold+(q.reward.gold||0));const ups=gainXp(st,q.reward.xp||0);
 delete st.quests.active[id];st.quests.done[id]=true;return{ok:true,ups,reward:q.reward}}

/* ============ CHEFE ============ */
const bossPhase=pct=>pct>.66?1:pct>.33?2:3;

/* ============ PERSISTÊNCIA ============ */
/* ---------- Diário: recompensa de login (sequência de 7 dias) + 3 metas por dia ---------- */
const dayNum=k=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(k||'');return m?Math.floor(Date.UTC(+m[1],+m[2]-1,+m[3])/864e5):null};
function dayKey(ms){const d=new Date(ms);const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
function dailyRng(seed){let h=2166136261;for(const ch of String(seed)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}let a=h>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function loginRewardFor(day,lv){const g=Math.round((150+lv*30)*day*(day===7?2:1));
 const it=[['potion_hp_small',3+day],['potion_mp_small',2+day]];if(day>=3)it.push(['potion_hp_big',day>=7?5:2]);if(day>=5)it.push(['antidote',3]);if(day===7)it.push(['potion_mp_small',10]);
 return{gold:g,xp:Math.round(levelXp(lv)*(.03+day*.012)),items:it}}
function newDailyState(){return{key:'',streak:0,last:'',claimed:false,q:[],bonus:false}}
function dailyGen(st,key){const R=dailyRng(key+':'+st.name),lv=st.level,mk=(k,n,extra)=>Object.assign({k,n,p:0,c:false},extra||{});
 const q=[mk('kills',30+Math.floor(R()*21))];
 const pool=Object.keys(MONSTERS).filter(id=>{const d=MONSTERS[id];return !d.boss&&!d.wb&&id!=='sentinel'&&d.level<=lv+3&&d.level>=Math.max(1,lv-18)});
 const id=pool.length?pool[Math.floor(R()*pool.length)]:'rat';q.push(mk('killtype',12+Math.floor(R()*9),{id}));
 const r3=R();q.push(lv>=20&&r3<.3?mk('boss',1):r3<.65?mk('gold',300+lv*30+Math.floor(R()*5)*50):mk('loot',6+Math.floor(R()*5)));
 for(const x of q){x.r={gold:Math.round(120+lv*22+(x.k==='boss'?lv*60:0)),xp:Math.round(levelXp(lv)*(x.k==='boss'?.1:.05)),items:[['potion_hp_small',2],...(x.k==='boss'?[['potion_hp_big',2]]:[])]}}
 return q}
function dailyTick(st,key){if(!st.daily)st.daily=newDailyState();const d=st.daily;if(d.key===key)return false;d.key=key;d.claimed=false;d.bonus=false;d.q=dailyGen(st,key);
 const gap=dayNum(key)-dayNum(d.last);if(d.last&&Number.isFinite(gap)&&gap>1)d.streak=0;return true}
function dailyNextDay(st){const d=st.daily||newDailyState();if(d.claimed)return(d.streak-1)%7+1;const gap=dayNum(d.key)-dayNum(d.last);return(d.last&&gap===1)?d.streak%7+1:1}
function dailyEvent(st,ev){const d=st.daily;if(!d||!d.q)return[];const done=[];
 for(const x of d.q){if(x.p>=x.n)continue;let add=0;
  if(x.k==='kills'&&ev.k==='kill')add=1;else if(x.k==='killtype'&&ev.k==='kill'&&ev.id===x.id)add=1;else if(x.k==='boss'&&ev.k==='kill'&&ev.boss)add=1;else if(x.k==='gold'&&ev.k==='gold')add=ev.n|0;else if(x.k==='loot'&&ev.k==='loot')add=ev.n||1;
  if(add>0){x.p=Math.min(x.n,x.p+add);if(x.p>=x.n)done.push(x)}}
 return done}
function dailyGrant(st,r){
 st.gold=Math.min(CFG.goldCap,st.gold+(r.gold|0));if(r.xp)gainXp(st,r.xp);for(const[id,n]of r.items)if(ITEMS[id])addItem(st,id,n);return true}
function dailyClaim(st,which){const d=st.daily;if(!d)return{ok:false,err:'none'};if(freeSlots(st)<5)return{ok:false,err:'full'};
 if(which==='login'){if(d.claimed)return{ok:false,err:'done'};const gap=dayNum(d.key)-dayNum(d.last);d.streak=(d.last&&gap===1)?d.streak+1:1;d.last=d.key;d.claimed=true;const day=(d.streak-1)%7+1,r=loginRewardFor(day,st.level);dailyGrant(st,r);return{ok:true,reward:r,day,streak:d.streak}}
 if(which==='bonus'){if(d.bonus||!d.q.length||!d.q.every(x=>x.c))return{ok:false,err:'notyet'};d.bonus=true;const r={gold:Math.round((150+st.level*22)*3),xp:Math.round(levelXp(st.level)*.15),items:[['potion_hp_big',3],['potion_mp_small',5]]};dailyGrant(st,r);return{ok:true,reward:r}}
 const x=d.q[which|0];if(!x)return{ok:false,err:'none'};if(x.c)return{ok:false,err:'done'};if(x.p<x.n)return{ok:false,err:'notyet'};x.c=true;dailyGrant(st,x.r);return{ok:true,reward:x.r}}
function cleanDaily(o){const d=newDailyState();if(!o||typeof o!=='object')return d;d.key=/^\d{4}-\d{2}-\d{2}$/.test(o.key)?o.key:'';d.last=/^\d{4}-\d{2}-\d{2}$/.test(o.last)?o.last:'';d.streak=clampInt(o.streak,0,99999,0);d.claimed=!!o.claimed;d.bonus=!!o.bonus;
 if(Array.isArray(o.q))d.q=o.q.slice(0,3).filter(x=>x&&['kills','killtype','boss','gold','loot'].includes(x.k)).map(x=>({k:x.k,n:clampInt(x.n,1,1e7,1),p:clampInt(x.p,0,1e7,0),c:!!x.c,id:(x.k==='killtype'&&MONSTERS[x.id])?x.id:undefined,r:{gold:clampInt(x.r&&x.r.gold,0,1e9,0),xp:clampInt(x.r&&x.r.xp,0,1e12,0),items:((x.r&&x.r.items)||[]).slice(0,6).filter(a=>Array.isArray(a)&&ITEMS[a[0]]).map(a=>[a[0],clampInt(a[1],1,99,1)])}}));
 for(const x of d.q)if(x.p>x.n)x.p=x.n;return d}
function serialize(st){return JSON.parse(JSON.stringify(st))}
const clampInt=(v,a,b,d)=>{v=Math.floor(Number(v));return Number.isFinite(v)?Math.max(a,Math.min(b,v)):d};
function cleanInst(e){if(!e||!ITEMS[e.id])return null;const q=clampInt(e.qty,1,stackMax(e.id),1);const uid=typeof e.uid==='string'&&/^u\d+$/.test(e.uid)?e.uid:mint();floorUid(uid);const o={uid,id:e.id,qty:q};if(needsTier(ITEMS[e.id])&&(e.t|0)>=1&&(e.t|0)<=6)o.t=e.t|0;return o}
function deserialize(o){if(!o||typeof o!=='object'||!o.level)return null;const st=newCharacter(o.name);
 st.inv=new Array(CFG.invSlots).fill(null);for(const s of SLOTS)st.eq[s]=null;st.txlog=[];
 st.level=clampInt(o.level,1,999,1);st.xp=clampInt(o.xp,0,1e15,0);
 if(Array.isArray(o.market)){st.market=o.market.slice(0,MARKET_MAX).filter(l=>l&&ITEMS[l.id]).map(l=>({lid:typeof l.lid==='string'&&/^u\d+$/.test(l.lid)?l.lid:mint(),id:l.id,qty:clampInt(l.qty,1,stackMax(l.id),1),price:clampInt(l.price,1,1e9,1)}));st.market.forEach(l=>floorUid(l.lid))}
 if(o.skins&&typeof o.skins==='object'){const S=skinState(st);for(const id in (o.skins.have||{}))if(ITEMS[id]&&ITEMS[id].type==='skin')S.have[id]=true;for(const sl in (o.skins.eq||{})){const id=o.skins.eq[sl];if(ITEMS[id]&&ITEMS[id].type==='skin'&&ITEMS[id].skin.slot===sl&&S.have[id])S.eq[sl]=id}}
st.rst=clampInt(o.rst,0,99,0);st.gold=clampInt(o.gold,0,CFG.goldCap,0);st.points=clampInt(o.points,0,9999,0);
 for(const k of['str','agi','int','vit','pre'])st.attrs[k]=clampInt(o.attrs&&o.attrs[k],1,999,CFG.baseAttr);
 for(const k of['melee','dist','magic','def']){const s=(o.sk&&o.sk[k])||{};st.sk[k]={lv:clampInt(s.lv,1,999,1),xp:clampInt(s.xp,0,1e9,0)}}
 st.daily=cleanDaily(o.daily);st.mode=STYLES.includes(o.mode)?o.mode:'melee';st.kills=clampInt(o.kills,0,1e9,0);st.deaths=clampInt(o.deaths,0,1e9,0);
 const seen=new Set();
 {const bp=cleanInst(o.eq&&o.eq.backpack),bd=bp&&ITEMS[bp.id].slot==='backpack'?bagExtra(bp):0;st.inv=new Array(CFG.invSlots+bd).fill(null)}
 (o.inv||[]).slice(0,st.inv.length).forEach((e,i)=>{const c=cleanInst(e);if(c&&!seen.has(c.uid)){seen.add(c.uid);st.inv[i]=c}});
 for(const s of SLOTS){const c=cleanInst(o.eq&&o.eq[s]);if(c&&ITEMS[c.id].slot===s&&!seen.has(c.uid)){seen.add(c.uid);c.qty=1;st.eq[s]=c}}
 for(const id in((o.quests&&o.quests.active)||{}))if(QUESTS[id]){const p=o.quests.active[id].p;st.quests.active[id]={p:QUESTS[id].obj.map((_,i)=>clampInt(p&&p[i],0,9999,0))}}
 for(const id in((o.quests&&o.quests.done)||{}))if(QUESTS[id])st.quests.done[id]=true;
 st.bankGold=clampInt(o.bankGold,0,1e12,0);st.bank=[];(o.bank||[]).slice(0,BANK_SLOTS).forEach(e=>{const c=cleanInst(e);if(c&&!seen.has(c.uid)){seen.add(c.uid);st.bank.push(c)}});
 (o.txlog||[]).slice(-CFG.txLogMax).forEach(t=>st.txlog.push(t));
 const S=stats(st);st.hp=clampInt(o.hp,1,S.maxHp,S.maxHp);st.mp=clampInt(o.mp,0,S.maxMp,S.maxMp);return st}

/* ============ CHAT ============ */
/* Filtro de chat. GRAVE (bloqueia a mensagem e silencia o autor no servidor): conteúdo sexual explícito, ofensas pesadas, preconceito, ameaças.
   LEVE (só vira ***, sem punição): palavrões comuns e xingamentos leves. Tolera maiúsculas, acentos, números no lugar de letras (p0rr4),
   letras repetidas (puuuta), letras separadas (p u t a) e frases coladas. */
const _SEV=['puta','putas','putinha','putaria','putao','puto','putos','vadia','vagabunda','piranha','buceta','bucetao','xereca','xoxota','ppk','pepeca','punheta','siririca','boquete','tesao','nudes','porn','porno','pornografia','pornhub','xvideos','estupro','estuprar','estuprador','estuprei','pedofilo','pedofilia','crioulo','crioula','viado','viadinho','viadao','bichona','sapatao','traveco','baitola','retardado','retardada','mongoloide','arrombado','arrombada','cuzao','cuzona','cu','fdp','vtnc','tnc','fuck','fucking','fucker','shit','shitty','bitch','asshole','cunt','whore','slut','nigger','nigga','faggot','fag','retard','rapist','pussy','dick','dickhead'];
const _SEVJ=['filhodaputa','filhadaputa','vaisefoder','vasefoder','vaitomarnocu','tomanocu','tomarnocu','voutematar','vouteesfaquear','vouteesganar','temato','vaisematar','vasematar','sematar','matavoce','tecomo','comiatuamae','comeutuamae','fuckyou','killyourself','kys'];
const _MILD=['porra','caralho','merda','bosta','foda','fodase','fodasse','foder','fodido','fodida','cacete','idiota','imbecil','babaca','otario','otaria','lixo','cretino','cretina','desgracado','desgracada','krl','crl','pqp','burro','burra'];
const _sq=w=>w.replace(/(.)\1+/g,'$1');
const _SEVS=new Set(_SEV.map(_sq)),_MILDS=new Set(_MILD.map(_sq)),_SEVJS=_SEVJ.map(_sq);
function _norm(t){return String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[0134578@$]/g,c=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','8':'b','@':'a','$':'s'})[c])}
const _OKW=new Set(['fagote','fagotes','putrefato','dickens']);   // palavras normais parecidas com termos da lista
function _hit(set,tok){const q=_sq(tok);if(!q||_OKW.has(q))return false;if(set.has(q))return true;for(const w of set)if(w.length>=5&&q.startsWith(w)&&q.length<=w.length+4)return true;return false}
function chatSevere(t){let n=_norm(t);
 n=n.replace(/(?:^|[^a-z])((?:[a-z][\s.\-_*,]+){2,}[a-z])(?![a-z])/g,(m,g)=>m.replace(g,g.replace(/[^a-z]/g,'')));   // "p u t a" -> "puta"
 for(const k of n.split(/[^a-z]+/))if(k&&_hit(_SEVS,k))return true;
 const j=_sq(n.replace(/[^a-z]/g,''));for(const w of _SEVJS)if(j.includes(w))return true;
 for(const w of _SEVS)if(w.length>=8&&j.includes(w))return true;return false}
function cleanChat(t){return String(t||'').replace(/[\u0000-\u001f]/g,'').slice(0,CFG.chatMax).trim()}
function chatMask(t){return String(t||'').replace(/[A-Za-zÀ-ÿ0-9@$]+/g,m=>{const n=_norm(m);return(_hit(_MILDS,n)||_hit(_SEVS,n))?'*'.repeat(m.length):m})}
/* ---- nome do jogador: só letras (com acento) e espaços, 3 a 16 caracteres, cada palavra com a 1ª letra maiúscula e o resto minúsculo ---- */
const NAME_BAD=/[^A-Za-zÀ-ÖØ-öø-ÿ ]/g;
function properNameLive(t){return String(t==null?'':t).replace(NAME_BAD,'').replace(/^ +/,'').replace(/ {2,}/g,' ').slice(0,16).toLowerCase().split(' ').map(w=>w?w[0].toUpperCase()+w.slice(1):w).join(' ')}
function properName(t){return properNameLive(String(t==null?'':t).trim().replace(/\s+/g,' ')).trim()}
function nameProblem(t){const raw=String(t==null?'':t).trim();if(NAME_BAD.test(raw)){NAME_BAD.lastIndex=0;return/[0-9]/.test(raw)?'Números não podem ser adicionados aos nomes.':'Símbolos não podem ser adicionados aos nomes.'}NAME_BAD.lastIndex=0;if(raw.replace(/\s+/g,' ').length>16)return'O nome pode ter no máximo 16 letras.';const n=properName(raw);if(n.length<3)return'O nome precisa ter pelo menos 3 letras.';if(n.length>16)return'O nome pode ter no máximo 16 letras.';if(filterChat(n)!==n||chatSevere(n))return'Esse nome não é permitido.';return''}
function filterChat(t){return chatMask(cleanChat(t)).trim()}
function makeLimiter(max,windowMs){const q=[];return now=>{while(q.length&&now-q[0]>windowMs)q.shift();if(q.length>=max)return false;q.push(now);return true}}

/* ============ VALIDAÇÃO DOS DADOS ============ */
function validateData(){const e=[];
 for(const id in MONSTERS)for(const d of MONSTERS[id].drops){if(!ITEMS[d.id])e.push('drop inválido '+id+':'+d.id);if(!(d.chance>0&&d.chance<=1))e.push('chance inválida '+id+':'+d.id);if(d.min>d.max||d.min<1)e.push('qtd inválida '+id+':'+d.id)}
 for(const s in SHOPS)for(const[id,p]of SHOPS[s].stock){if(!ITEMS[id])e.push('loja '+s+' item inválido '+id);else if(p<=ITEMS[id].sell)e.push('arbitragem '+s+':'+id)}
 for(const id in QUESTS){const q=QUESTS[id];if(q.after&&!QUESTS[q.after])e.push('quest after '+id);for(const o of q.obj){if(o.mon&&!MONSTERS[o.mon])e.push('quest mon '+id);if(o.item&&!ITEMS[o.item])e.push('quest item '+id)}for(const[i]of q.reward.items||[])if(!ITEMS[i])e.push('quest reward '+id+':'+i)}
 for(const id in ITEMS){const d=ITEMS[id];if(d.type==='weapon'&&(!d.dmg||d.dmg.min>d.dmg.max))e.push('arma inválida '+id);if(d.type==='armor'&&!SLOTS.includes(d.slot))e.push('slot inválido '+id);if(!RARITY[d.rarity])e.push('raridade '+id)}
 return e}

/* ================= PvP (jogador contra jogador, no estilo Rucoy) =================
   ⚔️ ligado = pode atacar e ser atacado por outros ⚔️ ligados, fora das vilas e dentro da faixa de nível.
   Caveiras: branca (atacou quem estava limpo, 2 min), amarela/vermelha/preta/dupla preta pelas mortes recentes (cada uma vale 3 h).
   Quem morre em PvP perde só ouro (nunca itens nem nível); quanto pior a caveira de quem matou, maior a perda. */
const PVP={lockMs:12e3,whiteMs:120e3,killMs:3*3600e3,reach:32,hitCd:140};
const PVP_TOWNS=[[0,0,34],[960,960,68],[5600,0,68]];   // [x,z,meio-lado] das vilas (zonas seguras), com folga de 5 m
function pvpInTown(x,z){for(const t of PVP_TOWNS)if(Math.max(Math.abs(x-t[0]),Math.abs(z-t[1]))<t[2]+5)return true;return false}
function pvpLevelOk(a,b){a=Math.max(1,a|0);b=Math.max(1,b|0);return Math.abs(a-b)<=Math.max(10,Math.ceil(Math.max(a,b)*.3))}
const PVP_SKULLS=['','white','yellow','red','black','dblack'];
const PVP_SKULL_INFO={white:{n:'Caveira branca',c:'#f2f2f2',loss:.1,curse:0},yellow:{n:'Caveira amarela',c:'#ffd23f',loss:.2,curse:0},red:{n:'Caveira vermelha',c:'#ff4a3a',loss:.4,curse:.1},black:{n:'Caveira preta',c:'#2b2b33',loss:.6,curse:.2},dblack:{n:'Caveira preta dupla',c:'#111',loss:.8,curse:.3}};
/* rank 0..5 a partir de quantas mortes recentes e se está "branco" agora */
function pvpRank(kills,white){const r=kills>=12?5:kills>=6?4:kills>=3?3:kills>=1?2:0;return r?r:white?1:0}
function pvpSkull(rank){return PVP_SKULLS[Math.max(0,Math.min(5,rank|0))]}
function pvpGoldLoss(rank){const i=PVP_SKULL_INFO[pvpSkull(rank)];return i?i.loss:.1}
function pvpCurse(rank){const i=PVP_SKULL_INFO[pvpSkull(rank)];return i?i.curse:0}

return{healSum,bagExtra,invTarget,fitInv,INV_MAX,HEAL_R,HEAL_EVERY,HEAL_CAP,HEAL_TF,dayKey,dailyTick,dailyEvent,dailyClaim,dailyNextDay,loginRewardFor,dailyGen,VAR_OF,TIERS,needsTier,tierOf,tierMul,effRarity,rollTier,setIgnoreReq,SETS,SET_OF,MARKET_MAX,MARKET_FEE,marketList,marketCancel,marketSale,itemValue,offerValue,tradeCheck,tradeExec,SKINS,SKIN_SLOTS,SKIN_NAMES,unlockSkin,equipSkin,skinOf,skinState,CFG,RARITY,RARITY_BG_MIN_MOB_LEVEL,rarityShown,SLOTS,SLOT_NAME,STYLES,STYLE_ATTR,ITEMS,MONSTERS,EVENTS,SKILLS,STATUS,SHOPS,QUESTS,
 levelXp,skillNeed,newCharacter,stats,rollHit,dmgToMonster,monsterHit,xpFor,gainXp,gainSkill,spendPoint,deathPenalty,elementMult,
 BANK_SLOTS,bankDeposit,bankWithdraw,bankGoldMove,stackMax,roomFor,freeSlots,addItem,addAll,findUid,removeUid,moveSlot,splitStack,equip,unequip,useItem,sellItem,sellPrice,SELL_PCT,buyItem,countItem,countAnywhere,removeItems,meetsReq,shopPrice,
 GROUND_TTL,groundTtl,mulberry32,dropChance,rollDrops,simulateDrops,isEligible,newGround,groundSpawn,spawnKillDrops,groundExpire,groundPickup,
 questAvailable,acceptQuest,questStatus,questEvent,turnInQuest,bossPhase,
 applyStatus,tickStatuses,speedMul,levelSpeed,dashMax,dashRegen,hasStatus,cureStatus,
 PVP,PVP_SKULLS,PVP_SKULL_INFO,pvpInTown,pvpLevelOk,pvpRank,pvpSkull,pvpGoldLoss,pvpCurse,serialize,deserialize,mint,floorUid,properName,properNameLive,nameProblem,filterChat,chatSevere,cleanChat,chatMask,makeLimiter,validateData}
});
