# Cavaleiros da Luz — tudo pronto para copiar no Play Console

## Detalhes do app
- **Nome do app** (máx. 30): `Cavaleiros da Luz`
- **Categoria:** Jogos › Ação (ou RPG)
- **Tipo:** Jogo · **Gratuito**
- **E-mail de contato:** jv827837@gmail.com
- **Política de privacidade (URL):** `https://SEU-ENDERECO/privacidade.html`  ← troque pelo endereço do Render

## Descrição curta (máx. 80)
`RPG de ação 3D online: explore, enfrente chefes e jogue com amigos.`

## Descrição completa
Cavaleiros da Luz é um RPG de ação em 3D, em primeira pessoa, com mundo aberto e multiplayer online.

⚔️ TRÊS ESTILOS DE COMBATE
Treine Corpo a corpo, Distância (arco) e Magia. Cada habilidade evolui com o uso, e você troca de estilo quando quiser.

🌍 MUNDO ABERTO
Explore florestas, clareiras e vilas, descubra masmorras e desça à Cripta do Horizonte.

🐉 CHEFES E TESOUROS
Enfrente o Dragão Ancestral, a Rainha Víbora, o Senhor dos Ossos e o Guardião do Crepúsculo, que guarda a lendária Espada do Eclipse. Colete armaduras, armas e conjuntos raros.

👥 JOGUE COM OUTROS JOGADORES
Veja outros cavaleiros no mundo, converse pelo chat, forme times que dividem experiência, troque itens e derrote monstros juntos.

🎒 PROGRESSO NA SUA CONTA
Entre com e-mail e senha e continue sua aventura em qualquer aparelho. Missões diárias, sequência de login e combos tornam cada partida recompensadora.

🛡️ JOGO JUSTO
Proteção contra robôs e auto-click para que todos joguem em igualdade.

Sem anúncios. Sem compras dentro do aplicativo.

## Gráficos (já na pasta `loja/`)
- Ícone 512×512: `icone-512.png`
- Imagem de recursos 1024×500: `imagem-de-recursos-1024x500.png`
- **Capturas de tela:** o Play exige no mínimo 2 (de celular). Tire do jogo rodando no seu celular (quanto mais variadas, melhor: vila, combate, inventário, chefe). Eu não consigo gerar capturas do 3D daqui.

## Classificação de conteúdo (questionário IARC)
- Categoria: **Jogo**
- Violência: **sim, violência de fantasia** (combate com monstros; sem sangue realista)
- Sangue/gore: não · Conteúdo sexual: não · Linguagem imprópria: não (o chat tem filtro de palavras)
- Drogas/álcool/tabaco: não · Jogos de azar: **não** · Compras no app: **não**
- Interação entre usuários: **sim** (chat e times); compartilha localização: **não**
- Resultado esperado: 12+ / PEGI 12 (confira o resultado que o Play mostrar)

## Público-alvo
Marque **13 anos ou mais** (não marque “crianças”, para evitar regras extras da política de Famílias).

## Anúncios
**Não contém anúncios.**

## Segurança dos dados (Data safety)
- O app coleta ou compartilha dados? **Sim, coleta.** Compartilha com terceiros? **Não.**
- **Dados coletados:**
  - *Informações pessoais › Endereço de e-mail* — finalidade: Gerenciamento de conta; Segurança. Obrigatório. Não compartilhado.
  - *Informações pessoais › Nome (nome de usuário do personagem)* ou *IDs de usuário* — finalidade: Funcionalidade do app; Gerenciamento de conta.
  - *Mensagens › Outras mensagens no app (chat)* — finalidade: Funcionalidade do app. Não guardadas no servidor.
  - *Atividade no app › Interações no app* (progresso do jogo, estatísticas de cliques) — finalidade: Funcionalidade do app; Segurança/prevenção de fraude.
  - *Informações do app e desempenho/ID do dispositivo:* o servidor vê o IP para segurança (anti-robô) — se o Play pedir, declare “Endereço IP… Segurança, prevenção de fraude”.
- **Dados são criptografados em trânsito?** Sim (HTTPS/WSS).
- **Usuários podem pedir exclusão dos dados?** Sim — por e-mail (jv827837@gmail.com) e “Apagar progresso” no menu Conta. Informe também a URL de exclusão: use a mesma da política (`/privacidade.html`).

## Digital Asset Links (para o app abrir em tela cheia, sem barra do Chrome)
Depois de gerar o app, o PWABuilder/Play Console mostra o **SHA-256** da chave. Crie no servidor o arquivo `public/.well-known/assetlinks.json` com:
```
[{"relation":["delegate_permission/common.handle_all_urls"],
  "target":{"namespace":"android_app","package_name":"SEU.PACOTE.AQUI",
  "sha256_cert_fingerprints":["COLE:O:SHA256:AQUI"]}}]
```
(o `package_name` é o ID que você escolheu no PWABuilder, por exemplo `com.cavaleirosdaluz.app`.)
> O servidor já entrega `/.well-known/assetlinks.json`: crie a pasta `.well-known` dentro de `public`, coloque o arquivo e faça o deploy de novo. (Se preferir, me mande o SHA-256 e o pacote e eu gero o arquivo pronto.)
