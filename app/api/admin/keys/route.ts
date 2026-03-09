// app/api/admin/keys/route.ts
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateAdminPin } from '@/lib/auth'
import { randomBytes } from 'crypto'

const SOURCES = ['organicLeads', 'paidLeads', 'purchases'] as const

const RotateKeySchema = z.object({
  source: z.enum(['organicLeads', 'paidLeads', 'purchases']),
})

function generateKey(): string {
  return 'sk-smm-' + randomBytes(24).toString('hex')
}

// GET /api/admin/keys — returns all keys
export async function GET(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin')
  if (!validateAdminPin(pin ?? '')) {
    return Response.json({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  // Ensure all 3 keys exist (seed on first call)
  for (const source of SOURCES) {
    const existing = await prisma.apiKey.findUnique({ where: { source } })
    if (!existing) {
      await prisma.apiKey.create({ data: { source, key: generateKey() } })
    }
  }

  const keys = await prisma.apiKey.findMany({
    where: { source: { in: [...SOURCES] } },
    select: { source: true, key: true, updatedAt: true },
  })

  return Response.json({ data: keys })
}

// POST /api/admin/keys/rotate — rotate a specific key
export async function POST(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin')
  if (!validateAdminPin(pin ?? '')) {
    return Response.json({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = RotateKeySchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: { message: 'Invalid source. Must be: organicLeads, paidLeads, or purchases', code: 'INVALID_INPUT' } },
        { status: 400 }
      )
    }

    const { source } = parsed.data
    const newKey = generateKey()

    const updated = await prisma.apiKey.upsert({
      where: { source },
      update: { key: newKey },
      create: { source, key: newKey },
    })

    return Response.json({ data: { source: updated.source, key: updated.key } })
  } catch (err) {
    console.error('[admin/keys POST]', err)
    return Response.json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
