// Gera deploy-simples/server.js: UM arquivo só com servidor + regras + jogo + ícones (para hospedar enviando só 2 arquivos).
const fs=require('fs'),path=require('path');
const D=__dirname,PUB=path.join(D,'public'),out=path.join(D,'..','deploy-simples');
const emb={};(function walk(dir,rel){for(const f of fs.readdirSync(dir)){const p=path.join(dir,f),r=rel+'/'+f;if(fs.statSync(p).isDirectory())walk(p,r);else if(f!=='three.min.js'&&!f.startsWith('.'))emb[r]=fs.readFileSync(p).toString('base64')}})(PUB,'');
// .well-known (se existir)
const wk=path.join(PUB,'.well-known');if(fs.existsSync(wk))for(const f of fs.readdirSync(wk))emb['/.well-known/'+f]=fs.readFileSync(path.join(wk,f)).toString('base64');
const core=fs.readFileSync(path.join(D,'core.js'),'utf8');
const srv=fs.readFileSync(path.join(D,'server.js'),'utf8');
const code="'use strict';\n/* Cavaleiros da Luz — arquivo único gerado por empacotar.js (servidor + jogo). Não edite: edite a pasta 'servidor' e gere de novo. */\nconst __EMB="+JSON.stringify(emb)+";\nconst __CORE=(function(){const module={exports:{}},exports=module.exports;\n"+core+"\nreturn module.exports})();\n"+srv.replace(/^'use strict';\n/,'');
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'server.js'),code);
fs.writeFileSync(path.join(out,'package.json'),JSON.stringify({name:'cavaleiros-da-luz',version:'1.0.0',main:'server.js',scripts:{start:'node server.js'},engines:{node:'>=20'},private:true},null,2));
console.log('deploy-simples/server.js',(code.length/1024).toFixed(0)+' KB, arquivos embutidos:',Object.keys(emb).length);
