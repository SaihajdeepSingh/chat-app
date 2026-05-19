const { PrismaClient } = require('@prisma/client');

const prisma = global.__prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== 'production') global.__prisma = prisma;

prisma.$on('error', async () => {
  await prisma.$disconnect();
  await prisma.$connect();
});

module.exports = prisma;