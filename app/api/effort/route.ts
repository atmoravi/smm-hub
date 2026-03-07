// app/api/effort/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/effort - Get effort logs (optionally filtered by userId)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    const logs = await prisma.effortLog.findMany({
      where: userId ? { userId } : {},
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ logs })
  } catch (err) {
    console.error('[effort GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/effort - Log work effort
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, date, minutes, category, note } = body

    // Validation
    if (!userId || !date || !minutes || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, date, minutes, category' },
        { status: 400 }
      )
    }

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, active: true, rates: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.active) {
      return NextResponse.json({ error: 'User account is inactive' }, { status: 403 })
    }

    // Get rate for category or use default
    const userRates = typeof user.rates === 'string' ? JSON.parse(user.rates) : (user.rates as Record<string, number> || {})
    const rateForCategory = userRates[category] || 25

    // Create effort log
    const log = await prisma.effortLog.create({
      data: {
        userId,
        date: new Date(date),
        minutes: parseInt(minutes),
        category,
        note: note?.trim() || null,
        categoryRate: rateForCategory,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, log }, { status: 201 })
  } catch (err) {
    console.error('[effort POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
