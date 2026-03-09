// app/api/leads/organic/route.ts
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateApiKey } from '@/lib/auth'

const OrganicLeadSchema = z.object({
  date: z.string().min(1),
  count: z.number().int().min(0),
  campaign: z.string().min(1),
})

// POST /api/leads/organic
// Headers: x-api-key: sk-smm-...
// Body: { date: "2026-03-06", count: 14, campaign: "Spring Push" }
export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req, 'organicLeads')
  if (!auth.valid) {
    return Response.json(
      { error: { message: auth.error, code: 'UNAUTHORIZED' } },
      { status: 401 }
    )
  }

  try {
    const body = await req.json()
    const result = OrganicLeadSchema.safeParse(body)
    if (!result.success) {
      return Response.json(
        { error: { message: 'Invalid input', code: 'INVALID_INPUT', issues: result.error.issues } },
        { status: 422 }
      )
    }

    const { date, count, campaign } = result.data

    // Upsert into today's traffic log for this campaign
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
        data: { organicLeads: existing.organicLeads + count },
      })
    } else {
      record = await prisma.trafficLog.create({
        data: {
          date: new Date(date),
          campaignName: campaign,
          organicLeads: count,
          paidLeads: 0,
          adSpend: 0,
          source: 'api',
        },
      })
    }

    return Response.json({ data: record }, { status: 200 })
  } catch (err) {
    console.error('[organic leads]', err)
    return Response.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// GET /api/leads/organic?from=2026-01-01&to=2026-03-31
export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req, 'organicLeads')
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
    select: { date: true, campaignName: true, organicLeads: true },
  })

  return Response.json({ data: logs })
}
