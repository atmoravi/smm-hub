// app/api/purchases/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey } from '@/lib/auth'

// POST /api/purchases
// Headers: x-api-key: sk-smm-...
// Body: { date: "2026-03-06", amount: 1200.00, source?: "organic"|"paid", orderId?: "ORD-9182" }
export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req, 'purchases')
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { date, amount, source, orderId } = body

    if (!date || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Required: date (ISO string), amount (positive number)' },
        { status: 400 }
      )
    }

    // Prevent duplicate orders
    if (orderId) {
      const duplicate = await prisma.salesLog.findFirst({ where: { orderId } })
      if (duplicate) {
        return NextResponse.json(
          { error: 'Duplicate orderId — already recorded', record: duplicate },
          { status: 409 }
        )
      }
    }

    const record = await prisma.salesLog.create({
      data: {
        date: new Date(date),
        amount,
        source: source ?? null,
        orderId: orderId ?? null,
      },
    })

    return NextResponse.json({ success: true, record }, { status: 201 })
  } catch (err) {
    console.error('[purchases]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req, 'purchases')
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const source = searchParams.get('source') // filter by "organic" | "paid"

  const logs = await prisma.salesLog.findMany({
    where: {
      ...(from && { date: { gte: new Date(from) } }),
      ...(to && { date: { lte: new Date(to) } }),
      ...(source && { source }),
    },
    orderBy: { date: 'desc' },
  })

  const total = logs.reduce((sum, l) => sum + l.amount, 0)

  return NextResponse.json({ logs, total })
}
