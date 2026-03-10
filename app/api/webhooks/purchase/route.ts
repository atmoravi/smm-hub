// app/api/webhooks/purchase/route.ts
// Increments purchase counter + revenue — no individual records stored
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const PurchaseSchema = z.object({
  date: z.string().min(1),
  utm_campaign: z.string().min(1),
  utm_content: z.string().default(''),  // adset name
  utm_term: z.string().default(''),     // ad id
  amount: z.number().positive(),
  count: z.number().int().positive().default(1),
})

function toDateOnly(s: string): Date {
  const d = new Date(s)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-webhook-secret')
    if (!secret) {
      return Response.json({ error: { message: 'Missing x-webhook-secret', code: 'UNAUTHORIZED' } }, { status: 401 })
    }

    const config = await prisma.metaSettings.findFirst({
      where: { webhookSecret: secret, active: true },
    })
    if (!config) {
      return Response.json({ error: { message: 'Invalid webhook secret', code: 'UNAUTHORIZED' } }, { status: 401 })
    }

    const body = await req.json()
    const parsed = PurchaseSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors } },
        { status: 422 }
      )
    }

    const { date, utm_content, utm_term, amount, count } = parsed.data
    const dateOnly = toDateOnly(date)

    await prisma.metaDailyStats.upsert({
      where: {
        date_metaSettingsId_adsetName_adId: {
          date: dateOnly,
          metaSettingsId: config.id,
          adsetName: utm_content,
          adId: utm_term,
        },
      },
      update: {
        purchaseCount: { increment: count },
        revenue: { increment: amount },
      },
      create: {
        date: dateOnly,
        metaSettingsId: config.id,
        adsetName: utm_content,
        adId: utm_term,
        purchaseCount: count,
        revenue: amount,
      },
    })

    return Response.json({ data: { recorded: count, amount } })
  } catch (err) {
    console.error('[webhooks/purchase]', err)
    return Response.json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
