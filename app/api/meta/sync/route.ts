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
  const logs: string[] = []
  logs.push(`[${new Date().toLocaleTimeString()}] Starting Meta API sync...`)

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
      logs.push('❌ Meta credentials not configured')
      console.error('[meta/sync]', logs.join('\n'))
      return Response.json({ error: { message: 'Meta credentials not configured', code: 'NOT_CONFIGURED' }, logs }, { status: 400 })
    }

    logs.push('✓ Meta credentials loaded')

    const token = cfg.metaToken
    const adAccountId = cfg.metaAdAccountId
    const apiVersion = cfg.metaApiVersion ?? 'v21.0'

    // Load all active campaign configs
    const campaigns = await prisma.metaSettings.findMany({ where: { active: true } })
    if (campaigns.length === 0) {
      logs.push('⚠️ No active campaign configs found')
      return Response.json({ data: { message: 'No active campaign configs', synced: 0, logs } })
    }

    logs.push(`✓ Found ${campaigns.length} active campaign config(s)`)

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

      logs.push(`\n📅 ${dateStr}:`)
      logs.push(`  Meta API returned ${campaignData.length} campaign(s): ${campaignData.map(c => c.campaign_name).join(', ') || '(none)'}`)
      logs.push(`  Meta API returned ${adsetData.length} adset(s): ${adsetData.map(a => `${a.campaign_name}/${a.adset_name}`).join(', ') || '(none)'}`)

      for (const config of campaigns) {
        const trackedCampaigns = config.metaCampaignNames as string[]
        const trackedAdsets = config.adsetNames as string[]

        logs.push(`  Config "${config.label}": tracking campaigns [${trackedCampaigns.join(', ')}], adsets [${trackedAdsets.join(', ')}]`)

        // Campaign total
        const matchedCampaigns = campaignData.filter(r => trackedCampaigns.includes(r.campaign_name))
        logs.push(`    Matched campaigns: ${matchedCampaigns.map(c => `${c.campaign_name}($${c.spend})`).join(', ') || '(none)'}`)

        const campaignTotal = matchedCampaigns.reduce((sum, r) => sum + parseFloat(r.spend ?? '0'), 0)

        try {
          const result = await prisma.metaSpendLog.upsert({
            where: { date_metaSettingsId_adsetName: { date, metaSettingsId: config.id, adsetName: '' } },
            update: { spend: campaignTotal, syncedAt: now },
            create: { date, metaSettingsId: config.id, adsetName: '', spend: campaignTotal },
          })
          logs.push(`    Campaign upserted: ${result.id} spend=$${result.spend} date=${result.date.toISOString()}`)
          totalUpserts++
        } catch (err) {
          logs.push(`    Campaign upsert ERROR: ${String(err)}`)
        }

        // Per-adset spend
        for (const adsetName of trackedAdsets) {
          const matchedAdsets = adsetData.filter(r => trackedCampaigns.includes(r.campaign_name) && r.adset_name === adsetName)
          logs.push(`    Adset "${adsetName}": ${matchedAdsets.map(a => `$${a.spend}`).join(', ') || '(no match)'}`)

          const adsetSpend = matchedAdsets.reduce((sum, r) => sum + parseFloat(r.spend ?? '0'), 0)

          try {
            const result = await prisma.metaSpendLog.upsert({
              where: { date_metaSettingsId_adsetName: { date, metaSettingsId: config.id, adsetName } },
              update: { spend: adsetSpend, syncedAt: now },
              create: { date, metaSettingsId: config.id, adsetName, spend: adsetSpend },
            })
            logs.push(`      Adset upserted: ${result.id} spend=$${result.spend}`)
            totalUpserts++
          } catch (err) {
            logs.push(`      Adset upsert ERROR: ${String(err)}`)
          }
        }
      }
    }

    logs.push(`\n✓ Sync complete — ${totalUpserts} records upserted`)
    console.log('[meta/sync]', logs.join('\n'))
    return Response.json({ data: { message: 'Sync complete', upserts: totalUpserts, logs } })
  } catch (err) {
    logs.push(`\n❌ Error: ${String(err)}`)
    console.error('[meta/sync]', logs.join('\n'))
    return Response.json({ error: { message: String(err), code: 'SYNC_ERROR', logs } }, { status: 500 })
  }
}

// Vercel cron hits GET; redirect to POST logic
export async function GET() {
  return POST()
}
