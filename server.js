'use strict';
/* Cavaleiros da Luz — SERVIDOR (1 servidor, sem dependências: só Node 18+).
   - Contas com e-mail + senha (scrypt), sessões, bloqueio por tentativas, prova de trabalho (anti-bot) e isca anti-robô.
   - Progresso do personagem salvo no servidor, validado com as regras do jogo (core.js) e com limites de evolução.
   - Sala online por WebSocket: o servidor sabe quem é cada jogador (nome/nível/token não podem ser forjados), limita a
     velocidade de cada tipo de mensagem e confere o tamanho e os valores do que chega.
   - Anti auto-click: o cliente manda estatísticas de cliques; o servidor detecta cliques sintéticos/regulares/rápidos demais e
     pede uma verificação ("toque no ícone certo"); falhar = expulsão com tempo de espera, reincidência = conta suspensa. */
const http = require('http'), https = require('https'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const Core = (typeof __CORE !== 'undefined') ? __CORE : require('./core.js');

const ENV = process.env;
const CFG = {
  port: +ENV.PORT || 3000,
  dataDir: ENV.DATA_DIR || path.join(__dirname, 'data'),
  publicDir: ENV.PUBLIC_DIR || path.join(__dirname, 'public'),
  publicUrl: (ENV.PUBLIC_URL || '').replace(/\/+$/, ''),     // ex.: https://cavaleiros.onrender.com  (usado em links de e-mail e conferência de origem)
  resendKey: ENV.RESEND_API_KEY || '',                        // opcional: envio de e-mail (https://resend.com). Sem isso, contas são criadas já verificadas.
  mailFrom: ENV.MAIL_FROM || '',
  admin: ENV.ADMIN_TOKEN || '',                               // opcional: libera /api/admin/...
  maxPlayers: +ENV.MAX_PLAYERS || 200,
  trustProxy: ENV.TRUST_PROXY !== '0',
  powReg: +ENV.POW_REG || 18, powLogin: +ENV.POW_LOGIN || 15,
  googleId: ENV.GOOGLE_CLIENT_ID || '',                       // opcional: entrar com Google (OAuth client id da Web)
  appleId: ENV.APPLE_CLIENT_ID || '',                         // opcional: entrar com Apple (Services ID)
  sessionDays: 30,
  nearM: 250, midM: 800,
};
const SITE_URL = ENV.SITE_URL || (CFG.publicUrl ? CFG.publicUrl + '/site/' : '/site/');   // endereço do site oficial (ex.: https://cavaleirosdaluz.com)
const mailOn = !!(CFG.resendKey && CFG.mailFrom && CFG.publicUrl);
fs.mkdirSync(path.join(CFG.dataDir, 'saves'), { recursive: true });

/* ---------------------------------------------------------------- utilidades */
const now = () => Date.now();
const rnd = n => crypto.randomBytes(n).toString('hex');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const log = (...a) => console.log(new Date().toISOString(), ...a);
const buckets = new Map();      // limites por chave (IP, conta...)
function rate(key, max, winMs) {
  const t = now(); let b = buckets.get(key);
  if (!b || t - b.t > winMs) { b = { t, n: 0 }; buckets.set(key, b); }
  b.n++; return b.n <= max;
}
setInterval(() => { const t = now(); for (const [k, b] of buckets) if (t - b.t > 3600e3) buckets.delete(k); for (const [k, c] of challenges) if (c.exp < t) challenges.delete(k); }, 60e3).unref();
function ipOf(req) {
  if (CFG.trustProxy) { const x = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim(); if (x) return x; }
  return req.socket.remoteAddress || '?';
}

/* ---------------------------------------------------------------- banco de dados (arquivo JSON, gravação atômica) */
const DBF = path.join(CFG.dataDir, 'db.json');
let DB = { accounts: {}, sessions: {}, reports: [] };
try { DB = Object.assign(DB, JSON.parse(fs.readFileSync(DBF, 'utf8'))); } catch (e) { /* primeiro uso */ }
DB.reports = DB.reports || [];
DB.guilds = DB.guilds || {}; DB.purchases = DB.purchases || {};
const byEmail = new Map(), byNick = new Map();
for (const a of Object.values(DB.accounts)) { byEmail.set(a.email, a.id); byNick.set(a.nick.toLowerCase(), a.id); }
let dirty = false;
function persist() { dirty = true; }
setInterval(() => {
  if (!dirty) return; dirty = false;
  const t = now(); for (const [k, s] of Object.entries(DB.sessions)) if (s.exp < t) delete DB.sessions[k];
  try { fs.writeFileSync(DBF + '.tmp', JSON.stringify(DB)); fs.renameSync(DBF + '.tmp', DBF); } catch (e) { log('ERRO ao gravar banco', e.message); dirty = true; }
}, 1000).unref();
const saveFile = id => path.join(CFG.dataDir, 'saves', id + '.json');
function readSave(id) { try { return JSON.parse(fs.readFileSync(saveFile(id), 'utf8')); } catch (e) { return null; } }
function writeSave(id, obj) { const f = saveFile(id); fs.writeFileSync(f + '.tmp', JSON.stringify(obj)); fs.renameSync(f + '.tmp', f); }

/* ---------------------------------------------------------------- senhas, sessões, prova de trabalho */
function hashPw(pw, salt) { return crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex'); }
function checkPw(pw, a) { const h = Buffer.from(hashPw(pw, a.salt), 'hex'), g = Buffer.from(a.hash, 'hex'); return h.length === g.length && crypto.timingSafeEqual(h, g); }
const COMMON = new Set(['12345678', '123456789', '1234567890', 'password', 'senha123', 'qwertyui', '11111111', 'abcd1234', 'senhasenha', 'iloveyou', '00000000', 'password1', 'brasil123']);
function pwProblem(pw, email, nick) {
  if (typeof pw !== 'string' || pw.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (pw.length > 72) return 'Senha longa demais (máx. 72).';
  if (COMMON.has(pw.toLowerCase()) || /^(.)\1+$/.test(pw)) return 'Essa senha é fraca demais. Escolha outra.';
  if (pw.toLowerCase() === String(email).toLowerCase() || pw.toLowerCase() === String(nick).toLowerCase()) return 'A senha não pode ser igual ao e-mail ou ao nome.';
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return 'Use letras e números na senha.';
  return '';
}
function newSession(acc, ip) { const tok = rnd(32); DB.sessions[sha(tok)] = { acc: acc.id, exp: now() + CFG.sessionDays * 864e5, ip, t: now() }; persist(); return tok; }
function sessionOf(tok) { if (typeof tok !== 'string' || tok.length !== 64) return null; const s = DB.sessions[sha(tok)]; if (!s || s.exp < now()) return null; return DB.accounts[s.acc] || null; }
const challenges = new Map();
function makeChallenge(kind, ip) { const id = rnd(8), salt = rnd(12), bits = kind === 'reg' ? CFG.powReg : CFG.powLogin; challenges.set(id, { salt, bits, exp: now() + 120e3, ip }); return { id, salt, bits }; }
function lead0(buf) { let n = 0; for (const b of buf) { if (b === 0) { n += 8; continue; } n += Math.clz32(b) - 24; break; } return n; }
function checkPow(ch, ip) {
  if (!ch || typeof ch.id !== 'string') return false;
  const c = challenges.get(ch.id); challenges.delete(ch.id);          // uso único
  if (!c || c.exp < now() || c.ip !== ip) return false;
  const nonce = String(ch.nonce == null ? '' : ch.nonce).slice(0, 24);
  return lead0(crypto.createHash('sha256').update(c.salt + ':' + nonce).digest()) >= c.bits;
}

/* ---------------------------------------------------------------- e-mail (opcional, via Resend) */
function sendMail(to, subject, html) {
  if (!mailOn) return Promise.resolve(false);
  return new Promise(res => {
    const body = JSON.stringify({ from: CFG.mailFrom, to: [to], subject, html });
    const rq = https.request({ hostname: 'api.resend.com', path: '/emails', method: 'POST', headers: { 'Authorization': 'Bearer ' + CFG.resendKey, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      r => { r.resume(); r.on('end', () => res(r.statusCode < 300)); });
    rq.on('error', () => res(false)); rq.setTimeout(10e3, () => rq.destroy()); rq.end(body);
  });
}

/* ---------------------------------------------------------------- validação do progresso salvo */
const ITEM = Core.ITEMS;
function validateSave(raw, prev) {
  let o; try { o = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { return { err: 'save inválido' }; }
  if (!o || typeof o !== 'object') return { err: 'save inválido' };
  let st; try { st = Core.deserialize(JSON.parse(JSON.stringify(o))); } catch (e) { st = null; }
  if (!st) return { err: 'save inválido' };
  if (!(st.level >= 1 && st.level <= 999)) return { err: 'nível inválido' };
  for (const k of ['melee', 'dist', 'magic', 'def']) { const v = st.sk && st.sk[k] && st.sk[k].lv; if (!(v >= 1 && v <= 999)) return { err: 'habilidade inválida' }; }
  if (!(st.gold >= 0 && st.gold <= 1e12) || !(st.bankGold >= 0 && st.bankGold <= 1e12)) return { err: 'ouro inválido' };
  let n = 0;
  for (const e of [].concat(o.inv || [], o.bank || [], Object.values(o.eq || {}))) if (e && (typeof e.id !== 'string' || !ITEM[e.id])) return { err: 'item inexistente' };
  for (const e of [].concat(st.inv || [], st.bank || [], Object.values(st.eq || {}))) { if (!e) continue; if (!ITEM[e.id]) return { err: 'item inexistente' }; if (!(e.qty >= 1 && e.qty <= 1e6)) return { err: 'quantidade inválida' }; n++; }
  if (n > 400) return { err: 'itens demais' };
  /* plausibilidade: evolução máxima por tempo desde o último salvamento */
  const p = prev && prev.data ? Core.deserialize(prev.data) : null;
  const dtS = prev ? Math.max(1, (now() - prev.t) / 1000) : 1;
  if (!p) { if (st.level > 5 || st.gold > 5000) return { err: 'personagem inicial inválido' }; }
  else {
    if (st.level - p.level > 2 + dtS / 25) return { err: 'evolução rápida demais (nível)' };
    for (const k of ['melee', 'dist', 'magic', 'def']) if (st.sk[k].lv - p.sk[k].lv > 2 + dtS / 15) return { err: 'evolução rápida demais (habilidade)' };
    if (st.gold - p.gold > 500000 + dtS * 20000) return { err: 'ouro demais' };
    if (st.kills - (p.kills || 0) > 40 + dtS * 6) return { err: 'abates demais' };
  }
  return { st, o };
}

/* ---------------------------------------------------------------- HTTP */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.sh': 'text/plain', '.bat': 'text/plain', '.md': 'text/plain; charset=utf-8' };
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' ws: wss:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
function secHeaders(res, https_) {
  res.setHeader('Content-Security-Policy', CSP); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY'); if (https_) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
}
function json(res, code, obj) { const b = JSON.stringify(obj); res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(b) }); res.end(b); }
function body(req, max) {
  return new Promise((ok, no) => {
    let n = 0; const ch = [];
    req.on('data', c => { n += c.length; if (n > max) { no(new Error('grande')); req.destroy(); } else ch.push(c); });
    req.on('end', () => { try { ok(ch.length ? JSON.parse(Buffer.concat(ch).toString('utf8')) : {}); } catch (e) { no(new Error('json')); } });
    req.on('error', no);
  });
}
const bearer = req => { const h = String(req.headers.authorization || ''); return h.startsWith('Bearer ') ? h.slice(7) : ''; };
const emailOk = e => typeof e === 'string' && e.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const nickOk = n => typeof n === 'string' && /^[A-Za-zÀ-ÿ0-9_ ]{3,16}$/.test(n) && n.trim() === n && !/\s{2,}/.test(n);
const online = new Map();   // accId -> conn

/* ---- entrar com Google / Apple (OpenID Connect, sem dependências: confere a assinatura RS256 com as chaves públicas do provedor) ---- */
const byOA = new Map(); for (const a of Object.values(DB.accounts)) for (const k in (a.oa || {})) byOA.set(k + ':' + a.oa[k], a.id);
const jwksCache = {}, usedNonce = new Map();
async function jwks(url) { const c = jwksCache[url]; if (c && c.t > now() - 3600e3) return c.k; const r = await fetch(url); const j = await r.json(); jwksCache[url] = { t: now(), k: j.keys || [] }; return jwksCache[url].k; }
async function verifyIdToken(tok, provider, nonce) {
  if (typeof tok !== 'string' || tok.length > 6000) throw new Error('token');
  const [h, p, sg] = tok.split('.'); if (!sg) throw new Error('formato');
  const head = JSON.parse(Buffer.from(h, 'base64url')), pl = JSON.parse(Buffer.from(p, 'base64url'));
  if (head.alg !== 'RS256') throw new Error('alg');
  const url = provider === 'google' ? 'https://www.googleapis.com/oauth2/v3/certs' : 'https://appleid.apple.com/auth/keys';
  let jwk = (await jwks(url)).find(k => k.kid === head.kid); if (!jwk) { delete jwksCache[url]; jwk = (await jwks(url)).find(k => k.kid === head.kid); } if (!jwk) throw new Error('chave');
  if (!crypto.verify('RSA-SHA256', Buffer.from(h + '.' + p), crypto.createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(sg, 'base64url'))) throw new Error('assinatura');
  const aud = provider === 'google' ? CFG.googleId : CFG.appleId, iss = provider === 'google' ? ['https://accounts.google.com', 'accounts.google.com'] : ['https://appleid.apple.com'];
  if (!aud || pl.aud !== aud || !iss.includes(pl.iss) || !(pl.exp * 1000 > now()) || !pl.sub) throw new Error('dados');
  if (typeof nonce !== 'string' || nonce.length < 16 || pl.nonce !== nonce || usedNonce.has(nonce)) throw new Error('nonce');
  usedNonce.set(nonce, now()); if (usedNonce.size > 5000) for (const [k, t] of usedNonce) if (t < now() - 600e3) usedNonce.delete(k);
  return pl;
}
function freeNick(base) {
  let b = String(base || '').replace(/[^A-Za-zÀ-ÿ0-9_]/g, '').slice(0, 11); if (b.length < 3) b = 'Heroi';
  for (let i = 0; i < 30; i++) { const n = i === 0 ? b : b + Math.floor(Math.random() * 9000 + 1000); if (nickOk(n) && !byNick.has(n.toLowerCase()) && Core.filterChat(n) === n && !Core.chatSevere(n)) return n; }
  return 'Heroi' + rnd(4);
}
const OA_PAGE = '<!doctype html><meta name=viewport content="width=device-width"><body style="font:18px sans-serif;background:#0b0f14;color:#eee;text-align:center;padding:40px"><p>Concluindo o login…</p><script>';
function oaPage(res, provider, idToken, state) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(OA_PAGE + 'try{window.opener&&window.opener.postMessage({cl_oauth:1,provider:' + JSON.stringify(provider) + ',idToken:' + JSON.stringify(idToken || '') + ',state:' + JSON.stringify(state || '') + '},location.origin)}catch(e){}setTimeout(function(){window.close()},300)</script>');
}

const ok_ = (nick, free) => free ? { ok: true, nick } : { ok: false, err: 'Este nick já pertence a um jogador.' };

/* ---------- site: ranking público, equipe, guildas, diamantes ---------- */
const STAFF_ENV = {};   // STAFF="Nick:admin,Outro:gm" (também dá para usar /api/admin/role/<id>/<admin|gm|none>)
for (const t of String(ENV.STAFF || '').split(',')) { const [n, r] = t.split(':').map(x => (x || '').trim()); if (n && (r === 'admin' || r === 'gm')) STAFF_ENV[n.toLowerCase()] = r; }
const SITE_ORIGINS = String(ENV.SITE_ORIGIN || '').split(',').map(x => x.trim().replace(/\/+$/, '')).filter(Boolean);   // ex.: https://cavaleirosdaluz.com,https://www.cavaleirosdaluz.com
const roleOf = a => STAFF_ENV[a.nick.toLowerCase()] || a.role || '';
const CLS = ['melee', 'dist', 'magic', 'def'], XK = { melee: 'mx', dist: 'dx', magic: 'gx', def: 'fx' };
const best = a => a.rk ? Math.max(a.rk.melee | 0, a.rk.dist | 0, a.rk.magic | 0, a.rk.def | 0) : 0;
function fillRk() {   // contas antigas ainda sem ranking: lê o save uma vez
  let fill = 0;
  for (const a of Object.values(DB.accounts)) if (!a.rk && fill < 200) { fill++; try { const sv = readSave(a.id), st = sv && Core.deserialize(JSON.parse(JSON.stringify(sv.data))); a.rk = st ? { melee: st.sk.melee.lv, dist: st.sk.dist.lv, magic: st.sk.magic.lv, def: st.sk.def.lv, mx: st.sk.melee.xp, dx: st.sk.dist.xp, gx: st.sk.magic.xp, fx: st.sk.def.xp } : { melee: 0, dist: 0, magic: 0, def: 0 }; } catch (e) { a.rk = { melee: 0, dist: 0, magic: 0, def: 0 }; } }
  if (fill) persist();
}
const GUILD = { maxMembers: 30, minLevel: 10 };
const guildNameOk = n => typeof n === 'string' && /^[A-Za-zÀ-ÿ0-9]+( [A-Za-zÀ-ÿ0-9]+)*$/.test(n) && n.length >= 3 && n.length <= 20;
const guildTagOk = t => typeof t === 'string' && /^[A-Za-z0-9]{2,4}$/.test(t);
const guildOf = a => a && a.guild && DB.guilds[a.guild] || null;
const gMembers = g => g.members.map(id => DB.accounts[id]).filter(Boolean);
function guildView(g, full) {
  const ms = gMembers(g).sort((x, y) => (y.id === g.leader) - (x.id === g.leader) || best(y) - best(x));
  const o = { id: g.id, name: g.name, tag: g.tag, desc: g.desc || '', leader: (DB.accounts[g.leader] || {}).nick || '?', count: ms.length, max: GUILD.maxMembers, power: ms.reduce((t, a) => t + best(a), 0), created: g.created };
  if (full) o.members = ms.map(a => ({ n: a.nick, lv: best(a), r: a.id === g.leader ? 'leader' : 'member', role: roleOf(a), on: online.has(a.id) }));
  return o;
}
function guildRemove(g, id) {
  g.members = g.members.filter(x => x !== id); const a = DB.accounts[id]; if (a) a.guild = null;
  if (!g.members.length) { delete DB.guilds[g.id]; return; }
  if (g.leader === id) g.leader = gMembers(g).sort((x, y) => best(y) - best(x))[0].id;
}
const DIAMOND_SKUS = { diamonds_100: 100, diamonds_550: 550, diamonds_1200: 1200, diamonds_2600: 2600 };
let gpTok = { t: 0, v: '' };
async function playToken() {   // PLAY_SERVICE_ACCOUNT = JSON da conta de serviço do Google Play Console
  if (gpTok.t > now() + 60e3) return gpTok.v;
  const sa = JSON.parse(ENV.PLAY_SERVICE_ACCOUNT), b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url'), iat = Math.floor(now() / 1000);
  const un = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3000 });
  const jwt = un + '.' + crypto.sign('RSA-SHA256', Buffer.from(un), sa.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt });
  const j = await r.json(); if (!j.access_token) throw new Error('token');
  gpTok = { t: now() + (j.expires_in || 3000) * 1000, v: j.access_token }; return gpTok.v;
}
async function playVerify(sku, token) {   // devolve {ok} | {err}
  const pkg = ENV.PLAY_PACKAGE, base = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + encodeURIComponent(pkg) + '/purchases/products/' + encodeURIComponent(sku) + '/tokens/' + encodeURIComponent(token);
  const h = { Authorization: 'Bearer ' + await playToken() };
  const r = await fetch(base, { headers: h }); if (!r.ok) return { err: 'Compra não encontrada no Google Play.' };
  const j = await r.json(); if (j.purchaseState !== 0) return { err: 'Compra não concluída.' };
  if (j.consumptionState !== 1) { const c = await fetch(base + ':consume', { method: 'POST', headers: h }); if (!c.ok) return { err: 'Não foi possível confirmar a compra.' }; }
  return { ok: true };
}
async function siteApi(req, res, p, m, url, ip) {   // rotas públicas (sem login)
  if (!rate('site:' + ip, 120, 60e3)) return json(res, 429, { err: 'Muitas consultas. Aguarde um instante.' });
  if (p === '/api/site/stats') return json(res, 200, { ok: true, accounts: Object.keys(DB.accounts).length, online: online.size, guilds: Object.keys(DB.guilds).length });
  if (p === '/api/site/rank') {
    fillRk(); const k = url.searchParams.get('k'), vis = a => a.rk && !(a.banUntil > now());
    const row = (a, lv) => { const g = guildOf(a); return { n: a.nick, lv, g: g ? g.tag : '', role: roleOf(a) }; };
    if (k === 'all') return json(res, 200, { ok: true, k, list: Object.values(DB.accounts).filter(a => vis(a) && best(a) >= 1).sort((a, b) => best(b) - best(a)).slice(0, 50).map(a => row(a, best(a))) });
    if (!CLS.includes(k)) return json(res, 400, { err: 'Classe inválida.' });
    return json(res, 200, { ok: true, k, list: Object.values(DB.accounts).filter(a => vis(a) && a.rk[k] >= 1).sort((a, b) => b.rk[k] - a.rk[k] || (b.rk[XK[k]] || 0) - (a.rk[XK[k]] || 0)).slice(0, 50).map(a => row(a, a.rk[k])) });
  }
  if (p === '/api/site/staff') return json(res, 200, { ok: true, staff: Object.values(DB.accounts).filter(a => roleOf(a)).map(a => ({ n: a.nick, role: roleOf(a), on: online.has(a.id), lv: best(a) })).sort((a, b) => (a.role === 'admin' ? 0 : 1) - (b.role === 'admin' ? 0 : 1) || a.n.localeCompare(b.n)) });
  if (p === '/api/site/guilds') {
    const q = String(url.searchParams.get('q') || '').toLowerCase().slice(0, 20);
    return json(res, 200, { ok: true, list: Object.values(DB.guilds).filter(g => !q || g.name.toLowerCase().includes(q) || g.tag.toLowerCase() === q).map(g => guildView(g)).sort((a, b) => b.power - a.power).slice(0, 50) });
  }
  if (p === '/api/site/guild') { const g = DB.guilds[String(url.searchParams.get('id') || '')]; return g ? json(res, 200, { ok: true, guild: guildView(g, true) }) : json(res, 404, { err: 'Guilda não encontrada.' }); }
  return json(res, 404, { err: 'não encontrado' });
}
async function api(req, res, url, ip) {
  const p = url.pathname, m = req.method;
  if (!rate('api:' + ip, 240, 60e3)) return json(res, 429, { err: 'Muitas requisições. Aguarde um instante.' });
  if (p === '/api/ping' && m === 'GET') return json(res, 200, { ok: true, game: 'Cavaleiros da Luz', online: online.size, max: CFG.maxPlayers, mail: mailOn, v: 1 });
  if (p === '/api/nick-free' && m === 'GET') {
    if (!rate('nf:' + ip, 60, 60e3)) return json(res, 429, { err: 'Calma! Tente de novo em instantes.' });
    const raw = String(url.searchParams.get('n') || ''), np = Core.nameProblem(raw);
    if (np) return json(res, 200, { ok: false, err: np });
    const nick = Core.properName(raw), ow = byNick.get(nick.toLowerCase());
    const cur = sessionOf(bearer(req));
    return json(res, 200, ok_(nick, !ow || (cur && cur.id === ow)));
  }
  if (p === '/api/challenge' && m === 'GET') {
    if (!rate('ch:' + ip, 40, 60e3)) return json(res, 429, { err: 'Calma! Tente de novo em instantes.' });
    return json(res, 200, makeChallenge(url.searchParams.get('k') === 'reg' ? 'reg' : 'login', ip));
  }
  if (p === '/api/verify' && m === 'GET') {
    const t = String(url.searchParams.get('t') || ''); const a = Object.values(DB.accounts).find(x => x.vtoken && x.vtoken === sha(t));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    if (a) { a.verified = true; a.vtoken = null; persist(); return res.end('<meta name=viewport content="width=device-width"><body style="font:18px sans-serif;background:#0b0f14;color:#eee;text-align:center;padding:40px"><h2>✅ E-mail confirmado!</h2><p>Volte ao jogo e entre com sua conta.</p>'); }
    return res.end('<meta name=viewport content="width=device-width"><body style="font:18px sans-serif;background:#0b0f14;color:#eee;text-align:center;padding:40px"><h2>Link inválido ou já usado.</h2>');
  }
  if (m === 'POST' && (p === '/api/register' || p === '/api/login' || p === '/api/forgot' || p === '/api/reset')) {
    let b; try { b = await body(req, 4096); } catch (e) { return json(res, 400, { err: 'Requisição inválida.' }); }
    if (!b || typeof b !== 'object') return json(res, 400, { err: 'Requisição inválida.' });
    if (p === '/api/register') {
      if (b.hp) return json(res, 200, { ok: true, wait: true });                     // isca: robô preencheu o campo escondido (finge sucesso)
      if (!rate('reg:' + ip, 40, 3600e3)) return json(res, 429, { err: 'Muitas tentativas. Tente mais tarde.' });
      if (!(+b.ft >= 2500)) return json(res, 400, { err: 'Formulário enviado rápido demais. Tente de novo.' });
      if (!checkPow(b.ch, ip)) return json(res, 400, { err: 'Verificação anti-robô falhou. Tente de novo.' });
      const email = String(b.email || '').trim().toLowerCase(), nick = Core.properName(b.nick);
      if (!emailOk(email)) return json(res, 400, { err: 'E-mail inválido.' });
      { const np = Core.nameProblem(b.nick); if (np) return json(res, 400, { err: np }); }
      const pr = pwProblem(b.password, email, nick); if (pr) return json(res, 400, { err: pr });
      if (Object.keys(DB.accounts).length >= 200000) return json(res, 503, { err: 'Servidor lotado de contas.' });
      if (byEmail.has(email)) return json(res, 400, { err: 'Já existe uma conta com esse e-mail.' });
      if (byNick.has(nick.toLowerCase())) return json(res, 400, { err: 'Este nick já pertence a um jogador.' });
      if (!rate('regok:' + ip, 4, 3600e3)) return json(res, 429, { err: 'Muitas contas criadas deste lugar. Tente mais tarde.' });
      const salt = rnd(16), id = rnd(8), vt = mailOn ? rnd(24) : null;
      const a = { id, email, nick, salt, hash: hashPw(b.password, salt), verified: !mailOn, vtoken: vt ? sha(vt) : null, created: now(), fails: 0, lockUntil: 0, strikes: 0, banUntil: 0, flags: 0, ip };
      DB.accounts[id] = a; byEmail.set(email, id); byNick.set(nick.toLowerCase(), id); persist();
      if (mailOn) { sendMail(email, 'Confirme seu e-mail — Cavaleiros da Luz', `<p>Olá, ${nick}! Confirme sua conta:</p><p><a href="${CFG.publicUrl}/api/verify?t=${vt}">Confirmar e-mail</a></p>`); return json(res, 200, { ok: true, verify: true }); }
      return json(res, 200, { ok: true, verify: false });
    }
    if (p === '/api/login') {
      if (!rate('lg:' + ip, 20, 600e3)) return json(res, 429, { err: 'Muitas tentativas. Aguarde alguns minutos.' });
      if (!checkPow(b.ch, ip)) return json(res, 400, { err: 'Verificação anti-robô falhou. Tente de novo.' });
      const email = String(b.email || '').trim().toLowerCase(), a = DB.accounts[byEmail.get(email)];
      const bad = () => json(res, 401, { err: 'E-mail ou senha incorretos.' });
      if (!a) { hashPw('x', 'y'); return bad(); }                                   // gasta o mesmo tempo para não revelar se o e-mail existe
      if (a.lockUntil > now()) return json(res, 429, { err: 'Conta bloqueada por tentativas erradas. Tente em ' + Math.ceil((a.lockUntil - now()) / 60e3) + ' min.' });
      if (typeof b.password !== 'string' || !checkPw(b.password.slice(0, 72), a)) { a.fails++; if (a.fails >= 5) { a.fails = 0; a.lockUntil = now() + 15 * 60e3; } persist(); return bad(); }
      if (!a.verified) return json(res, 403, { err: 'Confirme seu e-mail antes de entrar (veja a caixa de entrada e o spam).' });
      if (a.banUntil > now()) return json(res, 403, { err: a.banUntil > now() + 3650e6 ? 'Conta suspensa por uso de robô/auto-click.' : 'Conta em espera por ' + Math.ceil((a.banUntil - now()) / 60e3) + ' min (verificação anti-robô).' });
      a.fails = 0; persist();
      return json(res, 200, { ok: true, token: newSession(a, ip), nick: a.nick });
    }
    if (p === '/api/forgot') {
      if (!rate('fg:' + ip, 5, 3600e3)) return json(res, 429, { err: 'Muitas solicitações.' });
      if (!mailOn) return json(res, 200, { ok: true });
      if (!checkPow(b.ch, ip)) return json(res, 400, { err: 'Verificação anti-robô falhou.' });
      const a = DB.accounts[byEmail.get(String(b.email || '').trim().toLowerCase())];
      if (a) { const t = rnd(24); a.rtoken = sha(t); a.rexp = now() + 3600e3; persist(); sendMail(a.email, 'Redefinir senha — Cavaleiros da Luz', `<p>Para criar uma nova senha, abra o jogo e use o código abaixo em "Esqueci a senha → Já tenho o código":</p><p style="font:20px monospace">${t}</p><p>Vale por 1 hora. Se não foi você, ignore.</p>`); }
      return json(res, 200, { ok: true });
    }
    if (p === '/api/reset') {
      if (!rate('rs:' + ip, 10, 3600e3)) return json(res, 429, { err: 'Muitas tentativas.' });
      const t = String(b.token || ''), a = Object.values(DB.accounts).find(x => x.rtoken && x.rtoken === sha(t) && x.rexp > now());
      if (!a) return json(res, 400, { err: 'Código inválido ou expirado.' });
      const pr = pwProblem(b.password, a.email, a.nick); if (pr) return json(res, 400, { err: pr });
      a.salt = rnd(16); a.hash = hashPw(b.password, a.salt); a.rtoken = null; a.fails = 0; a.lockUntil = 0; a.verified = true;
      for (const [k, s] of Object.entries(DB.sessions)) if (s.acc === a.id) delete DB.sessions[k];
      persist(); return json(res, 200, { ok: true });
    }
  }
  if (p.startsWith('/api/site/') && m === 'GET') return siteApi(req, res, p, m, url, ip);
  if (p === '/api/config' && m === 'GET') return json(res, 200, { google: CFG.googleId, apple: CFG.appleId });
  if (p === '/api/oauth' && m === 'POST') {
    if (!rate('oa:' + ip, 30, 600e3)) return json(res, 429, { err: 'Muitas tentativas. Aguarde alguns minutos.' });
    let b; try { b = await body(req, 8192); } catch (e) { return json(res, 400, { err: 'Requisição inválida.' }); }
    const prov = b && b.provider; if (prov !== 'google' && prov !== 'apple') return json(res, 400, { err: 'Provedor inválido.' });
    if (!(prov === 'google' ? CFG.googleId : CFG.appleId)) return json(res, 503, { err: 'Esse login ainda não está configurado neste servidor.' });
    let pl; try { pl = await verifyIdToken(b.idToken, prov, b.nonce); } catch (e) { return json(res, 401, { err: 'Não foi possível confirmar o login. Tente de novo.' }); }
    const key = prov + ':' + pl.sub, email = (pl.email && (pl.email_verified === true || pl.email_verified === 'true') ? String(pl.email).toLowerCase() : '');
    const cur = sessionOf(bearer(req)); let a = DB.accounts[byOA.get(key)];
    if (!a && cur) { cur.oa = Object.assign(cur.oa || {}, { [prov]: pl.sub }); byOA.set(key, cur.id); a = cur; persist(); }          // já estava logado: vincula a esta conta
    if (!a && email && byEmail.has(email)) { a = DB.accounts[byEmail.get(email)]; a.oa = Object.assign(a.oa || {}, { [prov]: pl.sub }); byOA.set(key, a.id); a.verified = true; persist(); }
    if (!a) {
      if (Object.keys(DB.accounts).length >= 200000) return json(res, 503, { err: 'Servidor lotado de contas.' });
      if (!rate('oareg:' + ip, 6, 3600e3)) return json(res, 429, { err: 'Muitas contas criadas deste lugar. Tente mais tarde.' });
      const id = rnd(8), salt = rnd(16), nick = freeNick(email ? email.split('@')[0] : '');
      a = { id, email: email || (prov + '-' + id + '@login.local'), nick, salt, hash: hashPw(rnd(16), salt), verified: true, vtoken: null, created: now(), fails: 0, lockUntil: 0, strikes: 0, banUntil: 0, flags: 0, ip, pend: true, oa: { [prov]: pl.sub } };
      DB.accounts[id] = a; byEmail.set(a.email, id); byNick.set(nick.toLowerCase(), id); byOA.set(key, id); persist();
    }
    if (a.banUntil > now()) return json(res, 403, { err: 'Conta suspensa ou em espera.' });
    return json(res, 200, { ok: true, token: newSession(a, ip), nick: a.nick, pend: !!a.pend });
  }
  /* ---- rotas autenticadas ---- */
  const acc = sessionOf(bearer(req));
  if (!acc) return json(res, 401, { err: 'Sessão expirada. Entre novamente.' });
  if (p === '/api/me' && m === 'GET') { const g = guildOf(acc); return json(res, 200, { ok: true, nick: acc.nick, email: acc.email, pend: !!acc.pend, role: roleOf(acc), diamonds: acc.diamonds | 0, guild: g ? { id: g.id, name: g.name, tag: g.tag, leader: g.leader === acc.id } : null }); }
  if (p === '/api/nick' && m === 'POST') {
    if (!rate('nk:' + acc.id, 20, 600e3)) return json(res, 429, { err: 'Muitas tentativas. Aguarde um pouco.' });
    if (!acc.pend) return json(res, 400, { err: 'Seu nome já foi escolhido.' });
    let b; try { b = await body(req, 1024); } catch (e) { return json(res, 400, { err: 'Requisição inválida.' }); }
    const np = Core.nameProblem(b.nick); if (np) return json(res, 400, { err: np });
    const nick = Core.properName(b.nick), k = nick.toLowerCase();
    if (byNick.has(k) && byNick.get(k) !== acc.id) return json(res, 400, { err: 'Este nick já pertence a um jogador.' });
    byNick.delete(acc.nick.toLowerCase()); acc.nick = nick; acc.pend = false; byNick.set(k, acc.id); persist();
    return json(res, 200, { ok: true, nick });
  }
  if (p === '/api/logout' && m === 'POST') { delete DB.sessions[sha(bearer(req))]; persist(); const c = online.get(acc.id); if (c) c.close('Você saiu da conta.'); return json(res, 200, { ok: true }); }
  if (p === '/api/rank' && m === 'GET') {
    if (!rate('rk:' + acc.id, 30, 60e3)) return json(res, 429, { err: 'Muitas consultas.' });
    fillRk();
    const out = {};
    for (const k of ['melee', 'dist', 'magic', 'def'])
      out[k] = Object.values(DB.accounts).filter(a => a.rk && a.rk[k] >= 1 && !(a.banUntil > now())).sort((a, b) => b.rk[k] - a.rk[k] || (b.rk[XK[k]] || 0) - (a.rk[XK[k]] || 0)).slice(0, 10).map(a => ({ n: a.nick, lv: a.rk[k] }));
    return json(res, 200, { ok: true, rank: out });
  }
  if (p.startsWith('/api/guild/') && m === 'POST') {
    if (!rate('gd:' + acc.id, 20, 60e3)) return json(res, 429, { err: 'Muitas ações. Aguarde um pouco.' });
    let b; try { b = await body(req, 2048); } catch (e) { return json(res, 400, { err: 'Requisição inválida.' }); }
    b = b || {}; const act = p.slice(11), g = guildOf(acc);
    if (acc.guild && !g) acc.guild = null;
    if (act === 'create') {
      if (g) return json(res, 400, { err: 'Você já está em uma guilda. Saia dela antes.' });
      fillRk(); if (best(acc) < GUILD.minLevel) return json(res, 400, { err: 'Precisa de uma classe no nível ' + GUILD.minLevel + ' ou mais para criar uma guilda.' });
      const name = String(b.name || '').trim().replace(/ +/g, ' '), tag = String(b.tag || '').trim().toUpperCase();
      if (!guildNameOk(name)) return json(res, 400, { err: 'Nome da guilda: 3 a 20 letras ou números.' });
      if (!guildTagOk(tag)) return json(res, 400, { err: 'Sigla: 2 a 4 letras ou números.' });
      if (Object.values(DB.guilds).some(x => x.name.toLowerCase() === name.toLowerCase() || x.tag === tag)) return json(res, 400, { err: 'Já existe uma guilda com esse nome ou sigla.' });
      if (Object.keys(DB.guilds).length >= 5000) return json(res, 503, { err: 'Limite de guildas atingido.' });
      const id = rnd(5); DB.guilds[id] = { id, name, tag, leader: acc.id, members: [acc.id], desc: '', created: now() }; acc.guild = id; persist();
      return json(res, 200, { ok: true, guild: guildView(DB.guilds[id], true) });
    }
    if (act === 'join') {
      if (g) return json(res, 400, { err: 'Você já está em uma guilda.' });
      const t = DB.guilds[String(b.id || '')]; if (!t) return json(res, 404, { err: 'Guilda não encontrada.' });
      if (t.members.length >= GUILD.maxMembers) return json(res, 400, { err: 'Guilda lotada.' });
      t.members.push(acc.id); acc.guild = t.id; persist(); return json(res, 200, { ok: true, guild: guildView(t, true) });
    }
    if (!g) return json(res, 400, { err: 'Você não está em uma guilda.' });
    if (act === 'leave') { guildRemove(g, acc.id); persist(); return json(res, 200, { ok: true }); }
    if (g.leader !== acc.id) return json(res, 403, { err: 'Só o líder pode fazer isso.' });
    if (act === 'disband') { for (const id of g.members) { const a = DB.accounts[id]; if (a) a.guild = null; } delete DB.guilds[g.id]; persist(); return json(res, 200, { ok: true }); }
    if (act === 'desc') { g.desc = String(b.desc || '').replace(/[\r\n<>]+/g, ' ').trim().slice(0, 140); persist(); return json(res, 200, { ok: true, guild: guildView(g, true) }); }
    if (act === 'kick' || act === 'lead') {
      const t = DB.accounts[byNick.get(String(b.nick || '').toLowerCase())];
      if (!t || t.guild !== g.id || t.id === acc.id) return json(res, 400, { err: 'Membro inválido.' });
      if (act === 'kick') guildRemove(g, t.id); else g.leader = t.id;
      persist(); return json(res, 200, { ok: true, guild: guildView(g, true) });
    }
    return json(res, 404, { err: 'não encontrado' });
  }
  if (p === '/api/billing/verify' && m === 'POST') {   // diamantes via Google Play (base; exige PLAY_PACKAGE e PLAY_SERVICE_ACCOUNT)
    if (!ENV.PLAY_PACKAGE || !ENV.PLAY_SERVICE_ACCOUNT) return json(res, 503, { err: 'Compras ainda não estão ativadas neste servidor.' });
    if (!rate('bl:' + acc.id, 10, 60e3)) return json(res, 429, { err: 'Muitas tentativas.' });
    let b; try { b = await body(req, 4096); } catch (e) { return json(res, 400, { err: 'Requisição inválida.' }); }
    const sku = String(b && b.sku || ''), tok = String(b && b.token || ''), n = DIAMOND_SKUS[sku];
    if (!n || tok.length < 10 || tok.length > 1000) return json(res, 400, { err: 'Compra inválida.' });
    const key = sha(tok); if (DB.purchases[key]) return json(res, 400, { err: 'Esta compra já foi resgatada.' });
    DB.purchases[key] = { acc: acc.id, sku, t: now(), st: 'pend' };   // reserva antes de consultar: impede resgate em duplicidade
    let v; try { v = await playVerify(sku, tok); } catch (e) { v = { err: 'Não foi possível falar com o Google Play.' }; }
    if (!v.ok) { delete DB.purchases[key]; return json(res, 400, { err: v.err }); }
    DB.purchases[key].st = 'ok'; acc.diamonds = (acc.diamonds | 0) + n; persist(); log('diamantes', acc.nick, sku);
    return json(res, 200, { ok: true, diamonds: acc.diamonds });
  }
  if (p === '/api/save' && m === 'GET') { const s = readSave(acc.id); return json(res, 200, { ok: true, save: s ? s.data : null, rev: s ? s.rev : 0 }); }
  if (p === '/api/save' && m === 'PUT') {
    if (!rate('sv:' + acc.id, 12, 60e3)) return json(res, 429, { err: 'Salvando rápido demais.' });
    let b; try { b = await body(req, 400e3); } catch (e) { return json(res, 400, { err: 'Save grande demais ou inválido.' }); }
    const prev = readSave(acc.id), v = validateSave(b.save, prev);
    if (v.err) { acc.flags = (acc.flags || 0) + 1; persist(); log('save recusado', acc.nick, v.err); return json(res, 422, { err: v.err }); }
    v.o.name = acc.nick;
    const rev = (prev ? prev.rev : 0) + 1; writeSave(acc.id, { rev, t: now(), data: v.o });
    const c = online.get(acc.id); if (c) c.level = v.st.level;
    acc.rk = { melee: v.st.sk.melee.lv, dist: v.st.sk.dist.lv, magic: v.st.sk.magic.lv, def: v.st.sk.def.lv, mx: v.st.sk.melee.xp, dx: v.st.sk.dist.xp, gx: v.st.sk.magic.xp, fx: v.st.sk.def.xp }; persist();
    return json(res, 200, { ok: true, rev });
  }
  if (p === '/api/save' && m === 'DELETE') { try { fs.unlinkSync(saveFile(acc.id)); } catch (e) { } acc.pend = true; persist(); const c = online.get(acc.id); if (c) c.level = 1; return json(res, 200, { ok: true }); }
  return json(res, 404, { err: 'não encontrado' });
}

