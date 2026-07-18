import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'founder@botdock.dev' },
    update: {},
    create: { email: 'founder@botdock.dev', name: 'BotDock Founder' },
  });

  const organisation = await prisma.organisation.upsert({
    where: { slug: 'botdock-labs' },
    update: {},
    create: { name: 'BotDock Labs', slug: 'botdock-labs' },
  });

  await prisma.organisationMember.upsert({
    where: {
      organisationId_userId: {
        organisationId: organisation.id,
        userId: user.id,
      },
    },
    update: { role: 'OWNER' },
    create: {
      organisationId: organisation.id,
      userId: user.id,
      role: 'OWNER',
    },
  });

  await prisma.bot.upsert({
    where: { id: 'seed-botdock-docs-assistant' },
    update: {},
    create: {
      id: 'seed-botdock-docs-assistant',
      organisationId: organisation.id,
      createdById: user.id,
      name: 'BotDock Docs Assistant',
      description: 'Seed chatbot used to verify the repository foundation.',
    },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
