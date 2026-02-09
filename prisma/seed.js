import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.slaPolicy.createMany({
    skipDuplicates: true,
    data: [
      { priority: "HIGH", responseMinutes: 30, resolveMinutes: 240 },
      { priority: "MEDIUM", responseMinutes: 120, resolveMinutes: 1440 },
      { priority: "LOW", responseMinutes: 480, resolveMinutes: 4320 },
    ],
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
