# Meu Financeiro

App web pessoal e **gratuito** para controlar **cartões, financiamentos e pagamentos**.
Front-end estático (Next.js) + Firebase (login Google + Firestore). Inclui registro de
despesas **por WhatsApp**, interpretadas pela **Claude API**, e importação de extratos **OFX/CSV**.

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
└── whatsapp-bot/         # Robô do WhatsApp (deploy separado na Vercel)
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

## 4. Registro de despesas por WhatsApp (opcional)

O robô fica em [`whatsapp-bot/`](whatsapp-bot/) e roda como função serverless na **Vercel** (grátis).

### a) WhatsApp Cloud API (Meta)
1. Crie um app em [developers.facebook.com](https://developers.facebook.com) → produto **WhatsApp**.
2. Em **API Setup**, anote o **Phone number ID** e o **token de acesso**.
3. Adicione seu número de celular como destinatário de teste.

### b) Claude API
1. Pegue uma chave em [console da Claude](https://console.claude.com) → API Keys.
2. Custo: centavos/mês no seu volume. Para gastar ainda menos, defina `CLAUDE_MODEL=claude-haiku-4-5`.

### c) Deploy do robô na Vercel
1. Crie um projeto na [Vercel](https://vercel.com) apontando para a pasta `whatsapp-bot/`.
2. Em **Settings → Environment Variables**, preencha tudo de [`whatsapp-bot/.env.example`](whatsapp-bot/.env.example):
   - `WHATSAPP_VERIFY_TOKEN` (você inventa), `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `ALLOWED_SENDER` (seu número, ex: `5511999999999`)
   - `ANTHROPIC_API_KEY`
   - `FIREBASE_SERVICE_ACCOUNT` (Console Firebase → Contas de serviço → gerar chave privada → cole o JSON em uma linha) e `APP_USER_UID` (seu UID)
3. A URL do webhook será algo como `https://seu-bot.vercel.app/api/webhook`.

### d) Conectar o webhook na Meta
Em **WhatsApp → Configuration → Webhook**:
- Callback URL: a URL acima
- Verify token: o mesmo `WHATSAPP_VERIFY_TOKEN`
- Inscreva-se no campo **messages**.

### e) Usar
Mande para o número do bot: *"Gastei 100 reais no Itaú"* → ele responde
`✅ Registrado: R$ 100,00 — ...` e o lançamento aparece no app. 🎉

## 5. Importar extrato (alternativa grátis ao WhatsApp)

Baixe o extrato do banco em **OFX** (ou CSV) e use a tela **Importar** — o arquivo é
processado no navegador, nada sai da sua máquina.

## Segurança

- Chaves do Firebase Web são públicas; a proteção real vem de `firestore.rules`.
- Segredos do servidor (token do WhatsApp, `ANTHROPIC_API_KEY`, conta de serviço) ficam
  **só** nas variáveis de ambiente da Vercel — nunca no front-end nem no Git.
