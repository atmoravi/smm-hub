// app/api/meta/sync/route.ts
// Called by Vercel cron (hourly) and manual "Sync Now" button
import { prisma } from '@/lib/prisma'

async function fetchMetaInsights(
  token: string,
  adAccountId: string,
  apiVersion: string,
  date: string,
  level: 'campaign' | 'adset'
): Promise<Array<{ campaign_name: string; adset_name?: string; spend: string }>> {
  const timeRange = encodeURIComponent(JSON.stringify({ since: date, until: date }))
  const fields = level === 'adset' ? 'spend,campaign_name,adset_name' : 'spend,campaign_name'
  const url = `https://graph.facebook.com/${apiVersion}/act_${adAccountId}/insights?fields=${fields}&level=${level}&time_range=${timeRange}&access_token=${token}`

  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Meta API error (${res.status}): ${err}`)
  }
  const json = await res.json()
  return json.data ?? []
}

function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export async function POST() {
  try {
    // Load global Meta credentials from SiteSettings
    const siteSettingsRows = await prisma.siteSettings.findMany({
      where: { key: { in: ['metaToken', 'metaAdAccountId', 'metaApiVersion'] } },
    })
    const cfg: Record<string, string> = {}
    for (const row of siteSettingsRows) {
      try { cfg[row.key] = JSON.parse(row.value) } catch { cfg[row.key] = row.value }
    }

    if (!cfg.metaToken || !cfg.metaAdAccountId) {
      return Response.json({ error: { message: 'Meta credentials not configured', code: 'NOT_CONFIGURED' } }, { status: 400 })
    }

    const token = cfg.metaToken
    const adAccountId = cfg.metaAdAccountId
    const apiVersion = cfg.metaApiVersion ?? 'v21.0'

    // Load all active campaign configs
    const campaigns = await prisma.metaSettings.findMany({ where: { active: true } })
    if (campaigns.length === 0) {
      return Response.json({ data: { message: 'No active campaign configs', synced: 0 } })
    }

    const now = new Date()
    const today = toDateOnly(now)
    const yesterday = toDateOnly(new Date(now.getTime() - 86400000))
    const dates = [today, yesterday]

    let totalUpserts = 0

    for (const date of dates) {
      const dateStr = date.toISOString().split('T')[0]

      // Campaign level — total spend per campaign name
      const campaignData = await fetchMetaInsights(token, adAccountId, apiVersion, dateStr, 'campaign')
      // Adset level — per-adset spend
      const adsetData = await fetchMetaInsights(token, adAccountId, apiVersion, dateStr, 'adset')

      for (const config of campaigns) {
        const trackedCampaigns = config.metaCampaignNames as string[]
        const trackedAdsets = config.adsetNames as string[]

        // Campaign total
        const campaignTotal = campaignData
          .filter(r => trackedCampaigns.includes(r.campaign_name))
          .reduce((sum, r) => sum + parseFloat(r.spend ?? '0'), 0)

        await prisma.metaSpendLog.upsert({
          where: { date_metaSettingsId_adsetName: { date, metaSettingsId: config.id, adsetName: '' } },
          update: { spend: campaignTotal, syncedAt: now },
          create: { date, metaSettingsId: config.id, adsetName: '', spend: campaignTotal },
        })
        totalUpserts++

        // Per-adset spend
        for (const adsetName of trackedAdsets) {
          const adsetSpend = adsetData
            .filter(r => trackedCampaigns.includes(r.campaign_name) && r.adset_name === adsetName)
            .reduce((sum, r) => sum + parseFloat(r.spend ?? '0'), 0)

          await prisma.metaSpendLog.upsert({
            where: { date_metaSettingsId_adsetName: { date, metaSettingsId: config.id, adsetName } },
            update: { spend: adsetSpend, syncedAt: now },
            create: { date, metaSettingsId: config.id, adsetName, spend: adsetSpend },
          })
          totalUpserts++
        }
      }
    }

    return Response.json({ data: { message: 'Sync complete', upserts: totalUpserts } })
  } catch (err) {
    console.error('[meta/sync]', err)
    return Response.json({ error: { message: String(err), code: 'SYNC_ERROR' } }, { status: 500 })
  }
}

// Vercel cron hits GET; redirect to POST logic
export async function GET() {
  return POST()
}
