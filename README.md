# Meu Financeiro

App web pessoal e **gratuito** para controlar **cartões, financiamentos e pagamentos**.
Front-end estático (Next.js) + Firebase (login Google + Firestore). Inclui registro de
despesas **por Telegram**, interpretadas pela **Claude API**, e importação de extratos **OFX/CSV**.

## Estrutura

```
felipe-financeiro/
├── app/                  # Telas (Next.js App Router, export estático)
│   ├── page.tsx          # Dashboard
│   ├── cartoes/          # Cartões
│   ├── financiamentos/   # Financiamentos
│   ├── lancamentos/      # Lançamentos/pagamentos
│   ├── importar/         # Importação OFX/CSV
│   └── login/            # Login com Google
├── lib/                  # Firebase, auth, tipos, acesso a dados, importadores
├── components/           # AppShell (nav+guard), Modal
├── firestore.rules       # Regras de segurança (isolam dados por usuário)
└── telegram-bot/         # Robô do Telegram (deploy separado na Vercel)
    ├── api/webhook.js     # Webhook que recebe a mensagem e grava a despesa
    └── lib/               # Firebase Admin + parser via Claude
```

## 1. Rodar localmente

```bash
npm install
npm run dev      # http://localhost:3000
```

As chaves do Firebase já estão em `.env.local` (são públicas por design). Para outro
projeto, copie `.env.local.example` e preencha.

## 2. Configurar o Firebase (uma vez)

No [Console do Firebase](https://console.firebase.google.com) do projeto `financeiro-particular`:

1. **Authentication** → método de login **Google**: já ativado ✅
2. **Firestore Database** → **Criar banco de dados** (modo produção). *(Importante: o app
   usa Firestore, não o Realtime Database.)*
3. **Regras**: publique o conteúdo de [`firestore.rules`](firestore.rules) — elas garantem
   que cada usuário só acessa os próprios dados.
4. Faça login no app, crie um cartão, e confirme que aparece em `users/<seu-uid>/cards`.

> Seu **UID** aparece em Authentication → Usuários (você vai precisar dele para o WhatsApp).

## 3. Publicar o site (grátis)

Gera a pasta estática `out/`:

```bash
npm run build
```

**Opção A — Firebase Hosting**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # public dir: out  | SPA: não
firebase deploy
```

**Opção B — GitHub Pages**: suba o conteúdo de `out/` para o branch `gh-pages` (precisa do Git instalado).

## 4. Registro de despesas por Telegram (opcional)

O robô fica em [`telegram-bot/`](telegram-bot/) e roda como função serverless na **Vercel** (grátis). É bem mais simples que o WhatsApp — sem conta de negócios.

### a) Criar o bot no Telegram
1. No Telegram, fale com o **@BotFather** → `/newbot` → escolha um nome e um usuário.
2. Ele te dá o **token** do bot (algo como `123456:ABC-...`). Guarde.

### b) Claude API
1. Pegue uma chave em [console da Claude](https://console.claude.com) → API Keys.
2. Custo: centavos/mês. Para gastar ainda menos, defina `CLAUDE_MODEL=claude-haiku-4-5`.

### c) Deploy do robô na Vercel
1. Novo projeto na [Vercel](https://vercel.com) → mesmo repositório, mas **Root Directory = `telegram-bot`**.
2. Em **Environment Variables**, preencha conforme [`telegram-bot/.env.example`](telegram-bot/.env.example):
   - `TELEGRAM_BOT_TOKEN` (do BotFather)
   - `ANTHROPIC_API_KEY`
   - `FIREBASE_SERVICE_ACCOUNT` (Console Firebase → Contas de serviço → gerar chave privada → JSON em uma linha) e `APP_USER_UID` (seu UID em Authentication → Usuários)
   - `ALLOWED_CHAT_ID` — **deixe vazio no 1º deploy** (você descobre no passo "e").
3. Deploy. A URL do webhook será `https://SEU-BOT.vercel.app/api/webhook`.

### d) Conectar o webhook (uma vez)
Abra no navegador (troque TOKEN e a URL):
```
https://api.telegram.org/botTOKEN/setWebhook?url=https://SEU-BOT.vercel.app/api/webhook
```
Deve responder `{"ok":true,...}`.

### e) Descobrir seu chat ID e ativar
1. No Telegram, mande qualquer mensagem para o seu bot.
2. Ele responde com **"Seu chat ID é: 12345678"**.
3. Cole esse número em `ALLOWED_CHAT_ID` (Vercel → Settings → Env Vars) → **Redeploy**.

### f) Usar
Mande ao bot: *"Gastei 100 reais no Itaú"* → ele responde
`✅ Registrado: R$ 100,00 — ...` e o lançamento aparece no app. 🎉

## 5. Importar extrato (alternativa grátis ao WhatsApp)

Baixe o extrato do banco em **OFX** (ou CSV) e use a tela **Importar** — o arquivo é
processado no navegador, nada sai da sua máquina.

## Segurança

- Chaves do Firebase Web são públicas; a proteção real vem de `firestore.rules`.
- Segredos do servidor (chaves de IA, conta de serviço) ficam **só** nas variáveis de
  ambiente da Vercel — nunca no front-end nem no Git.

<!-- redeploy: repositório público -->

