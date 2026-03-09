// app/api/effort/route.ts
import { z } from 'zod'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

const EffortSchema = z.object({
  userId: z.string().min(1),
  date: z.string().min(1),
  minutes: z.number().int().positive(),
  category: z.string().min(1),
  note: z.string().optional(),
})

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

    return Response.json({ data: { logs } })
  } catch (err) {
    console.error('[effort GET]', err)
    return Response.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// POST /api/effort - Log work effort
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = EffortSchema.safeParse(body)

    if (!result.success) {
      return Response.json(
        { error: { message: 'Invalid input', code: 'INVALID_INPUT', issues: result.error.issues } },
        { status: 422 }
      )
    }

    const { userId, date, minutes, category, note } = result.data

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, active: true, rates: true },
    })

    if (!user) {
      return Response.json(
        { error: { message: 'User not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    if (!user.active) {
      return Response.json(
        { error: { message: 'User account is inactive', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    // Get rate for category or use default
    const userRates = typeof user.rates === 'string'
      ? JSON.parse(user.rates) as Record<string, number>
      : (user.rates as Record<string, number> | null) ?? {}
    const rateForCategory = userRates[category] ?? 25

    const log = await prisma.effortLog.create({
      data: {
        userId,
        date: new Date(date),
        minutes,
        category,
        note: note?.trim() ?? null,
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

    return Response.json({ data: { log } }, { status: 201 })
  } catch (err) {
    console.error('[effort POST]', err)
    return Response.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
