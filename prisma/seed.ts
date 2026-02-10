import { PrismaClient, Prisma } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const slaPolicies: Prisma.SlaPolicyCreateInput[] = [
  {
    priority: "LOW",
    responseMinutes: 240,  // 4 jam
    resolveMinutes: 1440,  // 24 jam
    active: true,
  },
  {
    priority: "MEDIUM",
    responseMinutes: 120, // 2 jam
    resolveMinutes: 720,  // 12 jam
    active: true,
  },
  {
    priority: "HIGH",
    responseMinutes: 30,  // 30 menit
    resolveMinutes: 240,  // 4 jam
    active: true,
  },
];

const ticketData: Prisma.TicketCreateInput[] = [
  {
    code: "TIC-0001",
    title: "PC tidak bisa menyala",
    description: "PC mati total setelah hujan",
    priority: "HIGH",
    category: "HARDWARE",
    responseDueAt: new Date(Date.now() + 30 * 60 * 1000),
    resolveDueAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
    messages: {
      create: [
        {
          sender: "user",
          message: "Tolong dicek secepatnya",
        },
        {
          sender: "agent",
          message: "Baik, kami segera ke lokasi",
        },
      ],
    },
  },
  {
    code: "TIC-0002",
    title: "Tidak bisa login email",
    description: "Password selalu salah",
    priority: "MEDIUM",
    category: "ACCOUNT",
    responseDueAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    resolveDueAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    messages: {
      create: [
        {
          sender: "user",
          message: "Email kantor tidak bisa login",
        },
      ],
    },
  },
];

export async function main() {
  console.log("🌱 Seeding SLA policies...");
  for (const sla of slaPolicies) {
    await prisma.slaPolicy.upsert({
      where: { priority: sla.priority },
      update: {},
      create: sla,
    });
  }

  console.log("🌱 Seeding tickets...");
  for (const ticket of ticketData) {
    await prisma.ticket.upsert({
      where: { code: ticket.code },
      update: {},
      create: ticket,
    });
  }
}

// ==============================
// RUNNER
// ==============================
main()
  .then(() => {
    console.log("✅ Seed selesai");
  })
  .catch((e) => {
    console.error("❌ Seed error", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
