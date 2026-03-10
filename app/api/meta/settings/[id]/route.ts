// app/api/meta/settings/[id]/route.ts
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const UpdateMetaSettingsSchema = z.object({
  label: z.string().min(1).optional(),
  metaCampaignNames: z.array(z.string().min(1)).min(1).max(2).optional(),
  adsetNames: z.array(z.string()).max(10).optional(),
  active: z.boolean().optional(),
})

// PUT /api/meta/settings/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const parsed = UpdateMetaSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors } },
        { status: 422 }
      )
    }

    const existing = await prisma.metaSettings.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: { message: 'Not found', code: 'NOT_FOUND' } }, { status: 404 })
    }

    const updated = await prisma.metaSettings.update({
      where: { id },
      data: parsed.data,
    })

    return Response.json({ data: updated })
  } catch (err) {
    console.error('[meta/settings PUT]', err)
    return Response.json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}

// DELETE /api/meta/settings/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const existing = await prisma.metaSettings.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: { message: 'Not found', code: 'NOT_FOUND' } }, { status: 404 })
    }

    await prisma.metaSettings.delete({ where: { id } })
    return Response.json({ data: { message: 'Deleted' } })
  } catch (err) {
    console.error('[meta/settings DELETE]', err)
    return Response.json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
