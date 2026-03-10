// app/api/meta/stats/route.ts
// Returns combined spend + lead/purchase stats for the Campaigns UI
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const dateFilter = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    }

    const [campaigns, spendLogs, dailyStats] = await Promise.all([
      prisma.metaSettings.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } }),
      prisma.metaSpendLog.findMany({
        where: Object.keys(dateFilter).length ? { date: dateFilter } : {},
        orderBy: { date: 'desc' },
      }),
      prisma.metaDailyStats.findMany({
        where: Object.keys(dateFilter).length ? { date: dateFilter } : {},
        orderBy: { date: 'desc' },
      }),
    ])

    // Group spend and stats by campaignId → adsetName → date
    const result = campaigns.map(campaign => {
      const campaignSpend = spendLogs.filter(s => s.metaSettingsId === campaign.id)
      const campaignStats = dailyStats.filter(s => s.metaSettingsId === campaign.id)

      // Summary rows: one per date at campaign level (adsetName === "")
      const summaryByDate = campaignSpend
        .filter(s => s.adsetName === '')
        .map(s => {
          const dateStr = s.date.toISOString().split('T')[0]
          const statsForDate = campaignStats.filter(
            d => d.date.toISOString().split('T')[0] === dateStr && d.adsetName === ''
          )
          const leads = statsForDate.reduce((a, b) => a + b.leadCount, 0)
          const purchases = statsForDate.reduce((a, b) => a + b.purchaseCount, 0)
          const revenue = statsForDate.reduce((a, b) => a + b.revenue, 0)
          return {
            date: dateStr,
            spend: s.spend,
            leads,
            purchases,
            revenue,
            cpl: leads > 0 ? +(s.spend / leads).toFixed(2) : null,
            roas: s.spend > 0 ? +(revenue / s.spend).toFixed(2) : null,
          }
        })

      // Adset breakdown per tracked adset
      const adsetNames = campaign.adsetNames as string[]
      const adsetBreakdown = adsetNames.map(adsetName => {
        const adsetSpend = campaignSpend.filter(s => s.adsetName === adsetName)
        return adsetSpend.map(s => {
          const dateStr = s.date.toISOString().split('T')[0]
          const statsForDate = campaignStats.filter(
            d => d.date.toISOString().split('T')[0] === dateStr && d.adsetName === adsetName
          )
          const leads = statsForDate.reduce((a, b) => a + b.leadCount, 0)
          const purchases = statsForDate.reduce((a, b) => a + b.purchaseCount, 0)
          const revenue = statsForDate.reduce((a, b) => a + b.revenue, 0)
          return {
            adsetName,
            date: dateStr,
            spend: s.spend,
            leads,
            purchases,
            revenue,
            cpl: leads > 0 ? +(s.spend / leads).toFixed(2) : null,
            roas: s.spend > 0 ? +(revenue / s.spend).toFixed(2) : null,
          }
        })
      }).flat()

      return {
        id: campaign.id,
        label: campaign.label,
        metaCampaignNames: campaign.metaCampaignNames,
        adsetNames,
        webhookSecret: campaign.webhookSecret,
        summary: summaryByDate,
        adsets: adsetBreakdown,
      }
    })

    return Response.json({ data: result })
  } catch (err) {
    console.error('[meta/stats GET]', err)
    return Response.json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
