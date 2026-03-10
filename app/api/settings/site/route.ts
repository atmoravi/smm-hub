// app/api/settings/site/route.ts
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const UpdateSiteSchema = z.object({
  siteCurrency: z.string().min(1).optional(),
  metaToken: z.string().optional(),
  metaAdAccountId: z.string().optional(),
  metaApiVersion: z.string().optional(),
})

// GET /api/settings/site - Get site settings
export async function GET() {
  try {
    const settings = await prisma.siteSettings.findMany({
      select: { key: true, value: true, updatedAt: true },
    })

    const settingsObj: Record<string, unknown> = {}
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

    return Response.json({ data: settingsObj })
  } catch (err) {
    console.error('[settings/site GET]', err)
    return Response.json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}

// PUT /api/settings/site - Update site settings
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = UpdateSiteSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: { message: 'Invalid input', code: 'INVALID_INPUT', issues: parsed.error.issues } },
        { status: 422 }
      )
    }

    const { siteCurrency, metaToken, metaAdAccountId, metaApiVersion } = parsed.data
    const updates: Promise<unknown>[] = []

    if (siteCurrency !== undefined) {
      updates.push(prisma.siteSettings.upsert({ where: { key: 'siteCurrency' }, update: { value: JSON.stringify(siteCurrency) }, create: { key: 'siteCurrency', value: JSON.stringify(siteCurrency) } }))
    }
    if (metaToken !== undefined) {
      updates.push(prisma.siteSettings.upsert({ where: { key: 'metaToken' }, update: { value: JSON.stringify(metaToken) }, create: { key: 'metaToken', value: JSON.stringify(metaToken) } }))
    }
    if (metaAdAccountId !== undefined) {
      updates.push(prisma.siteSettings.upsert({ where: { key: 'metaAdAccountId' }, update: { value: JSON.stringify(metaAdAccountId) }, create: { key: 'metaAdAccountId', value: JSON.stringify(metaAdAccountId) } }))
    }
    if (metaApiVersion !== undefined) {
      updates.push(prisma.siteSettings.upsert({ where: { key: 'metaApiVersion' }, update: { value: JSON.stringify(metaApiVersion) }, create: { key: 'metaApiVersion', value: JSON.stringify(metaApiVersion) } }))
    }

    await Promise.all(updates)

    return Response.json({ data: { siteCurrency, metaToken, metaAdAccountId, metaApiVersion } })
  } catch (err) {
    console.error('[settings/site PUT]', err)
    return Response.json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
