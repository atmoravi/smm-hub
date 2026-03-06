// app/api/admin/keys/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAdminPin } from '@/lib/auth'
import { randomBytes } from 'crypto'

const SOURCES = ['organicLeads', 'paidLeads', 'purchases'] as const

function generateKey(): string {
  return 'sk-smm-' + randomBytes(24).toString('hex')
}

// GET /api/admin/keys — returns all keys (masked)
export async function GET(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin')
  if (!validateAdminPin(pin ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  return NextResponse.json({ keys })
}

// POST /api/admin/keys/rotate — rotate a specific key
export async function POST(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin')
  if (!validateAdminPin(pin ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { source } = await req.json()

  if (!SOURCES.includes(source)) {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  }

  const newKey = generateKey()

  const updated = await prisma.apiKey.upsert({
    where: { source },
    update: { key: newKey },
    create: { source, key: newKey },
  })

  return NextResponse.json({ success: true, source, key: updated.key })
}
