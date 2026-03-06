import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const generateKey = () => 'sk-smm-' + Array.from({length: 32}, () => Math.random().toString(36)[2]).join('')

async function main() {
  console.log('🌱 Seeding API keys...')

  const sources = [
    { source: 'organicLeads', label: 'Organic Leads' },
    { source: 'paidLeads', label: 'Paid Leads' },
    { source: 'purchases', label: 'Purchases' },
  ]

  for (const { source, label } of sources) {
    const existing = await prisma.apiKey.findUnique({ where: { source } })
    
    if (existing) {
      console.log(`✓ ${label} key already exists: ${existing.key.slice(0, 12)}...`)
    } else {
      const key = generateKey()
      await prisma.apiKey.create({
        data: { source, key },
      })
      console.log(`✓ Created ${label} key: ${key}`)
    }
  }

  console.log('✅ Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
