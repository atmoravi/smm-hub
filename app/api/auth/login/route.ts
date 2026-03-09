// app/api/auth/login/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const LoginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) })

// POST /api/auth/login - Authenticate user (worker or admin)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const parsed = LoginSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: { message: 'username and password are required', code: 'INVALID_INPUT' } },
        { status: 400 }
      )
    }

    const { username, password } = parsed.data

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatarUrl: true,
        role: true,
        active: true,
        password: true,
      },
    })

    if (!user) {
      return Response.json(
        { error: { message: 'Invalid username or password', code: 'INVALID_CREDENTIALS' } },
        { status: 401 }
      )
    }

    if (!user.active) {
      return Response.json(
        { error: { message: 'Your account has been deactivated. Please contact your administrator.', code: 'ACCOUNT_DEACTIVATED' } },
        { status: 403 }
      )
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return Response.json(
        { error: { message: 'Invalid username or password', code: 'INVALID_CREDENTIALS' } },
        { status: 401 }
      )
    }

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user
    return Response.json({ data: { user: userWithoutPassword } })
  } catch (err) {
    console.error('[auth/login]', err)
    return Response.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
