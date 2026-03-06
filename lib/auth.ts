// lib/auth.ts
import { prisma } from './prisma'
import { NextRequest } from 'next/server'

export async function validateApiKey(
  req: NextRequest,
  expectedSource: string
): Promise<{ valid: boolean; error?: string }> {
  const key = req.headers.get('x-api-key')

  if (!key) {
    return { valid: false, error: 'Missing x-api-key header' }
  }

  const record = await prisma.apiKey.findUnique({
    where: { key },
  })

  if (!record) {
    return { valid: false, error: 'Invalid API key' }
  }

  if (record.source !== expectedSource) {
    return { valid: false, error: `This key is not authorized for ${expectedSource}` }
  }

  return { valid: true }
}

// Admin PIN check (for frontend — server-side session in production)
export function validateAdminPin(pin: string): boolean {
  return pin === process.env.ADMIN_PIN
}
