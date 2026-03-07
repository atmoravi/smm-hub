// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/users/[id] - Get a specific user
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    const user = await prisma.user.findUnique({
      where: { id },
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
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (err) {
    console.error('[user GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/users/[id] - Update a user
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, username, email, password, role, avatarUrl, active, hourlyRate, currency } = body

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if new username/email conflicts with another user
    if (username && username !== existing.username) {
      const usernameTaken = await prisma.user.findFirst({ where: { username } })
      if (usernameTaken) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
      }
    }

    if (email && email !== existing.email) {
      const emailTaken = await prisma.user.findFirst({ where: { email } })
      if (emailTaken) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
      }
    }

    // Build update data
    const updateData: any = {}
    if (name) updateData.name = name
    if (username) updateData.username = username
    if (email) updateData.email = email
    if (password) updateData.password = await bcrypt.hash(password, 10)
    if (role) updateData.role = role
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl
    if (active !== undefined) updateData.active = active
    if (hourlyRate !== undefined) updateData.hourlyRate = parseFloat(hourlyRate)
    if (currency !== undefined) updateData.currency = currency

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatarUrl: true,
        role: true,
        active: true,
        hourlyRate: true,
        currency: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, user })
  } catch (err) {
    console.error('[user PUT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'User deleted' })
  } catch (err) {
    console.error('[user DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
