// app/api/auth/workers/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/auth/workers - List active workers (for login dropdown)
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        active: true,
        role: {
          in: ['user', 'admin']
        }
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    })

    console.log('[auth/workers] Found users:', users.length)
    return NextResponse.json({ workers: users })
  } catch (err) {
    console.error('[auth/workers]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
