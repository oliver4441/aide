import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Seed credentials are read from the environment.
 *
 * This file previously hardcoded the admin and business-user passwords in
 * plaintext, and those exact values were published in `public/llms.txt` before
 * commit `90041d6`. They must be considered compromised. A seed file that bakes
 * credentials into source is also the reason they end up in git history at all,
 * so they now have to be supplied at run time:
 *
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD,
 *   SEED_USER_EMAIL, SEED_USER_PASSWORD,
 *   SEED_USER_NAME (optional)
 *
 * ⚠️ DESTRUCTIVE: this wipes every review, sync conflict, sale, sale item,
 * product, category, membership and business before seeding. It is a
 * development fixture, not a production migration — never point it at
 * production Neon.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Seed credentials must come from the environment — ` +
        `they are deliberately not in source control.`
    );
  }
  return value;
}

async function main() {
  const adminEmail = required("SEED_ADMIN_EMAIL");
  const adminPassword = required("SEED_ADMIN_PASSWORD");
  const userEmail = required("SEED_USER_EMAIL");
  const userPassword = required("SEED_USER_PASSWORD");
  const userName = process.env.SEED_USER_NAME || "Seeded User";

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
  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const adminHash = await bcrypt.hash(adminPassword, 10);
    await prisma.admin.create({
      data: { email: adminEmail, name: "System Admin", passwordHash: adminHash, role: "SUPER_ADMIN" },
    });
  }

  // Business user (creates their own business on first login via BusinessGate)
  const existingUser = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!existingUser) {
    const userHash = await bcrypt.hash(userPassword, 10);
    await prisma.user.create({
      data: { email: userEmail, name: userName, passwordHash: userHash },
    });
  }

  console.log("Seeded:");
  console.log(`  - ${adminEmail} (platform admin)`);
  console.log(`  - ${userEmail} (business user)`);
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