function admin(req, res, url) {
  if (!CFG.admin || bearer(req) !== CFG.admin) return json(res, 403, { err: 'proibido' });
  const p = url.pathname;
  if (p === '/api/admin/list') return json(res, 200, Object.values(DB.accounts).map(a => ({ id: a.id, nick: a.nick, email: a.email, flags: a.flags, strikes: a.strikes, banUntil: a.banUntil, mutedUntil: a.mutedUntil || 0, online: online.has(a.id) })));
  if (p === '/api/admin/reports') return json(res, 200, DB.reports.slice(-100).reverse());
  const mm = p.match(/^\/api\/admin\/(mute|unmute)\/([0-9a-f]{16})(?:\/(\d{1,6}))?$/);
  if (mm) { const a = DB.accounts[mm[2]]; if (!a) return json(res, 404, { err: 'sem conta' }); if (mm[1] === 'mute') muteAcc(a, (+mm[3] || 60) * 60e3, 'decisão da moderação'); else { a.mutedUntil = 0; a.chatOff = []; persist(); } return json(res, 200, { ok: true }); }
  const rr = p.match(/^\/api\/admin\/role\/([0-9a-f]{16})\/(admin|gm|none)$/);
  if (rr) { const a = DB.accounts[rr[1]]; if (!a) return json(res, 404, { err: 'sem conta' }); a.role = rr[2] === 'none' ? '' : rr[2]; persist(); return json(res, 200, { ok: true }); }
  const dd = p.match(/^\/api\/admin\/diamonds\/([0-9a-f]{16})\/(-?\d{1,7})$/);
  if (dd) { const a = DB.accounts[dd[1]]; if (!a) return json(res, 404, { err: 'sem conta' }); a.diamonds = Math.max(0, (a.diamonds | 0) + +dd[2]); persist(); return json(res, 200, { ok: true, diamonds: a.diamonds }); }
  const m = p.match(/^\/api\/admin\/(ban|unban)\/([0-9a-f]{16})$/);
  if (m) { const a = DB.accounts[m[2]]; if (!a) return json(res, 404, { err: 'sem conta' }); a.banUntil = m[1] === 'ban' ? now() + 10 * 365 * 864e5 : 0; a.strikes = 0; persist(); const c = online.get(a.id); if (c && m[1] === 'ban') c.close('Conta suspensa.'); return json(res, 200, { ok: true }); }
  return json(res, 404, { err: 'não encontrado' });
}

