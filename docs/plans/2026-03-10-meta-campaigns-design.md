# Meta Campaigns Feature Design
_2026-03-10_

## Overview

Pull Meta ad spend automatically, receive lead/purchase webhooks as counters, display ROI per campaign and ad set in a new Campaigns sub-tab under Traffic.

## Settings

New **"Meta Ads"** section in Settings stores:
- Single long-lived access token (`ads_read` permission is sufficient for all levels)
- Ad Account ID (`act_XXXXXXXXX`)
- API Version (e.g. `v21.0`)
- List of campaign configs (see data model below)

## Data Flow

### A) Hourly spend sync (Vercel cron)
- Runs `0 * * * *` (every hour)
- Calls Meta Graph API twice per campaign config:
  - `level=campaign` → total spend for the day
  - `level=adset` → per-adset spend (filtered to tracked adset names)
- Upserts `MetaSpendLog` for today and yesterday
- Endpoint: `GET https://graph.facebook.com/{version}/act_{accountId}/insights`
  - `fields=spend,campaign_name,adset_name`
  - `level=campaign` or `level=adset`
  - `time_range={"since":"YYYY-MM-DD","until":"YYYY-MM-DD"}`

### B) Lead webhook — `POST /api/webhooks/lead`
- Authenticated via `x-webhook-secret` header (per campaign config)
- Payload: `{ date, utm_campaign, utm_content, utm_term?, count? }`
  - `utm_content` = adset name
  - `utm_term` = ad ID (optional)
  - `count` defaults to 1
- Action: upsert `MetaDailyStats`, increment `leadCount`
- No individual lead records — counters only

### C) Purchase webhook — `POST /api/webhooks/purchase`
- Same auth as lead webhook
- Payload: `{ date, utm_campaign, utm_content, utm_term?, amount, count? }`
- Action: upsert `MetaDailyStats`, increment `purchaseCount`, add to `revenue`

## Database Models

```prisma
model MetaSettings {
  id                String   @id @default(cuid())
  label             String                          // "Offer 2 Spring"
  metaCampaignNames Json                            // string[] up to 2
  adsetNames        Json                            // string[] up to 10
  webhookSecret     String                          // for webhook auth
  active            Boolean  @default(true)
  createdAt         DateTime @default(now())
  spendLogs         MetaSpendLog[]
  dailyStats        MetaDailyStats[]
}

model MetaSpendLog {
  id              String       @id @default(cuid())
  date            DateTime
  metaSettingsId  String
  adsetName       String?      // null = campaign total
  spend           Float        @default(0)
  syncedAt        DateTime     @default(now())
  settings        MetaSettings @relation(fields: [metaSettingsId], references: [id])

  @@unique([date, metaSettingsId, adsetName])
}

model MetaDailyStats {
  id              String       @id @default(cuid())
  date            DateTime
  metaSettingsId  String
  adsetName       String?      // null = campaign total
  adId            String?      // from utm_term, optional
  leadCount       Int          @default(0)
  purchaseCount   Int          @default(0)
  revenue         Float        @default(0)
  settings        MetaSettings @relation(fields: [metaSettingsId], references: [id])

  @@unique([date, metaSettingsId, adsetName, adId])
}
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/meta/settings` | List campaign configs |
| POST | `/api/meta/settings` | Create campaign config |
| PUT | `/api/meta/settings/[id]` | Update campaign config |
| DELETE | `/api/meta/settings/[id]` | Delete campaign config |
| POST | `/api/meta/sync` | Manual spend sync trigger |
| GET | `/api/meta/stats` | Fetch combined spend+stats for UI |
| POST | `/api/webhooks/lead` | Increment lead counter |
| POST | `/api/webhooks/purchase` | Increment purchase counter + revenue |

## Vercel Cron

`vercel.json`:
```json
{
  "crons": [{ "path": "/api/meta/sync", "schedule": "0 * * * *" }]
}
```

The sync endpoint reads all active `MetaSettings`, calls Meta API for each, upserts `MetaSpendLog`.

## UI

### Settings tab — new "Meta Ads" section
- Access Token field (masked, eye toggle)
- Ad Account ID field
- API Version field (default `v21.0`)
- Campaign configs list — each card shows:
  - Label
  - Meta campaign names (up to 2)
  - Ad set names to track (up to 10)
  - Webhook secret (copy button)
  - Edit / Delete buttons

### Traffic tab — new sub-tabs: Results | Campaigns

**Campaigns sub-tab:**
- Date range filter: This Week / This Month / Custom
- "Sync Now" button
- Summary table per campaign config:
  | Date | Campaign | Ad Spend | Leads | CPL | Purchases | Revenue | ROAS |
- Expandable rows → ad set breakdown (same columns)

## Implementation Order

1. Prisma schema — add 3 new models, migrate
2. Meta Credentials settings section (token, account ID, version)
3. Campaign config CRUD in settings
4. `/api/meta/sync` endpoint (Meta API call + upsert spend)
5. `vercel.json` cron config
6. `/api/webhooks/lead` and `/api/webhooks/purchase`
7. `/api/meta/stats` for UI consumption
8. Campaigns sub-tab UI in Traffic
