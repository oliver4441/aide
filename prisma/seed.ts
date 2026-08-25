import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.$queryRaw`SELECT 1`;
  console.log("Connected to database");

  // Clean all business/demo data
  await prisma.review.deleteMany();
  await prisma.syncConflict.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.businessMembership.deleteMany();
  await prisma.business.deleteMany();

  // Platform admin
  const existingAdmin = await prisma.admin.findUnique({ where: { email: "admin@aide.co.ke" } });
  if (!existingAdmin) {
    const adminHash = await bcrypt.hash("admin123", 10);
    await prisma.admin.create({
      data: { email: "admin@aide.co.ke", name: "System Admin", passwordHash: adminHash, role: "SUPER_ADMIN" },
    });
  }

  // Business user (creates their own business on first login via BusinessGate)
  const existingUser = await prisma.user.findUnique({ where: { email: "oliver@aide.co.ke" } });
  if (!existingUser) {
    const userHash = await bcrypt.hash("password123", 10);
    await prisma.user.create({
      data: { email: "oliver@aide.co.ke", name: "Oliver Langat", passwordHash: userHash, phone: "+254700000000" },
    });
  }

  console.log("Seeded:");
  console.log("  - admin@aide.co.ke / admin123 (platform admin)");
  console.log("  - oliver@aide.co.ke / password123 (business user)");
  console.log("  - No demo businesses. New signups create their own workspace.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
