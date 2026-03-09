// app/api/leads/paid/route.ts
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateApiKey } from '@/lib/auth'

const PaidLeadSchema = z.object({
  date: z.string().min(1),
  count: z.number().int().min(0),
  adSpend: z.number().min(0),
  campaign: z.string().min(1),
})

// POST /api/leads/paid
// Headers: x-api-key: sk-smm-...
// Body: { date: "2026-03-06", count: 31, adSpend: 240.00, campaign: "Spring Sale" }
export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req, 'paidLeads')
  if (!auth.valid) {
    return Response.json(
      { error: { message: auth.error, code: 'UNAUTHORIZED' } },
      { status: 401 }
    )
  }

  try {
    const body = await req.json()
    const result = PaidLeadSchema.safeParse(body)
    if (!result.success) {
      return Response.json(
        { error: { message: 'Invalid input', code: 'INVALID_INPUT', issues: result.error.issues } },
        { status: 422 }
      )
    }

    const { date, count, adSpend, campaign } = result.data

    const existing = await prisma.trafficLog.findFirst({
      where: {
        date: new Date(date),
        campaignName: campaign,
      },
    })

    let record
    if (existing) {
      record = await prisma.trafficLog.update({
        where: { id: existing.id },
        data: {
          paidLeads: existing.paidLeads + count,
          adSpend: existing.adSpend + adSpend,
        },
      })
    } else {
      record = await prisma.trafficLog.create({
        data: {
          date: new Date(date),
          campaignName: campaign,
          organicLeads: 0,
          paidLeads: count,
          adSpend: adSpend,
          source: 'api',
        },
      })
    }

    return Response.json({ data: record }, { status: 200 })
  } catch (err) {
    console.error('[paid leads]', err)
    return Response.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// GET /api/leads/paid?from=2026-01-01&to=2026-03-31
export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req, 'paidLeads')
  if (!auth.valid) {
    return Response.json(
      { error: { message: auth.error, code: 'UNAUTHORIZED' } },
      { status: 401 }
    )
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

  return Response.json({ data: logs })
}
