// app/api/work-sessions/route.ts
import { z } from 'zod'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

const StartSessionSchema = z.object({
  userId: z.string().min(1),
  category: z.string().min(1),
  notes: z.string().optional(),
})

const StopSessionSchema = z.object({
  sessionId: z.string().min(1),
  notes: z.string().optional(),
})

const UpdateSessionSchema = z.object({
  sessionId: z.string().min(1),
  notes: z.string(),
  category: z.string().optional(),
})

// GET /api/work-sessions - Get work sessions (optionally filtered by userId)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status') // 'active' | 'completed' | null for all

    const where: any = {}
    if (userId) where.userId = userId
    if (status) where.status = status

    const sessions = await prisma.workSession.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        effortLog: {
          select: {
            id: true,
            minutes: true,
            categoryRate: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    })

    return Response.json({ data: { sessions } })
  } catch (err) {
    console.error('[work-sessions GET]', err)
    return Response.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// POST /api/work-sessions - Start a new work session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = StartSessionSchema.safeParse(body)

    if (!result.success) {
      return Response.json(
        { error: { message: 'Invalid input', code: 'INVALID_INPUT', issues: result.error.issues } },
        { status: 422 }
      )
    }

    const { userId, category, notes } = result.data

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, active: true },
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

    // Check if user already has an active session
    const existingActive = await prisma.workSession.findFirst({
      where: { userId, status: 'active' },
    })

    if (existingActive) {
      return Response.json(
        { error: { message: 'User already has an active session. Stop it first.', code: 'CONFLICT' } },
        { status: 409 }
      )
    }

    const session = await prisma.workSession.create({
      data: {
        userId,
        category,
        notes: notes?.trim() ?? '',
        status: 'active',
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

    return Response.json({ data: { session } }, { status: 201 })
  } catch (err) {
    console.error('[work-sessions POST]', err)
    return Response.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// PATCH /api/work-sessions - Stop or update a work session
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const result = UpdateSessionSchema.safeParse(body)

    if (!result.success) {
      return Response.json(
        { error: { message: 'Invalid input', code: 'INVALID_INPUT', issues: result.error.issues } },
        { status: 422 }
      )
    }

    const { sessionId, notes, category } = result.data

    const session = await prisma.workSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    })

    if (!session) {
      return Response.json(
        { error: { message: 'Session not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    // Update notes and/or category
    const updated = await prisma.workSession.update({
      where: { id: sessionId },
      data: {
        ...(notes !== undefined && { notes }),
        ...(category !== undefined && { category }),
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

    return Response.json({ data: { session: updated } })
  } catch (err) {
    console.error('[work-sessions PATCH]', err)
    return Response.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// DELETE /api/work-sessions - Stop a work session and create effort log
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const result = StopSessionSchema.safeParse(body)

    if (!result.success) {
      return Response.json(
        { error: { message: 'Invalid input', code: 'INVALID_INPUT', issues: result.error.issues } },
        { status: 422 }
      )
    }

    const { sessionId, notes } = result.data

    const session = await prisma.workSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    })

    if (!session) {
      return Response.json(
        { error: { message: 'Session not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    if (session.status !== 'active') {
      return Response.json(
        { error: { message: 'Session is not active', code: 'CONFLICT' } },
        { status: 409 }
      )
    }

    const endTime = new Date()
    const durationSeconds = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000)
    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60)) // Minimum 1 minute

    // Get user rates for category
    const userRates = typeof session.user.rates === 'string'
      ? JSON.parse(session.user.rates) as Record<string, number>
      : (session.user.rates as Record<string, number> | null) ?? {}
    const categoryRate = userRates[session.category] ?? 25

    // Create effort log and update session in a transaction
    const [effortLog, updatedSession] = await prisma.$transaction(async (tx) => {
      const log = await tx.effortLog.create({
        data: {
          userId: session.userId,
          date: endTime,
          minutes: durationMinutes,
          category: session.category,
          note: notes?.trim() ?? session.notes ?? null,
          categoryRate,
        },
      })

      const updated = await tx.workSession.update({
        where: { id: sessionId },
        data: {
          endTime,
          duration: durationSeconds,
          status: 'completed',
          notes: notes?.trim() ?? session.notes ?? '',
          effortLog: {
            connect: { id: log.id },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          effortLog: {
            select: {
              id: true,
              minutes: true,
              categoryRate: true,
            },
          },
        },
      })

      return [log, updated]
    })

    return Response.json({
      data: {
        session: updatedSession,
        effortLog,
      },
    })
  } catch (err) {
    console.error('[work-sessions DELETE]', err)
    return Response.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
