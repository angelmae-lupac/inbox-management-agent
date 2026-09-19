import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.reply.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.gmailConnection.deleteMany({});
  console.log("Test data cleared.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());