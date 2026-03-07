// app/api/settings/site/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/settings/site - Get site settings
export async function GET() {
  try {
    const settings = await prisma.siteSettings.findMany({
      select: { key: true, value: true, updatedAt: true },
    })

    const settingsObj: Record<string, any> = {}
    for (const s of settings) {
      try {
        settingsObj[s.key] = JSON.parse(s.value)
      } catch {
        settingsObj[s.key] = s.value
      }
    }

    // Default site currency if not set
    if (!settingsObj.siteCurrency) {
      settingsObj.siteCurrency = 'EUR'
    }

    return NextResponse.json({ settings: settingsObj })
  } catch (err) {
    console.error('[settings/site GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/settings/site - Update site settings
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { siteCurrency } = body

    const updates: Promise<any>[] = []

    if (siteCurrency !== undefined) {
      updates.push(
        prisma.siteSettings.upsert({
          where: { key: 'siteCurrency' },
          update: { value: JSON.stringify(siteCurrency) },
          create: { key: 'siteCurrency', value: JSON.stringify(siteCurrency) },
        })
      )
    }

    await Promise.all(updates)

    return NextResponse.json({ success: true, siteCurrency })
  } catch (err) {
    console.error('[settings/site PUT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
