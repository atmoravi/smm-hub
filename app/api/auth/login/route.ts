// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// POST /api/auth/login - Authenticate user (worker or admin)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

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
        password: true, // Need password for comparison
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    if (!user.active) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact your administrator.' },
        { status: 403 }
      )
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user
    return NextResponse.json({ 
      success: true, 
      user: userWithoutPassword 
    })
  } catch (err) {
    console.error('[auth/login]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/auth/workers - List active workers (for login dropdown)
export async function GET(req: NextRequest) {
  try {
    const workers = await prisma.user.findMany({
      where: { 
        active: true,
        role: 'user' // Only return regular users (workers), not admins
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ workers })
  } catch (err) {
    console.error('[auth/workers]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
