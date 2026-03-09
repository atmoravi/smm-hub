import 'server-only'
import { z } from 'zod'

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1).optional(),
  ADMIN_PIN: z.string().min(4, 'ADMIN_PIN must be at least 4 characters').default('1234'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

export const env = EnvSchema.parse(process.env)
