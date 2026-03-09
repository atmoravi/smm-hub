// app/api/settings/keys/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'

// GET /api/settings/keys - Get all API keys (admin only in real app)
export async function GET() {
  const keys = await prisma.apiKey.findMany({
    select: {
      source: true,
      key: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { source: 'asc' },
  })

  return NextResponse.json({ keys })
}

// POST /api/settings/keys/rotate - Rotate a specific key
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { source } = body

    if (!source || !['organicLeads', 'paidLeads', 'purchases'].includes(source)) {
      return NextResponse.json(
        { error: 'Invalid source. Must be: organicLeads, paidLeads, or purchases' },
        { status: 400 }
      )
    }

    const generateKey = () => 'sk-smm-' + randomBytes(24).toString('hex')
    const newKey = generateKey()

    const updated = await prisma.apiKey.update({
      where: { source },
      data: { key: newKey },
    })

    return NextResponse.json({
      success: true,
      source: updated.source,
      key: updated.key,
      message: 'Key rotated successfully. Update your external services with the new key.',
    })
  } catch (err) {
    console.error('[rotate key]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
