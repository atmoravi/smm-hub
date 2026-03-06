// app/api/leads/organic/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey } from '@/lib/auth'

// POST /api/leads/organic
// Headers: x-api-key: sk-smm-...
// Body: { date: "2026-03-06", count: 14, campaign?: "Spring Push" }
export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req, 'organicLeads')
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { date, count, campaign } = body

    if (!date || typeof count !== 'number' || count < 0) {
      return NextResponse.json(
        { error: 'Required: date (ISO string), count (number)' },
        { status: 400 }
      )
    }

    // Upsert into today's traffic log for this campaign
    const existing = await prisma.trafficLog.findFirst({
      where: {
        date: new Date(date),
        campaignName: campaign ?? 'API',
      },
    })

    let record
    if (existing) {
      record = await prisma.trafficLog.update({
        where: { id: existing.id },
        data: { organicLeads: existing.organicLeads + count },
      })
    } else {
      record = await prisma.trafficLog.create({
        data: {
          date: new Date(date),
          campaignName: campaign ?? 'API',
          organicLeads: count,
          paidLeads: 0,
          adSpend: 0,
          source: 'api',
        },
      })
    }

    return NextResponse.json({ success: true, record }, { status: 200 })
  } catch (err) {
    console.error('[organic leads]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/leads/organic?from=2026-01-01&to=2026-03-31
export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req, 'organicLeads')
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
    select: { date: true, campaignName: true, organicLeads: true },
  })

  return NextResponse.json({ logs })
}
