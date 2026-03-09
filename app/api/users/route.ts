// app/api/users/route.ts
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, underscores'),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['user', 'admin']).default('user'),
  avatarUrl: z.string().url().nullable().optional(),
  currency: z.string().default('EUR'),
  rates: z.record(z.string(), z.number()).optional().default({}),
})

// GET /api/users - List all users
export async function GET(req: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatarUrl: true,
        role: true,
        active: true,
        currency: true,
        rates: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return Response.json({ data: users })
  } catch (err) {
    console.error('[users GET]', err)
    return Response.json({ error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' } }, { status: 500 })
  }
}

// POST /api/users - Create a new user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = CreateUserSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors } },
        { status: 422 }
      )
    }

    const { name, username, email, password, role, avatarUrl, currency, rates } = parsed.data

    const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } })
    if (existing) {
      const isDuplicateUsername = existing.username === username
      return Response.json(
        { error: { message: isDuplicateUsername ? 'Username already taken' : 'Email already registered', code: isDuplicateUsername ? 'USERNAME_TAKEN' : 'EMAIL_TAKEN' } },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const defaultRates = {
      'Content Creation': 25,
      'Engagement/Community Mgmt': 25,
      'Strategy & Planning': 25,
      'Analytics & Reporting': 25,
      'Ad Management': 25,
      'Client Meetings': 25,
      'Admin/Misc': 25,
    }
    const userRates: Record<string, number> = Object.keys(rates).length > 0 ? rates : defaultRates

    const user = await prisma.user.create({
      data: {
        name,
        username,
        email,
        password: hashedPassword,
        role,
        avatarUrl: avatarUrl ?? null,
        currency,
        rates: userRates,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatarUrl: true,
        role: true,
        active: true,
        currency: true,
        createdAt: true,
      },
    })

    return Response.json({ data: user }, { status: 201 })
  } catch (err) {
    console.error('[users POST]', err)
    return Response.json({ error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' } }, { status: 500 })
  }
}
