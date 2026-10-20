# Cavaleiros da Luz — Servidor

Um único servidor Node (sem dependências, Node 20+) que faz tudo: serve o jogo, cria contas, guarda o progresso e liga os jogadores online.

## Rodar no seu computador
```
cd servidor
node server.js          # abre em http://localhost:3000
node tests-server.js    # 45 testes (opcional)
```
Na 1ª vez ele baixa o `three.min.js` sozinho (precisa de internet). Abra `http://localhost:3000`: aparece a tela de login.

## Colocar online (para o app e os jogadores)
Precisa de um host que rode Node **com disco persistente** (é onde ficam `data/db.json` e `data/saves/`). Opções simples:
- **Render.com**: crie um *Web Service* a partir desta pasta (ou use o `render.yaml`), adicione um *Disk* montado em `/data` e a variável `DATA_DIR=/data`. Plano grátis NÃO tem disco: use o plano pago mais barato.
- **Railway / Fly.io**: use o `Dockerfile` incluso e um volume em `/data`.
- **VPS** (Hetzner, DigitalOcean, Oracle Free…): `node server.js` atrás de um proxy HTTPS (Caddy/Nginx). WebSocket precisa estar liberado (`/ws`).
HTTPS é obrigatório para a Play Store. Anote o endereço final (ex.: `https://cavaleiros.exemplo.com`).

