import { prisma } from "@/lib/prisma";

/**
 * AIDE-10: Inventory valuation report (INV-17, RPT-07).
 *
 * Calculates the total value of current inventory using the weighted average
 * cost method (buyingPrice × quantity). Returns per-product breakdown,
 * category summary, and overall totals.
 */

export interface ValuationProduct {
  productId: string;
  productName: string;
  sku: string | null;
  category: string | null;
  quantity: number;
  unitCost: number;
  totalValue: number;
}

export interface ValuationCategory {
  category: string;
  productCount: number;
  totalQuantity: number;
  totalValue: number;
}

export interface InventoryValuation {
  asOf: Date;
  currency: string;
  totalProducts: number;
  totalQuantity: number;
  totalValue: number;
  products: ValuationProduct[];
  categories: ValuationCategory[];
}

/**
 * Get inventory valuation report for a business.
 */
export async function getInventoryValuation(
  businessId: string,
  options?: {
    categoryId?: string;
    lowStockOnly?: boolean;
  }
): Promise<InventoryValuation> {
  const where: any = { businessId, isService: false };
  if (options?.categoryId) where.categoryId = options.categoryId;
  // Fetch all non-service products with quantities > 0
  let products = await prisma.product.findMany({
    where: {
      ...where,
      quantity: { gt: 0 },
    },
    include: {
      category: {
        select: { name: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const currency = await prisma.business.findUnique({
    where: { id: businessId },
    select: { currency: true },
  });

  // Build per-product valuation
  const productValuations: ValuationProduct[] = products.map((p) => ({
    productId: p.id,
    productName: p.name,
    sku: p.sku,
    category: p.category?.name || null,
    quantity: p.quantity,
    unitCost: Number(p.buyingPrice),
    totalValue: p.quantity * Number(p.buyingPrice),
  }));

  // Build category summary
  const categoryMap = new Map<string, ValuationCategory>();
  for (const pv of productValuations) {
    const cat = pv.category || "Uncategorized";
    const existing = categoryMap.get(cat) || {
      category: cat,
      productCount: 0,
      totalQuantity: 0,
      totalValue: 0,
    };
    existing.productCount += 1;
    existing.totalQuantity += pv.quantity;
    existing.totalValue += pv.totalValue;
    categoryMap.set(cat, existing);
  }

  const categories = Array.from(categoryMap.values());

  const totalValue = productValuations.reduce((sum, p) => sum + p.totalValue, 0);
  const totalQuantity = productValuations.reduce((sum, p) => sum + p.quantity, 0);

  return {
    asOf: new Date(),
    currency: currency?.currency || "KES",
    totalProducts: productValuations.length,
    totalQuantity,
    totalValue,
    products: productValuations,
    categories,
  };
}

/**
 * Get low-stock products with their valuation.
 */
export async function getLowStockValuation(businessId: string): Promise<ValuationProduct[]> {
  const products = await prisma.product.findMany({
    where: {
      businessId,
      isService: false,
    },
    include: {
      category: {
        select: { name: true },
      },
    },
    orderBy: { quantity: "asc" },
  });

  // Filter to low stock only in application layer
  const lowStockProducts = products.filter((p) => p.quantity <= p.lowStock);

  return lowStockProducts.map((p) => ({
    productId: p.id,
    productName: p.name,
    sku: p.sku,
    category: p.category?.name || null,
    quantity: p.quantity,
    unitCost: Number(p.buyingPrice),
    totalValue: p.quantity * Number(p.buyingPrice),
  }));
}
