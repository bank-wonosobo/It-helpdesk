import prisma from "@/lib/prisma";

export async function calculateSla(priority: "LOW" | "MEDIUM" | "HIGH") {
  const sla = await prisma.slaPolicy.findUnique({
    where: { priority },
  });

  if (!sla) {
    throw new Error(`SLA policy not found for ${priority}`);
  }

  const now = new Date();

  const responseDueAt = new Date(
    now.getTime() + sla.responseMinutes * 60 * 1000
  );

  const resolveDueAt = new Date(
    now.getTime() + sla.resolveMinutes * 60 * 1000
  );

  return {
    responseDueAt,
    resolveDueAt,
  };
}