### Variáveis de ambiente
| Variável | Para quê |
|---|---|
| `PORT` | porta (as plataformas definem sozinhas) |
| `DATA_DIR` | pasta de dados (aponte para o disco persistente) |
| `PUBLIC_URL` | endereço público, sem `/` no fim (usado nos links de e-mail) |
| `RESEND_API_KEY` + `MAIL_FROM` | ligam o envio de e-mail (https://resend.com): confirmação de conta e “esqueci a senha”. **Sem isso, contas já nascem verificadas e a recuperação de senha fica desligada.** |
| `GOOGLE_CLIENT_ID` | liga o botão "Entrar com Google" (ID de cliente OAuth tipo Web; URI de redirecionamento autorizado: `<PUBLIC_URL>/oauth/cb`) |
| `APPLE_CLIENT_ID` | liga o botão "Entrar com Apple" (Services ID; URL de retorno: `<PUBLIC_URL>/oauth/apple`, precisa de https) |
| `ADMIN_TOKEN` | libera `/api/admin/list`, `/api/admin/ban/<id>`, `/api/admin/unban/<id>` (cabeçalho `Authorization: Bearer <token>`) |
| `MAX_PLAYERS` | limite de jogadores conectados (padrão 200) |
| `POW_REG` / `POW_LOGIN` | dificuldade da prova anti-robô (padrão 18 / 15 bits) |

**Backup:** copie a pasta `DATA_DIR` com frequência. Se ela se perder, todas as contas se perdem.

## Segurança (o que já existe)
- **Senhas**: scrypt com sal único; nunca guardadas em texto. Senha mínima de 8 com letras e números, lista de senhas fracas.
- **Login**: bloqueio de 15 min após 5 erros; limite por IP; resposta idêntica para e-mail inexistente/senha errada; sessões de 30 dias que podem ser revogadas (sair/trocar senha).
- **Anti-robô no cadastro/login**: prova de trabalho (o aparelho resolve um quebra-cabeça de ~1–3 s), campo-isca escondido, tempo mínimo no formulário, limite de contas por IP.
- **Anti auto-click**: o jogo mede o ritmo dos cliques. Cliques sintéticos, perfeitamente regulares ou rápidos demais geram uma verificação (“toque no ícone certo em 30 s”). Também há verificação aleatória a cada ~25–55 min. Falhar = expulsão e espera de 5 min; 2ª falha 10 min; 3ª = conta suspensa (liberar com `/api/admin/unban`).
- **Progresso**: validado no servidor com as regras do jogo: itens têm que existir, limites de nível/habilidade/ouro/abates por tempo, personagem inicial tem que ser nível baixo.
- **Online**: o servidor define nome, nível e identidade de cada jogador (não dá para se passar por outro), filtra o chat, limita a velocidade de cada tipo de mensagem, descarta dano impossível e tópicos desconhecidos, e expulsa quem inunda.
- Cabeçalhos de segurança (CSP, nosniff, HSTS atrás de HTTPS), proteção contra path traversal, tamanho máximo de requisições.

## Moderação de chat
- **Filtro:** palavrões leves viram `***` (quem recebe pode desligar em Configurações). Conteúdo +18, ofensas pesadas, preconceito e ameaças são **bloqueados** (a mensagem nem chega aos outros). Pega variações: maiúsculas, acento, números no lugar de letras (`p0rr4`), letras repetidas, letras separadas (`p u t a`). Nomes de personagem impróprios são recusados no cadastro.
- **Silêncio automático** (só do chat; o jogador continua jogando): 1ª ofensa = **5 min**; 2ª em 24 h = **1 h**; 3ª (e seguintes) em 24 h = **5 h**. Passou de 24 h sem ofender, volta a contar do 5 min.
- **Denunciar e bloquear:** no cartão de cada jogador. 3 denúncias de contas diferentes em 24 h silenciam o denunciado por 1 h automaticamente. Bloquear esconde o jogador, o chat e os convites dele (guardado no aparelho de quem bloqueou).
- **Para você (admin, precisa de `ADMIN_TOKEN`):** `GET /api/admin/reports` (últimas denúncias, com as últimas mensagens do denunciado), `/api/admin/mute/<id>/<minutos>`, `/api/admin/unmute/<id>`, `/api/admin/ban/<id>`, `/api/admin/unban/<id>`, `/api/admin/list`. Use o cabeçalho `Authorization: Bearer <ADMIN_TOKEN>`.
- Nenhum filtro pega 100%: jogadores criativos sempre acham jeito. Por isso existem denúncia, bloqueio e silêncio por reincidência. A lista de palavras fica em `core.js` (`_SEV`, `_SEVJ`, `_MILD`) e pode ser ampliada.

## Atualizar o jogo depois de publicado
O progresso fica no disco do servidor, **não** no app. Para atualizar: substitua o `server.js` no GitHub (mesmo nome); o Render reinstala sozinho em 1–3 min, os jogadores reconectam e já estão na versão nova. Não precisa nova versão na Play Store (só se mudar o próprio app: nome, ícone, endereço). Mantenha o disco e `DATA_DIR`; faça backup da pasta de dados.

## Limites conhecidos (seja honesto com você mesmo)
- Os **monstros e o combate rodam no aparelho de cada jogador** (o servidor só confere o que dá para conferir). Quem modificar o aplicativo ainda poderia, por exemplo, se curar ou acertar mais do que deveria. A validação de save e o limite de evolução barram os abusos grandes (nível/itens/ouro impossíveis), não todos os pequenos.
- A **troca de itens** entre jogadores é combinada entre os dois aparelhos; com um cliente adulterado dá para tentar duplicar item. Se isso virar problema, o próximo passo é a troca ser feita pelo servidor.
- Monstros e itens do chão não são sincronizados: cada um vê os seus; dano em monstros e itens soltos são repassados entre quem está perto.
- Um servidor único e um processo só: bom para algumas centenas de jogadores. Para mais, é preciso dividir em salas/servidores.

## Para o app da Play Store
O app (TWA) deve apontar para o **endereço do servidor** (ele serve o jogo, o `manifest.webmanifest`, os ícones e a política de privacidade em `/privacidade.html`). Siga o `LEIA-ME.md` do pacote `reino-play-store` a partir do “Passo 3”, usando esse endereço. Edite `public/privacidade.html` (data e e-mail de contato) antes de publicar.

## Site oficial, guildas e equipe (novo)
- O site é uma pasta independente (`site-cavaleiros/`, veja o LEIA-ME dela). O servidor também serve uma cópia em `/site/`.
- Variáveis novas (opcionais): `SITE_ORIGIN` (endereços do site liberados para login/guildas, separados por vírgula), `SITE_URL` (link do site mostrado no jogo), `STAFF` (ex.: `Nick:admin,Outro:gm`).
- API pública: `/api/site/stats|rank?k=all|melee|dist|magic|def|staff|guilds|guild?id=`. Guildas (login): `/api/guild/create|join|leave|kick|lead|desc|disband`.
- Admin: `/api/admin/role/<id>/<admin|gm|none>` e `/api/admin/diamonds/<id>/<±n>` (com `ADMIN_TOKEN`).
- Diamantes (base): `/api/billing/verify` só liga com `PLAY_PACKAGE` e `PLAY_SERVICE_ACCOUNT` (JSON da conta de serviço). Não testado com o Google Play real.
