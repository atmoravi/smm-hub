import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      active: true,
      hourlyRate: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  console.log('\n=== Users in Database ===\n')
  if (users.length === 0) {
    console.log('No users found.')
  } else {
    users.forEach((u, i) => {
      console.log(`${i + 1}. ${u.name} (@${u.username})`)
      console.log(`   Email: ${u.email}`)
      console.log(`   Role: ${u.role}`)
      console.log(`   Active: ${u.active ? '✓' : '✗'}`)
      console.log(`   Hourly Rate: $${u.hourlyRate}/hr`)
      console.log(`   Created: ${u.createdAt.toLocaleDateString()}`)
      console.log('')
    })
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
