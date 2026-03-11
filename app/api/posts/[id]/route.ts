// app/api/posts/[id]/route.ts
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const UpdatePostSchema = z.object({
  title: z.string().min(1).optional(),
  platform: z.string().optional(),
  contentType: z.string().optional(),
  status: z.string().optional(),
  scheduledDate: z.string().optional(),
  publishedDate: z.string().optional(),
  caption: z.string().optional(),
  tags: z.array(z.string()).optional(),
  assignedTo: z.string().optional(),
  minutesSpent: z.number().int().min(0).optional(),
  impressions: z.number().int().min(0).optional(),
  organicLeads: z.number().int().min(0).optional(),
  notes: z.string().optional(),
})

// GET /api/posts/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const post = await prisma.post.findUnique({
      where: { id },
    })

    if (!post) {
      return Response.json(
        { error: { message: 'Post not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    return Response.json({ data: post })
  } catch (err) {
    console.error('[posts/[id] GET]', err)
    return Response.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// PUT /api/posts/[id] - Update a post
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const parsed = UpdatePostSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: { message: 'Invalid input', code: 'INVALID_INPUT', issues: parsed.error.issues } },
        { status: 422 }
      )
    }

    const existing = await prisma.post.findUnique({
      where: { id },
    })

    if (!existing) {
      return Response.json(
        { error: { message: 'Post not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (parsed.data.title !== undefined) updateData.title = parsed.data.title
    if (parsed.data.platform !== undefined) updateData.platform = parsed.data.platform
    if (parsed.data.contentType !== undefined) updateData.contentType = parsed.data.contentType
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status
    if (parsed.data.scheduledDate !== undefined) updateData.scheduledDate = new Date(parsed.data.scheduledDate)
    if (parsed.data.publishedDate !== undefined) updateData.publishedDate = parsed.data.publishedDate ? new Date(parsed.data.publishedDate) : null
    if (parsed.data.caption !== undefined) updateData.caption = parsed.data.caption
    if (parsed.data.tags !== undefined) updateData.tags = parsed.data.tags
    if (parsed.data.assignedTo !== undefined) updateData.assignedTo = parsed.data.assignedTo
    if (parsed.data.minutesSpent !== undefined) updateData.minutesSpent = parsed.data.minutesSpent
    if (parsed.data.impressions !== undefined) updateData.impressions = parsed.data.impressions
    if (parsed.data.organicLeads !== undefined) updateData.organicLeads = parsed.data.organicLeads
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes

    const post = await prisma.post.update({
      where: { id },
      data: updateData,
    })

    return Response.json({ data: post })
  } catch (err) {
    console.error('[posts/[id] PUT]', err)
    return Response.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// DELETE /api/posts/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const existing = await prisma.post.findUnique({
      where: { id },
    })

    if (!existing) {
      return Response.json(
        { error: { message: 'Post not found', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    await prisma.post.delete({
      where: { id },
    })

    return Response.json({ data: { id } })
  } catch (err) {
    console.error('[posts/[id] DELETE]', err)
    return Response.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
