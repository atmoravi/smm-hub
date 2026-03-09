// app/api/users/[id]/route.ts
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['user', 'admin']).optional(),
  active: z.boolean().optional(),
  currency: z.string().optional(),
  rates: z.record(z.string(), z.number()).optional(),
  avatarUrl: z.string().url().nullable().optional(),
})

// GET /api/users/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      return Response.json({ error: { message: 'User not found', code: 'USER_NOT_FOUND' } }, { status: 404 })
    }
    return Response.json({ data: user })
  } catch (err) {
    console.error('[user GET]', err)
    return Response.json({ error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' } }, { status: 500 })
  }
}

// PUT /api/users/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const parsed = UpdateUserSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors } },
        { status: 422 }
      )
    }

    const { name, username, email, password, role, avatarUrl, active, currency, rates } = parsed.data

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: { message: 'User not found', code: 'USER_NOT_FOUND' } }, { status: 404 })
    }

    if (username && username !== existing.username) {
      const usernameTaken = await prisma.user.findFirst({ where: { username } })
      if (usernameTaken) {
        return Response.json({ error: { message: 'Username already taken', code: 'USERNAME_TAKEN' } }, { status: 409 })
      }
    }

    if (email && email !== existing.email) {
      const emailTaken = await prisma.user.findFirst({ where: { email } })
      if (emailTaken) {
        return Response.json({ error: { message: 'Email already registered', code: 'EMAIL_TAKEN' } }, { status: 409 })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (username !== undefined) updateData.username = username
    if (email !== undefined) updateData.email = email
    if (password !== undefined) updateData.password = await bcrypt.hash(password, 10)
    if (role !== undefined) updateData.role = role
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl
    if (active !== undefined) updateData.active = active
    if (currency !== undefined) updateData.currency = currency
    if (rates !== undefined) updateData.rates = rates

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
        currency: true,
        rates: true,
        updatedAt: true,
      },
    })

    return Response.json({ data: user })
  } catch (err) {
    console.error('[user PUT]', err)
    return Response.json({ error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' } }, { status: 500 })
  }
}

// DELETE /api/users/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: { message: 'User not found', code: 'USER_NOT_FOUND' } }, { status: 404 })
    }
    await prisma.user.delete({ where: { id } })
    return Response.json({ data: { message: 'User deleted' } })
  } catch (err) {
    console.error('[user DELETE]', err)
    return Response.json({ error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' } }, { status: 500 })
  }
}
