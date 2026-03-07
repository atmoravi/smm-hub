// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

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
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (err) {
    console.error('[users GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/users - Create a new user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, username, email, password, role = 'user', avatarUrl, hourlyRate = 25 } = body

    // Validation
    if (!name || !username || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: name, username, email, password' },
        { status: 400 }
      )
    }

    // Check if username or email already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: existing.username === username ? 'Username already taken' : 'Email already registered' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        username,
        email,
        password: hashedPassword,
        role,
        avatarUrl: avatarUrl || null,
        hourlyRate: parseFloat(hourlyRate) || 25,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatarUrl: true,
        role: true,
        active: true,
        hourlyRate: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, user }, { status: 201 })
  } catch (err) {
    console.error('[users POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
