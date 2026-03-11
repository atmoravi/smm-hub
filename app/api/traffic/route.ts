// app/api/traffic/route.ts
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const TrafficLogSchema = z.object({
  date: z.string().min(1),
  campaignName: z.string().optional().default(''),
  organicLeads: z.number().int().min(0).default(0),
  paidLeads: z.number().int().min(0).default(0),
  adSpend: z.number().min(0).default(0),
})

// GET /api/traffic - List all traffic logs
export async function GET() {
  try {
    const logs = await prisma.trafficLog.findMany({
      orderBy: { date: 'desc' },
    })
    return Response.json({ data: logs })
  } catch (err) {
    console.error('[traffic GET]', err)
    return Response.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// POST /api/traffic - Create a traffic log entry (admin manual entry)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = TrafficLogSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: { message: 'Invalid input', code: 'INVALID_INPUT', issues: parsed.error.issues } },
        { status: 422 }
      )
    }

    const { date, campaignName, organicLeads, paidLeads, adSpend } = parsed.data

    const log = await prisma.trafficLog.create({
      data: {
        date: new Date(date),
        campaignName: campaignName || null,
        organicLeads,
        paidLeads,
        adSpend,
        source: 'manual',
      },
    })

    return Response.json({ data: log }, { status: 201 })
  } catch (err) {
    console.error('[traffic POST]', err)
    return Response.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// DELETE /api/traffic?id=... - Delete a traffic log entry
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return Response.json(
        { error: { message: 'Missing id parameter', code: 'MISSING_ID' } },
        { status: 400 }
      )
    }

    await prisma.trafficLog.delete({
      where: { id },
    })

    return Response.json({ data: { message: 'Deleted' } })
  } catch (err) {
    console.error('[traffic DELETE]', err)
    return Response.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