const cache = {};
const EMB = (typeof __EMB !== 'undefined') ? __EMB : null;      // modo "arquivo único": o jogo vai embutido neste próprio arquivo
const embBuf = {};
function serveEmb(req, res, rel) {
  let buf, ext = path.extname(rel).toLowerCase();
  if (rel === '/three.min.js') { try { buf = fs.readFileSync(path.join(CFG.dataDir, 'three.min.js')); } catch (e) { res.writeHead(404); return res.end('Não encontrado'); } }
  else {
    const e = EMB[rel]; if (!e) { res.writeHead(404); return res.end('Não encontrado'); }
    buf = embBuf[rel] || (embBuf[rel] = Buffer.from(e, 'base64'));
    if (rel === '/index.html') buf = embBuf.idx || (embBuf.idx = Buffer.from(buf.toString('utf8').replace('<head>', '<head>\n<script>window.CL_SERVER="";window.CL_SITE=' + JSON.stringify(SITE_URL) + ';</script>')));
  }
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': buf.length, 'Cache-Control': (rel === '/sw.js' || rel === '/index.html') ? 'no-cache' : 'public, max-age=3600' });
  res.end(buf);
}
function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname); if (rel === '/') rel = '/index.html';
  if (rel === '/site') { res.writeHead(301, { Location: '/site/' }); return res.end(); }
  if (rel.endsWith('/')) rel += 'index.html';
  if (EMB) return serveEmb(req, res, rel);
  const f = path.normalize(path.join(CFG.publicDir, rel));
  if (!f.startsWith(CFG.publicDir + path.sep) || (/(^|[\\/])\./.test(rel) && !rel.startsWith('/.well-known/'))) { res.writeHead(404); return res.end('Não encontrado'); }
  fs.stat(f, (er, st) => {
    if (er || !st.isFile()) { res.writeHead(404); return res.end('Não encontrado'); }
    const ext = path.extname(f).toLowerCase(), h = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    h['Cache-Control'] = (rel === '/sw.js' || rel === '/index.html') ? 'no-cache' : 'public, max-age=3600';
    if (rel === '/index.html') {
      let t = cache.index; if (!t || t.m !== st.mtimeMs) { let s = fs.readFileSync(f, 'utf8'); s = s.replace('<head>', '<head>\n<script>window.CL_SERVER="";window.CL_SITE=' + JSON.stringify(SITE_URL) + ';</script>'); t = cache.index = { m: st.mtimeMs, b: Buffer.from(s) }; }
      h['Content-Length'] = t.b.length; res.writeHead(200, h); return res.end(t.b);
    }
    h['Content-Length'] = st.size; res.writeHead(200, h); fs.createReadStream(f).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const ip = ipOf(req), url = new URL(req.url, 'http://x');
  secHeaders(res, req.headers['x-forwarded-proto'] === 'https');
  try {
    if (url.pathname.startsWith('/api/')) {   // CORS: o site oficial é independente (outro endereço). /api/site/* é público; o resto só para SITE_ORIGIN
      const o = req.headers.origin, pub = url.pathname.startsWith('/api/site/'), okO = o && (SITE_ORIGINS.includes(o) || (pub && SITE_ORIGINS.length === 0) || (pub && SITE_ORIGINS.includes('*')));
      if (okO) { res.setHeader('Access-Control-Allow-Origin', pub && !SITE_ORIGINS.includes(o) ? '*' : o); res.setHeader('Vary', 'Origin'); res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); res.setHeader('Access-Control-Max-Age', '600'); }
      if (req.method === 'OPTIONS') { res.writeHead(okO ? 204 : 403); return res.end(); }
    }
    if (url.pathname.startsWith('/api/admin/')) return admin(req, res, url);
    if (url.pathname.startsWith('/api/')) return await api(req, res, url, ip);
    if (url.pathname === '/oauth/cb' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(OA_PAGE + 'try{var q=new URLSearchParams(location.hash.slice(1));window.opener&&window.opener.postMessage({cl_oauth:1,provider:"google",idToken:q.get("id_token")||"",state:q.get("state")||""},location.origin)}catch(e){}setTimeout(function(){window.close()},300)</script>');
    }   // o Google devolve o token no #fragmento; a página repassa à janela do jogo
    if (url.pathname === '/oauth/apple' && req.method === 'POST') {
      let raw = ''; try { raw = (await new Promise((ok, no) => { let n = 0; const ch = []; req.on('data', c => { n += c.length; if (n > 16384) { no(new Error('grande')); req.destroy(); } else ch.push(c); }); req.on('end', () => ok(Buffer.concat(ch).toString('utf8'))); req.on('error', no); })); } catch (e) { res.writeHead(400); return res.end(); }
      const q = new URLSearchParams(raw); return oaPage(res, 'apple', q.get('id_token'), q.get('state'));
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    return serveStatic(req, res, url);
  } catch (e) { log('erro', e && e.stack || e); try { json(res, 500, { err: 'Erro interno.' }); } catch (_) { } }
});
server.requestTimeout = 30e3; server.headersTimeout = 15e3;

