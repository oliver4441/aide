import { PrismaClient, BusinessType, PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Warm up connection
  await prisma.$queryRaw`SELECT 1`;
  console.log("✅ Database connection warmed up");

  // Clean existing data (sequential to avoid timeouts)
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.businessMembership.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();
  await prisma.admin.deleteMany();

  // Create admin
  const adminHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.admin.create({
    data: {
      email: "admin@aide.co.ke",
      name: "System Admin",
      passwordHash: adminHash,
      role: "SUPER_ADMIN",
    },
  });

  // Create test user (owner)
  const userHash = await bcrypt.hash("password123", 10);
  const user = await prisma.user.create({
    data: {
      email: "oliver@aide.co.ke",
      name: "Oliver Langat",
      passwordHash: userHash,
      phone: "+254700000000",
    },
  });

  // Create businesses
  const salon = await prisma.business.create({
    data: {
      name: "Beauty Hub Salon",
      type: BusinessType.SALON,
      slug: "beauty-hub-salon",
      currency: "KSh",
      taxRate: 16,
      receiptFooter: "Thank you for visiting Beauty Hub Salon! Follow us @beautyhubke",
      adminId: admin.id,
    },
  });

  const shop = await prisma.business.create({
    data: {
      name: "TechCore Electronics",
      type: BusinessType.ELECTRONICS,
      slug: "techcore-electronics",
      currency: "KSh",
      taxRate: 16,
      adminId: admin.id,
    },
  });

  // User memberships
  await prisma.businessMembership.create({
    data: { userId: user.id, businessId: salon.id, role: "OWNER" },
  });
  await prisma.businessMembership.create({
    data: { userId: user.id, businessId: shop.id, role: "MANAGER" },
  });

  // Salon categories
  const hairCare = await prisma.category.create({
    data: { name: "Hair Care", businessId: salon.id, sortOrder: 0 },
  });
  const skinCare = await prisma.category.create({
    data: { name: "Skin Care", businessId: salon.id, sortOrder: 1 },
  });
  const services = await prisma.category.create({
    data: { name: "Services", businessId: salon.id, sortOrder: 2 },
  });
  const tools = await prisma.category.create({
    data: { name: "Tools & Accessories", businessId: salon.id, sortOrder: 3 },
  });

  // Salon products
  const salonProducts = [
    { name: "Argan Hair Serum", sku: "HS-042", buyingPrice: 350, sellingPrice: 850, quantity: 15, lowStock: 5, categoryId: hairCare.id },
    { name: "Keratin Treatment Kit", sku: "KT-108", buyingPrice: 1200, sellingPrice: 2800, quantity: 8, lowStock: 3, categoryId: hairCare.id },
    { name: "Deep Conditioning Mask", sku: "DM-110", buyingPrice: 280, sellingPrice: 650, quantity: 5, lowStock: 5, categoryId: hairCare.id },
    { name: "Hair Spray Pro", sku: "HS-201", buyingPrice: 180, sellingPrice: 450, quantity: 22, lowStock: 8, categoryId: hairCare.id },
    { name: "Styling Gel", sku: "SG-055", buyingPrice: 120, sellingPrice: 320, quantity: 30, lowStock: 10, categoryId: hairCare.id },
    { name: "Moisturizing Cream", sku: "MC-077", buyingPrice: 200, sellingPrice: 520, quantity: 18, lowStock: 5, categoryId: skinCare.id },
    { name: "Face Cleanser", sku: "FC-033", buyingPrice: 150, sellingPrice: 400, quantity: 25, lowStock: 8, categoryId: skinCare.id },
    { name: "Sunscreen SPF50", sku: "SS-099", buyingPrice: 300, sellingPrice: 750, quantity: 12, lowStock: 5, categoryId: skinCare.id },
    { name: "Pro Scissors", sku: "PS-001", buyingPrice: 800, sellingPrice: 1800, quantity: 7, lowStock: 3, categoryId: tools.id },
    { name: "Hair Dryer Pro", sku: "HD-022", buyingPrice: 2500, sellingPrice: 5500, quantity: 4, lowStock: 2, categoryId: tools.id },
    { name: "Nail Polish Set", sku: "NP-066", buyingPrice: 400, sellingPrice: 950, quantity: 3, lowStock: 5, categoryId: skinCare.id },
    { name: "Hair Trim Kit", sku: "HT-088", buyingPrice: 600, sellingPrice: 1400, quantity: 6, lowStock: 3, categoryId: tools.id },
  ];

  // Services (not services in the product sense — they have isService: true)
  const salonServices = [
    { name: "Hair Wash & Blow Dry", buyingPrice: 0, sellingPrice: 500, quantity: 999, lowStock: 0, categoryId: services.id, isService: true },
    { name: "Haircut & Styling", buyingPrice: 0, sellingPrice: 800, quantity: 999, lowStock: 0, categoryId: services.id, isService: true },
    { name: "Keratin Treatment", buyingPrice: 0, sellingPrice: 3500, quantity: 999, lowStock: 0, categoryId: services.id, isService: true },
    { name: "Manicure & Pedicure", buyingPrice: 0, sellingPrice: 1200, quantity: 999, lowStock: 0, categoryId: services.id, isService: true },
    { name: "Facial Treatment", buyingPrice: 0, sellingPrice: 1500, quantity: 999, lowStock: 0, categoryId: services.id, isService: true },
  ];

  const allSalonProducts = [...salonProducts, ...salonServices];
  const products = [];
  for (const p of allSalonProducts) {
    const created = await prisma.product.create({
      data: { ...p, businessId: salon.id },
    });
    products.push(created);
  }

  // Create sample sales for the last few days
  const now = new Date();
  const salesData = [];
  for (let i = 0; i < 15; i++) {
    const daysAgo = Math.floor(i / 3);
    const hoursAgo = (i % 3) * 3 + Math.floor(Math.random() * 3);
    const saleDate = new Date(now.getTime() - (daysAgo * 24 + hoursAgo) * 60 * 60 * 1000);

    // Pick 1-3 random products
    const itemCount = 1 + Math.floor(Math.random() * 3);
    const pickedProducts = [];
    const usedIndices = new Set<number>();
    for (let j = 0; j < itemCount; j++) {
      let idx: number;
      do {
        idx = Math.floor(Math.random() * products.length);
      } while (usedIndices.has(idx));
      usedIndices.add(idx);
      pickedProducts.push(products[idx]);
    }

    let total = 0;
    let cost = 0;
    const items = pickedProducts.map((p) => {
      const qty = p.isService ? 1 : 1 + Math.floor(Math.random() * 2);
      const itemPrice = p.sellingPrice * qty;
      const itemCost = p.buyingPrice * qty;
      total += itemPrice;
      cost += itemCost;
      return { name: p.name, quantity: qty, price: p.sellingPrice, cost: p.buyingPrice, productId: p.id };
    });

    const paid = total;
    const paymentMethods = [PaymentMethod.CASH, PaymentMethod.MOBILE_MONEY, PaymentMethod.CARD];
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

    const sale = await prisma.sale.create({
      data: {
        total,
        cost,
        profit: total - cost,
        paid,
        change: 0,
        paymentMethod,
        businessId: salon.id,
        createdAt: saleDate,
        items: { create: items },
      },
    });
    salesData.push(sale);
  }

  console.log(`✅ Seeded:`);
  console.log(`   - 1 admin (admin@aide.co.ke / admin123)`);
  console.log(`   - 1 user (oliver@aide.co.ke / password123)`);
  console.log(`   - 2 businesses`);
  console.log(`   - ${products.length} products/services`);
  console.log(`   - ${salesData.length} sample sales`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
