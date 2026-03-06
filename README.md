# SMM Hub — Deployment Guide
## Stack: Next.js 14 · Prisma · Neon Postgres · Vercel

---

## 1. Neon Database Setup (5 min)

1. Go to **https://console.neon.tech** → Create account → New project
2. Name it `smm-hub`, region closest to you
3. Click **Connection Details** → copy two strings:
   - **Pooled connection** → this is your `DATABASE_URL`
   - **Direct connection** → this is your `DIRECT_URL`
4. Keep this tab open — you'll need these in step 3

---

## 2. GitHub Repo

```bash
git init
git add .
git commit -m "init smm-hub"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/smm-hub.git
git push -u origin main
```

---

## 3. Vercel Deployment

1. Go to **https://vercel.com** → Add New Project → Import your GitHub repo
2. Framework: **Next.js** (auto-detected)
3. Before clicking Deploy, open **Environment Variables** and add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | your Neon pooled connection string |
| `DIRECT_URL` | your Neon direct connection string |
| `ADMIN_PIN` | your chosen PIN (change from 1234!) |

4. Click **Deploy** — Vercel builds and goes live

---

## 4. Run Database Migrations

After first deploy, run this once locally with your `.env.local` filled in:

```bash
# Copy the example env file
cp .env.example .env.local
# Fill in your Neon connection strings, then:

npm install
npx prisma migrate dev --name init
```

This creates all tables in Neon. After that, Vercel picks up the schema automatically on every deploy.

---

## 5. Seed Initial API Keys

On first load, hit `GET /api/admin/keys` with header `x-admin-pin: YOUR_PIN` to auto-create the 3 API keys in the database. The Settings tab in the app does this automatically.

---

## 6. Your Live Endpoints

Once deployed, your traffic sources POST to:

```
POST https://your-app.vercel.app/api/leads/organic
POST https://your-app.vercel.app/api/leads/paid
POST https://your-app.vercel.app/api/purchases
```

All require header: `x-api-key: sk-smm-...` (shown in Settings tab)

---

## 7. Example: Connect Meta Ads via Zapier/Make

If you're using Make.com or Zapier to pipe Meta Ads data:

- Trigger: New lead from Meta Lead Ads
- Action: HTTP POST to `https://your-app.vercel.app/api/leads/paid`
- Headers: `x-api-key: YOUR_PAID_KEY`, `Content-Type: application/json`
- Body:
```json
{
  "date": "{{now}}",
  "count": 1,
  "adSpend": 0,
  "platform": "meta_ads",
  "campaign": "{{campaign_name}}"
}
```

---

## Local Development

```bash
npm install
cp .env.example .env.local   # fill in your Neon strings
npx prisma db push           # sync schema to Neon
npm run dev                  # http://localhost:3000
```

---

## File Structure

```
smm-hub/
├── app/
│   ├── api/
│   │   ├── leads/
│   │   │   ├── organic/route.ts   ← POST/GET organic leads
│   │   │   └── paid/route.ts      ← POST/GET paid leads
│   │   ├── purchases/route.ts     ← POST/GET purchases
│   │   └── admin/keys/route.ts    ← GET/POST API key management
│   └── page.tsx                   ← your React frontend
├── lib/
│   ├── prisma.ts                  ← Prisma singleton
│   └── auth.ts                    ← API key + admin PIN validation
├── prisma/
│   └── schema.prisma              ← DB schema (all tables)
├── .env.example                   ← copy to .env.local
└── package.json
```