/* ---------------------------------------------------------------- WebSocket (RFC 6455, mínimo) */
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
function frame(op, payload) {
  const len = payload.length; let h;
  if (len < 126) h = Buffer.from([0x80 | op, len]); else if (len < 65536) { h = Buffer.alloc(4); h[0] = 0x80 | op; h[1] = 126; h.writeUInt16BE(len, 2); } else { h = Buffer.alloc(10); h[0] = 0x80 | op; h[1] = 127; h.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([h, payload]);
}
const conns = new Set(), perIp = new Map();
const TOPICS_NEAR = { skill: 400, hit: 400, gdrop: 300, gpick: 300, heal: 110 };   // alcance (m) ao redor de quem enviou
const TOPICS_GLOBAL = new Set(['pinv', 'pacc', 'pset', 'pleave', 'tinv', 'tacc', 'toff', 'tok', 'tcancel', 'tdone']);
const LIM = { chat: [+ENV.CHAT_RL || 4, 8e3], hit: [30, 1e3], skill: [12, 1e3], gdrop: [20, 1e3], gpick: [20, 1e3], heal: [3, 3e3], pvh: [14, 1e3], pvk: [3, 5e3], other: [20, 5e3], p: [40, 1e3], rep: [20, 60e3] };   // [máx, janela ms]
const CHK_ICONS = ['🛡️', '⚔️', '🏹', '🔮', '🐉', '👑', '🔥', '❄️', '🌙', '⭐'];
const NUMKEY = new Set(['x', 'z', 'yw', 'pt', 'jy', 'v', 'dg', 'dgs', 'dd', 'ax', 'az', 'sw']);

const MUTE_STEPS = [5 * 60e3, 3600e3, 5 * 3600e3];   // 1ª ofensa: 5 min · 2ª em 24 h: 1 h · 3ª (e seguintes) em 24 h: 5 h
const REASONS = { chat: 'Chat ofensivo', nome: 'Nome impróprio', trapaca: 'Trapaça ou robô', outro: 'Outro' };
const chatLog = [];   // últimas mensagens (serve de prova nas denúncias)
const fmtDur = ms => ms < 3600e3 ? Math.max(1, Math.ceil(ms / 60e3)) + ' min' : Math.ceil(ms / 3600e3) + ' h';
function muteAcc(a, ms, why) { a.mutedUntil = Math.max(a.mutedUntil || 0, now() + ms); persist(); log('chat silenciado', a.nick, fmtDur(ms), why); const c = online.get(a.id); if (c) c.send({ t: 'sys', bad: true, msg: '🔇 Seu chat foi silenciado por ' + fmtDur(ms) + ' (' + why + ').' }); }

setInterval(() => { for (const c of conns) if (c.ready && c.alive) c.pvRefresh(); }, 10e3).unref();
class Conn {
  constructor(sock, ip) {
    this.sock = sock; this.ip = ip; this.buf = Buffer.alloc(0); this.frag = null; this.acc = null; this.alive = true;
    this.id = rnd(4); this.tk = null; this.pres = {}; this.ver = 0; this.sent = new Map(); this.rl = {}; this.level = 1; this.pvLast = 0; this.pvWhite = 0; this.pvDown = 0; this.pvBy = null; this.pvAtk = new Map();
    this.lastChat = ''; this.lastChatT = 0; this.lastMuteMsg = 0; this.chk = null; this.nextChk = now() + (25 + Math.random() * 30) * 60e3; this.lastHb = now();
    this.authT = setTimeout(() => this.close('Sem autenticação.'), 6e3);
    sock.on('data', d => this.onData(d)); sock.on('close', () => this.gone()); sock.on('error', () => this.gone());
    sock.setNoDelay(true); sock.setTimeout(60e3, () => this.close('Tempo esgotado.'));
  }
  send(o) { if (!this.alive) return; try { this.sock.write(frame(1, Buffer.from(JSON.stringify(o)))); } catch (e) { } }
  close(why) { if (!this.alive) return; if (why) this.send({ t: 'kick', why }); this.alive = false; try { this.sock.write(frame(8, Buffer.alloc(0))); } catch (e) { } try { this.sock.end(); } catch (e) { } setTimeout(() => { try { this.sock.destroy(); } catch (e) { } }, 300); this.gone(); }
  gone() {
    if (this.dead) return; this.dead = true; this.alive = false; clearTimeout(this.authT); conns.delete(this);
    perIp.set(this.ip, Math.max(0, (perIp.get(this.ip) || 1) - 1));
    if (this.acc && online.get(this.acc.id) === this) { online.delete(this.acc.id); for (const c of conns) if (c.ready) { c.sent.delete(this.id); c.send({ t: 's', u: [], d: [this.id] }); } }
  }
  onData(d) {
    this.buf = Buffer.concat([this.buf, d]); if (this.buf.length > 70e3) return this.close('Dados demais.');
    for (;;) {
      const b = this.buf; if (b.length < 2) return;
      const op = b[0] & 15, fin = !!(b[0] & 128), masked = !!(b[1] & 128); let len = b[1] & 127, o = 2;
      if (!masked) return this.close('Protocolo inválido.');
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); o = 4; } else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); o = 10; }
      if (len > 16e3) return this.close('Mensagem grande demais.');
      if (b.length < o + 4 + len) return;
      const mask = b.subarray(o, o + 4), pl = Buffer.from(b.subarray(o + 4, o + 4 + len));
      for (let i = 0; i < len; i++) pl[i] ^= mask[i & 3];
      this.buf = b.subarray(o + 4 + len);
      if (op === 8) return this.close();
      if (op === 9) { try { this.sock.write(frame(10, pl)); } catch (e) { } continue; }
      if (op === 10) continue;
      if (op === 0 && this.frag) { this.frag.push(pl); if (this.frag.reduce((n, x) => n + x.length, 0) > 16e3) return this.close('Mensagem grande demais.'); if (fin) { const all = Buffer.concat(this.frag); this.frag = null; this.onMsg(all.toString('utf8')); } continue; }
      if (op === 1) { if (fin) this.onMsg(pl.toString('utf8')); else this.frag = [pl]; continue; }
      return this.close('Tipo de mensagem não aceito.');
    }
  }
  ok(kind) { const [max, win] = LIM[kind] || LIM.other; return rate('w:' + this.id + ':' + kind, max, win); }
  onMsg(txt) {
    let m; try { m = JSON.parse(txt); } catch (e) { return this.close('Mensagem inválida.'); }
    if (!m || typeof m !== 'object') return;
    if (!this.ready) { if (m.t === 'auth') return this.auth(m); return this.close('Autentique primeiro.'); }
    if (!rate('w:' + this.id + ':all', 120, 1e3)) { this.strike('flood'); return this.close('Mensagens demais.'); }
    switch (m.t) {
      case 'p': if (this.ok('p')) this.setPres(m.p); break;
      case 'e': this.onEvent(m.topic, m.data); break;
      case 'hb': this.heartbeat(m.ac); break;
      case 'chk': this.chkAnswer(m); break;
      case 'rep': this.report(m); break;
    }
  }
  auth(m) {
    const acc = sessionOf(m.token);
    if (!acc) return this.close('Sessão inválida. Entre novamente.');
    if (acc.banUntil > now()) return this.close('Conta em espera/suspensa.');
    if (conns.size >= CFG.maxPlayers) return this.close('Servidor cheio. Tente em instantes.');
    const old = online.get(acc.id); if (old) old.close('Sua conta entrou em outro lugar.');
    clearTimeout(this.authT); this.acc = acc; this.tk = rnd(4); this.ready = true; online.set(acc.id, this);
    const sv = readSave(acc.id); this.level = sv ? Core.deserialize(sv.data).level : 1;
    this.send({ t: 'ready', peer: this.id, tk: this.tk, nick: acc.nick, online: online.size }); this.pvRefresh(true);
    if (acc.mutedUntil > now()) this.send({ t: 'sys', bad: true, msg: '🔇 Seu chat está silenciado por mais ' + fmtDur(acc.mutedUntil - now()) + '.' });
    log('entrou', acc.nick, 'online', online.size);
  }
  setPres(p) {
    if (!p || typeof p !== 'object') return;
    const o = {}; let n = 0;
    for (const k in p) {
      if (++n > 40) break; const v = p[k];
      if (!/^[a-z]{1,4}$/.test(k) || k === 'n' || k === 'lv' || k === 'tk' || k === 'sk') continue;
      if (NUMKEY.has(k)) { if (typeof v === 'number' && isFinite(v)) o[k] = Math.max(-13000, Math.min(13000, v)); }
      else if (typeof v === 'string') o[k] = v.slice(0, 24);
      else if (typeof v === 'number' && isFinite(v)) o[k] = Math.max(-1e4, Math.min(1e4, v));
    }
    if (o.pv !== undefined) o.pv = o.pv ? 1 : 0;
    if (o.pv === 0 && now() - this.pvLast < Core.PVP.lockMs) o.pv = 1;   // não dá para desligar o ⚔️ logo depois de uma briga
    this.pres = Object.assign(this.pres, o, { n: this.acc.nick, lv: this.level, tk: this.tk, sk: this.pres.sk || '' }); this.ver++;
  }
  /* ------- PvP ------- */
  pvRank() { const t = now(); return Core.pvpRank((this.acc.pk || []).filter(x => t - x < Core.PVP.killMs).length, t < this.pvWhite); }
  pvRefresh(force) {
    const r = this.pvRank(), sk = Core.pvpSkull(r);
    if (sk !== (this.pres.sk || '') || force) { this.pres.sk = sk; this.ver++; this.send({ t: 'pv', k: 'me', sk, r, kills: (this.acc.pk || []).filter(x => now() - x < Core.PVP.killMs).length }); }
  }
  pvEvent(topic, data) {
    if (!this.ok(topic)) return;
    const t = now();
    if (topic === 'pvh') {
      const tc = [...conns].find(c => c.ready && c.id === String(data.to));
      const d = +data.d;
      if (!tc || tc === this || !(d > 0) || d > 600 + this.level * 400) return;
      if (this.pres.pv !== 1 || tc.pres.pv !== 1 || this.pres.rg !== 'world' || tc.pres.rg !== 'world') return;
      if (Core.pvpInTown(this.pres.x, this.pres.z) || Core.pvpInTown(tc.pres.x, tc.pres.z)) return;
      if (!(Math.hypot(this.pres.x - tc.pres.x, this.pres.z - tc.pres.z) <= Core.PVP.reach)) return;
      if (!Core.pvpLevelOk(this.level, tc.level) || t < tc.pvDown || t < this.pvDown) return;
      // quem ataca alguém "limpo" que não o atacou antes fica com caveira branca
      const retaliation = t - (tc.pvAtk.get(this.id) || 0) < 30e3;
      if (!retaliation && tc.pvRank() === 0) this.pvWhite = t + Core.PVP.whiteMs;
      this.pvAtk.set(tc.id, t); this.pvLast = t; tc.pvLast = t; tc.pvBy = { id: this.id, t };
      this.pvRefresh();
      const cu = Core.pvpCurse(this.pvRank());
      tc.send({ t: 'pv', k: 'hit', from: this.id, n: this.acc.nick, d: Math.max(1, Math.round(d * (1 - cu))), ranged: data.r === 'r' ? 1 : 0 });
      return;
    }
    if (topic === 'pvk') {   // a vítima avisa que morreu: só vale se alguém a acertou há pouco
      if (!this.pvBy || t - this.pvBy.t > 15e3 || t < this.pvDown) return;
      const kl = [...conns].find(c => c.ready && c.id === this.pvBy.id), lastBy = this.pvBy; this.pvBy = null; this.pvDown = t + 6e3;
      const vr = this.pvRank(), retaliation = kl && t - (this.pvAtk.get(kl.id) || 0) < 30e3;
      let pct = Core.pvpGoldLoss(kl ? kl.pvRank() : 1);
      if (kl) {
        if (vr < 2 && !retaliation) { (kl.acc.pk = kl.acc.pk || []).push(t); if (kl.acc.pk.length > 40) kl.acc.pk.shift(); persist(); }   // matar caveirado ou revidar não conta
        kl.pvRefresh(); kl.pvLast = t;
        kl.send({ t: 'pv', k: 'kill', n: this.acc.nick, r: kl.pvRank() });
      }
      this.pvLast = t; this.send({ t: 'pv', k: 'die', pct, n: kl ? kl.acc.nick : '' });
      log('pvp', kl ? kl.acc.nick : '?', 'matou', this.acc.nick, 'perda', Math.round(pct * 100) + '%');
    }
  }
  onEvent(topic, data) {
    if (typeof topic !== 'string' || topic.length > 8 || !data || typeof data !== 'object') return;
    if (topic === 'pvh' || topic === 'pvk') return this.pvEvent(topic, data);
    const near = TOPICS_NEAR[topic];
    if (topic !== 'chat' && !near && !TOPICS_GLOBAL.has(topic)) return;
    if (!this.ok(topic === 'chat' ? 'chat' : near ? topic : 'other')) return;
    let out;
    if (topic === 'chat') {
      const raw = Core.cleanChat(String(data.t || '')); if (!raw) return;
      const left = (this.acc.mutedUntil || 0) - now();
      if (left > 0) { if (now() - this.lastMuteMsg > 3000) { this.lastMuteMsg = now(); this.send({ t: 'sys', bad: true, msg: '🔇 Você está sem chat por mais ' + fmtDur(left) + '.' }); } return; }
      if (Core.chatSevere(raw)) return this.offend();
      if (raw === this.lastChat && now() - this.lastChatT < 10e3) return;
      this.lastChat = raw; this.lastChatT = now();
      out = { n: this.acc.nick, t: raw };      // texto sem censura leve: quem recebe aplica o filtro de *** conforme a própria opção
      chatLog.push({ t: now(), acc: this.acc.id, n: this.acc.nick, txt: raw }); if (chatLog.length > 300) chatLog.shift();
    } else {
      const js = JSON.stringify(data); if (js.length > 2500) return;
      out = JSON.parse(js); out.tk = this.tk;
      if (topic === 'hit') {
        if (!Number.isInteger(out.i) || out.i < 0 || out.i > 9999) return;
        const cap = 600 + this.level * 400; if (!(out.d > 0) || out.d > cap) { this.strike('dano'); return; }
        out = { i: out.i, d: Math.round(out.d) };
      }
    }
    const msg = { t: 'e', topic, peer: this.id, data: out };
    for (const c of conns) {
      if (!c.ready || c === this) continue;
      if (near) { const dx = c.pres.x - this.pres.x, dz = c.pres.z - this.pres.z; if (c.pres.rg !== this.pres.rg || !(Math.hypot(dx, dz) <= near)) continue; }
      c.send(msg);
    }
  }
  /* ------- moderação de chat ------- */
  offend() {
    const a = this.acc, t = now(); a.chatOff = (a.chatOff || []).filter(x => t - x < 864e5); a.chatOff.push(t);
    const n = a.chatOff.length, dur = MUTE_STEPS[Math.min(n - 1, MUTE_STEPS.length - 1)];
    a.flags = (a.flags || 0) + 1; muteAcc(a, dur, 'linguagem imprópria');
    this.send({ t: 'sys', bad: true, msg: '🚫 Mensagem bloqueada: linguagem imprópria.' + (n < MUTE_STEPS.length ? ' Se repetir nas próximas 24 h, o tempo sem chat aumenta.' : '') });
  }
  report(m) {
    if (!rate('rep:' + this.acc.id, 6, 3600e3)) return this.send({ t: 'sys', bad: true, msg: 'Você já enviou denúncias demais. Tente mais tarde.' });
    const tc = [...conns].find(c => c.ready && c.id === m.peer); if (!tc || tc === this) return;
    const why = REASONS[m.why] ? m.why : 'outro', t = now(), ta = tc.acc;
    if (DB.reports.some(r => r.by === this.acc.id && r.target === ta.id && t - r.t < 3600e3)) return this.send({ t: 'sys', msg: 'Você já denunciou esse jogador há pouco. Obrigado!' });
    DB.reports.push({ id: rnd(4), t, by: this.acc.id, byNick: this.acc.nick, target: ta.id, tNick: ta.nick, why, ctx: chatLog.filter(x => x.acc === ta.id).slice(-6).map(x => ({ t: x.t, txt: x.txt })) });
    if (DB.reports.length > 1000) DB.reports.splice(0, DB.reports.length - 1000);
    persist(); log('denúncia', this.acc.nick, '→', ta.nick, why);
    this.send({ t: 'sys', msg: '✅ Denúncia enviada. Obrigado por ajudar a manter o jogo seguro!' });
    const by = new Set(DB.reports.filter(r => r.target === ta.id && t - r.t < 864e5).map(r => r.by));
    if (by.size >= 3 && t - (ta.autoMuteAt || 0) > 864e5) { ta.autoMuteAt = t; muteAcc(ta, 3600e3, 'várias denúncias de outros jogadores'); }
  }
  /* ------- anti auto-click ------- */
  heartbeat(ac) {
    this.lastHb = now(); if (!ac || typeof ac !== 'object' || this.chk) return;
    const n = +ac.n | 0, mean = +ac.m, sd = +ac.sd, nt = +ac.nt | 0, u = +ac.u | 0;
    if (nt > 0) return this.strike('cliques sintéticos');
    if (n >= 80 && sd < 6) return this.strike('cliques regulares demais');
    if (n >= 150 && mean < 55) return this.strike('cliques rápidos demais');
    if (n >= 100 && u <= 2) return this.strike('padrão repetido');
  }
  strike(why) {
    if (!this.acc || this.chk) return; this.acc.flags = (this.acc.flags || 0) + 1; persist(); log('suspeita', this.acc.nick, why);
    this.challenge(why);
  }
  challenge(why) {
    const ans = crypto.randomInt(CHK_ICONS.length), id = rnd(4), opts = CHK_ICONS.slice().sort(() => Math.random() - .5).slice(0, 6);
    if (!opts.includes(CHK_ICONS[ans])) opts[0] = CHK_ICONS[ans]; opts.sort(() => Math.random() - .5);
    this.chk = { id, ans: CHK_ICONS[ans], exp: now() + 30e3, why };
    this.send({ t: 'chk', id, q: CHK_ICONS[ans], opts, ms: 30e3 });
  }
  chkAnswer(m) {
    const c = this.chk; if (!c || m.id !== c.id) return;
    if (m.a === c.ans && now() < c.exp) { this.chk = null; this.nextChk = now() + (25 + Math.random() * 30) * 60e3; this.send({ t: 'sys', msg: '✅ Verificação concluída. Bom jogo!' }); }
    else this.failChk('resposta errada');
  }
  failChk(why) {
    const a = this.acc; a.strikes = (a.strikes || 0) + 1; this.chk = null;
    a.banUntil = now() + (a.strikes >= 3 ? 3650 * 864e5 : a.strikes * 5 * 60e3); persist(); log('verificação falhou', a.nick, why, 'strikes', a.strikes);
    this.close(a.strikes >= 3 ? 'Conta suspensa por uso de robô/auto-click.' : 'Verificação anti-robô falhou. Você poderá entrar de novo em ' + a.strikes * 5 + ' min.');
  }
}

