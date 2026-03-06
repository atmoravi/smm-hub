// app/api/leads/paid/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey } from '@/lib/auth'

// POST /api/leads/paid
// Headers: x-api-key: sk-smm-...
// Body: { date: "2026-03-06", count: 31, adSpend: 240.00, platform?: "meta_ads", campaign?: "Spring Sale" }
export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req, 'paidLeads')
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { date, count, adSpend, platform, campaign } = body

    if (!date || typeof count !== 'number' || count < 0) {
      return NextResponse.json(
        { error: 'Required: date (ISO string), count (number)' },
        { status: 400 }
      )
    }

    const campaignName = campaign ?? platform ?? 'Paid API'

    const existing = await prisma.trafficLog.findFirst({
      where: {
        date: new Date(date),
        campaignName,
      },
    })

    let record
    if (existing) {
      record = await prisma.trafficLog.update({
        where: { id: existing.id },
        data: {
          paidLeads: existing.paidLeads + count,
          adSpend: existing.adSpend + (adSpend ?? 0),
        },
      })
    } else {
      record = await prisma.trafficLog.create({
        data: {
          date: new Date(date),
          campaignName,
          organicLeads: 0,
          paidLeads: count,
          adSpend: adSpend ?? 0,
          source: 'api',
        },
      })
    }

    return NextResponse.json({ success: true, record }, { status: 200 })
  } catch (err) {
    console.error('[paid leads]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req, 'paidLeads')
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const logs = await prisma.trafficLog.findMany({
    where: {
      ...(from && { date: { gte: new Date(from) } }),
      ...(to && { date: { lte: new Date(to) } }),
    },
    orderBy: { date: 'desc' },
    select: { date: true, campaignName: true, paidLeads: true, adSpend: true },
  })

  return NextResponse.json({ logs })
}
