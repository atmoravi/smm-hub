// app/api/auth/workers/route.ts
import { prisma } from '@/lib/prisma'

// GET /api/auth/workers - List active team members (for login dropdown)
// Includes all active users (workers and admins who want to log in via username/password)
export async function GET() {
  try {
    const workers = await prisma.user.findMany({
      where: {
        active: true,
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

    return Response.json({ workers })
  } catch (err) {
    console.error('[auth/workers]', err)
    return Response.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
