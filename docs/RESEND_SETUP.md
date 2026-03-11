# Resend Email Setup Guide

## Step 1: Register at Resend

1. Go to **[https://resend.com](https://resend.com)**
2. Click **"Sign Up"** (top right)
3. Sign in with your **GitHub account** (recommended) or email
4. You'll be taken to your dashboard

## Step 2: Get Your API Key

1. In the Resend dashboard, click **"API Keys"** in the left sidebar
2. Click **"Create API Key"**
3. Give it a name (e.g., "SMM Hub Production")
4. Choose permission level:
   - **Full Access** – for production
   - **Sending Access** – recommended (can only send, not manage domains)
5. Click **"Create API Key"**
6. **Copy the key immediately** – it starts with `re_` (e.g., `re_xxxxxxxxxxxxx`)

## Step 3: Add API Key to Your Environment

### Local Development
```bash
# Copy .env.example to .env.local
cp .env.example .env.local

# Edit .env.local and add your key:
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Vercel Production
1. Go to your project on **Vercel dashboard**
2. Click **Settings** → **Environment Variables**
3. Click **"Add Environment Variable"**
4. Add:
   - Name: `RESEND_API_KEY`
   - Value: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Environments: Check **Production**, **Preview**, **Development**
5. Click **"Save"**

## Step 4: Configure Sending Domain (Optional but Recommended)

By default, emails come from `onboarding@resend.dev` (Resend's domain). For production:

1. In Resend dashboard, click **"Domains"**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records to your domain provider:
   - **MX records** (for receiving)
   - **TXT records** (for verification & SPF/DKIM)
5. Wait for DNS propagation (5-30 minutes)
6. Once verified, you can send from `you@yourdomain.com`

## Step 5: Test It

### Using curl:
```bash
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"to": "your-email@example.com", "userName": "Test User"}'
```

### Using the API directly:
```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "subject": "Test Email",
    "html": "<h1>Hello!</h1><p>This is a test.</p>"
  }'
```

## Free Tier Limits

- **3,000 emails/month** free
- **100 emails/day** free
- Perfect for development and small production apps

## Usage in Your Code

```ts
import { sendWelcomeEmail, sendEmail } from '@/lib/email';

// Send welcome email
await sendWelcomeEmail('user@example.com', 'John');

// Send custom email
await sendEmail({
  to: 'user@example.com',
  subject: 'Your Order',
  html: '<p>Your order has shipped!</p>',
});
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `RESEND_API_KEY not configured` | Add the key to `.env.local` or Vercel env vars |
| `Domain not verified` | Use `onboarding@resend.dev` or verify your domain |
| Emails going to spam | Verify your domain and set up SPF/DKIM records |
| Rate limit errors | You've exceeded free tier – upgrade or wait |
