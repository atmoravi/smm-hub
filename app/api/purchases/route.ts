// app/api/purchases/route.ts
import { z } from 'zod'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey } from '@/lib/auth'

const PurchaseSchema = z.object({
  date: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.number().positive(),
  campaign: z.string().min(1),
})

// POST /api/purchases
// Headers: x-api-key: sk-smm-...
// Body: { date: "2026-03-06", amount: 1200.00, orderId: "ORD-9182", campaign: "Spring Sale" }
export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req, 'purchases')
  if (!auth.valid) {
    return Response.json(
      { error: { message: auth.error, code: 'UNAUTHORIZED' } },
      { status: 401 }
    )
  }

  try {
    const body = await req.json()
    const result = PurchaseSchema.safeParse(body)

    if (!result.success) {
      return Response.json(
        { error: { message: 'Invalid input', code: 'INVALID_INPUT', issues: result.error.issues } },
        { status: 422 }
      )
    }

    const { date, amount, orderId } = result.data
    const source = (body.source as string | undefined) ?? null

    // Prevent duplicate orders
    const duplicate = await prisma.salesLog.findFirst({ where: { orderId } })
    if (duplicate) {
      return Response.json(
        { error: { message: 'Duplicate orderId — already recorded', code: 'CONFLICT' }, data: { record: duplicate } },
        { status: 409 }
      )
    }

    const record = await prisma.salesLog.create({
      data: {
        date: new Date(date),
        amount,
        source,
        orderId,
      },
    })

    return Response.json({ data: { record } }, { status: 201 })
  } catch (err) {
    console.error('[purchases]', err)
    return Response.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req, 'purchases')
  if (!auth.valid) {
    return Response.json(
      { error: { message: auth.error, code: 'UNAUTHORIZED' } },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const source = searchParams.get('source')

  const logs = await prisma.salesLog.findMany({
    where: {
      ...(from && { date: { gte: new Date(from) } }),
      ...(to && { date: { lte: new Date(to) } }),
      ...(source && { source }),
    },
    orderBy: { date: 'desc' },
  })

  const total = logs.reduce((sum, l) => sum + l.amount, 0)

  return Response.json({ data: { logs, total } })
}
