// app/api/posts/route.ts
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const PostSchema = z.object({
  title: z.string().min(1),
  platform: z.string(),
  contentType: z.string(),
  status: z.string(),
  scheduledDate: z.string(),
  publishedDate: z.string().optional(),
  caption: z.string().optional(),
  tags: z.array(z.string()).optional(),
  assignedTo: z.string().optional(),
  minutesSpent: z.number().int().min(0).optional(),
  impressions: z.number().int().min(0).optional(),
  organicLeads: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  createdBy: z.string(),
})

const UpdatePostSchema = PostSchema.partial()

// GET /api/posts?status=Draft&platform=Instagram
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const platform = searchParams.get('platform')

    const posts = await prisma.post.findMany({
      where: {
        ...(status && { status }),
        ...(platform && { platform }),
      },
      orderBy: { createdAt: 'desc' },
    })

    return Response.json({ data: posts })
  } catch (err) {
    console.error('[posts GET]', err)
    return Response.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// POST /api/posts - Create a new post
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = PostSchema.safeParse(body)

    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
      console.error('[posts POST validation failed]', fieldErrors, 'Body:', JSON.stringify(body))
      return Response.json(
        { error: { message: 'Validation failed: ' + fieldErrors, code: 'VALIDATION_ERROR' } },
        { status: 422 }
      )
    }

    const {
      title,
      platform,
      contentType,
      status,
      scheduledDate,
      publishedDate,
      caption,
      tags,
      assignedTo,
      minutesSpent,
      impressions,
      organicLeads,
      notes,
      createdBy,
    } = parsed.data

    const post = await prisma.post.create({
      data: {
        title,
        platform,
        contentType,
        status,
        scheduledDate: new Date(scheduledDate),
        publishedDate: publishedDate ? new Date(publishedDate) : null,
        caption: caption || '',
        tags: tags || [],
        assignedTo: assignedTo || '',
        minutesSpent: minutesSpent || 0,
        impressions: impressions || 0,
        organicLeads: organicLeads || 0,
        notes: notes || '',
        createdBy,
      },
    })

    return Response.json({ data: post }, { status: 201 })
  } catch (err) {
    console.error('[posts POST]', err)
    return Response.json(
      { error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
