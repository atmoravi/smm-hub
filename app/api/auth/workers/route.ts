// app/api/auth/workers/route.ts
import { prisma } from '@/lib/prisma'

// GET /api/auth/workers - List active workers (for login dropdown)
// Excludes admin users - they must use PIN login
export async function GET() {
  try {
    const workers = await prisma.user.findMany({
      where: {
        active: true,
        role: 'user' // Only non-admin users
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