server.on('upgrade', (req, sock) => {
  const ip = ipOf(req), url = new URL(req.url, 'http://x');
  const bad = c => { try { sock.write(`HTTP/1.1 ${c}\r\nConnection: close\r\n\r\n`); } catch (e) { } sock.destroy(); };
  if (url.pathname !== '/ws' || String(req.headers.upgrade).toLowerCase() !== 'websocket') return bad('400 Bad Request');
  const org = req.headers.origin;
  if (org) { let h = ''; try { h = new URL(org).host; } catch (e) { } if (h !== req.headers.host && !(CFG.publicUrl && org === CFG.publicUrl) && !/^(localhost|127\.0\.0\.1)(:|$)/.test(h)) return bad('403 Forbidden'); }
  if (!rate('wsc:' + ip, 30, 60e3) || (perIp.get(ip) || 0) >= 6) return bad('429 Too Many Requests');
  const key = req.headers['sec-websocket-key']; if (!key) return bad('400 Bad Request');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + crypto.createHash('sha1').update(key + GUID).digest('base64') + '\r\n\r\n');
  perIp.set(ip, (perIp.get(ip) || 0) + 1);
  conns.add(new Conn(sock, ip));
});

/* envio periódico dos jogadores: perto 10 Hz, médio 3 Hz, longe ~0,7 Hz (só o que mudou) */
let tickN = 0;
setInterval(() => {
  tickN++; const t = now(), list = [...conns].filter(c => c.ready);
  for (const a of list) {
    const u = [];
    for (const b of list) {
      if (a === b || !b.pres || b.pres.x === undefined) continue;
      const last = a.sent.get(b.id); if (last && last.v === b.ver) continue;
      const d = a.pres.rg === b.pres.rg ? Math.hypot(a.pres.x - b.pres.x, a.pres.z - b.pres.z) : 1e9;
      const gap = d <= CFG.nearM ? 0 : d <= CFG.midM ? 300 : 1400;
      if (last && t - last.t < gap) continue;
      a.sent.set(b.id, { v: b.ver, t }); u.push([b.id, b.pres]);
    }
    if (u.length) a.send({ t: 's', u, d: [] });
    if (a.chk && t > a.chk.exp) a.failChk('tempo esgotado');
    else if (!a.chk && t > a.nextChk) { a.nextChk = t + 5 * 60e3; a.challenge('verificação periódica'); }
  }
}, 100);
setInterval(() => { for (const c of conns) if (c.ready && now() - c.lastHb > 90e3) c.close('Sem sinal do cliente.'); }, 30e3).unref();

/* ---------------------------------------------------------------- three.js: baixa 1x se faltar (para o app funcionar offline) */
function ensureThree() {
  const f = path.join(EMB ? CFG.dataDir : CFG.publicDir, 'three.min.js'); if (fs.existsSync(f)) return;
  https.get('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', r => {
    if (r.statusCode !== 200) { r.resume(); return log('não consegui baixar three.js (o jogo usará a CDN)'); }
    const ch = []; r.on('data', c => ch.push(c)); r.on('end', () => { fs.writeFileSync(f, Buffer.concat(ch)); log('three.min.js baixado'); });
  }).on('error', () => log('não consegui baixar three.js (o jogo usará a CDN)'));
}

if (require.main === module) {
  ensureThree();
  server.listen(CFG.port, () => log(`Cavaleiros da Luz — servidor na porta ${CFG.port} | e-mail:${mailOn ? 'ligado' : 'desligado (contas já verificadas)'} | contas:${Object.keys(DB.accounts).length}`));
}
module.exports = { server, CFG, DB };
