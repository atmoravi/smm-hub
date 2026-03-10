// app/api/meta/settings/route.ts
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const CreateMetaSettingsSchema = z.object({
  label: z.string().min(1),
  metaCampaignNames: z.array(z.string().min(1)).min(1).max(2),
  adsetNames: z.array(z.string()).max(10).default([]),
  active: z.boolean().default(true),
})

// GET /api/meta/settings
export async function GET() {
  try {
    const settings = await prisma.metaSettings.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return Response.json({ data: settings })
  } catch (err) {
    console.error('[meta/settings GET]', err)
    return Response.json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}

// POST /api/meta/settings
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = CreateMetaSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors } },
        { status: 422 }
      )
    }

    const { label, metaCampaignNames, adsetNames, active } = parsed.data
    const webhookSecret = crypto.randomUUID()

    const setting = await prisma.metaSettings.create({
      data: { label, metaCampaignNames, adsetNames, webhookSecret, active },
    })

    return Response.json({ data: setting }, { status: 201 })
  } catch (err) {
    console.error('[meta/settings POST]', err)
    return Response.json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
