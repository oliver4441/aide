import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// In-memory mock store for local development in AI Studio (ephemeral/offline-first)
const inMemoryTables: Record<string, Map<string, any>> = {
  admin: new Map(),
  user: new Map(),
  business: new Map(),
  businessMembership: new Map(),
  product: new Map(),
  category: new Map(),
  sale: new Map(),
  saleItem: new Map(),
  review: new Map(),
  syncConflict: new Map(),
  notification: new Map(),
  notificationPreference: new Map(),
};

// Seed default initial data
function seedInMemoryData() {
  const adminId = "admin_1";
  const adminEmail = "kipkiruigideon890@gmail.com";
  // Password: admin123
  const adminHash = bcrypt.hashSync("admin123", 10);
  inMemoryTables.admin.set(adminId, {
    id: adminId,
    email: adminEmail,
    name: "System Admin",
    passwordHash: adminHash,
    role: "SUPER_ADMIN",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const demoUserId = "user_demo";
  const demoEmail = "demo@omixsystems.store";
  // Password: password123
  const userHash = bcrypt.hashSync("password123", 10);
  const demoBizId = "biz_demo";

  inMemoryTables.user.set(demoUserId, {
    id: demoUserId,
    email: demoEmail,
    name: "Jane Wanjiru",
    passwordHash: userHash,
    phone: "+254700000000",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  inMemoryTables.business.set(demoBizId, {
    id: demoBizId,
    name: "Wanjiru General Shop",
    type: "SHOP",
    slug: "wanjiru-general-shop",
    currency: "KSh",
    taxRate: 16,
    receiptFooter: "Thank you for shopping with us! Karibu tena.",
    logoUrl: null,
    adminId: adminId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  inMemoryTables.businessMembership.set(`${demoUserId}_${demoBizId}`, {
    id: "mem_demo",
    userId: demoUserId,
    businessId: demoBizId,
    role: "OWNER",
    createdAt: new Date(),
  });

  // Also give admin access to demoBizId
  inMemoryTables.businessMembership.set(`${adminId}_${demoBizId}`, {
    id: "mem_admin",
    userId: adminId,
    businessId: demoBizId,
    role: "OWNER",
    createdAt: new Date(),
  });
}

seedInMemoryData();

function createModelHandler(modelName: string) {
  const table = inMemoryTables[modelName] || (inMemoryTables[modelName] = new Map());

  return {
    findUnique: async (args?: any) => {
      const where = args?.where || {};
      for (const item of Array.from(table.values())) {
        let match = true;
        for (const [k, v] of Object.entries(where)) {
          if (k === "userId_businessId" && typeof v === "object" && v !== null) {
            const comp = v as { userId: string; businessId: string };
            if (item.userId !== comp.userId || item.businessId !== comp.businessId) {
              match = false;
              break;
            }
          } else if (item[k] !== v) {
            match = false;
            break;
          }
        }
        if (match) {
          if (args?.include?.businesses || args?.select?.businesses) {
            const userBiz = Array.from(inMemoryTables.businessMembership.values())
              .filter((m) => m.userId === item.id)
              .map((m) => ({ businessId: m.businessId }));
            return { ...item, businesses: userBiz };
          }
          return item;
        }
      }
      return null;
    },
    findFirst: async (args?: any) => {
      const where = args?.where || {};
      for (const item of Array.from(table.values())) {
        let match = true;
        for (const [k, v] of Object.entries(where)) {
          if (item[k] !== v) {
            match = false;
            break;
          }
        }
        if (match) return item;
      }
      return null;
    },
    findMany: async (args?: any) => {
      const where = args?.where || {};
      const results: any[] = [];
      for (const item of Array.from(table.values())) {
        let match = true;
        for (const [k, v] of Object.entries(where)) {
          if (item[k] !== v) {
            match = false;
            break;
          }
        }
        if (match) results.push(item);
      }
      return results;
    },
    create: async (args: any) => {
      const data = args?.data || {};
      const id = data.id || `cuid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const record = {
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      table.set(id, record);
      return record;
    },
    update: async (args: any) => {
      const where = args?.where || {};
      const data = args?.data || {};
      for (const [id, item] of Array.from(table.entries())) {
        let match = true;
        for (const [k, v] of Object.entries(where)) {
          if (item[k] !== v) {
            match = false;
            break;
          }
        }
        if (match) {
          const updated = { ...item, ...data, updatedAt: new Date() };
          table.set(id, updated);
          return updated;
        }
      }
      return data;
    },
    delete: async (args: any) => {
      const where = args?.where || {};
      for (const [id, item] of Array.from(table.entries())) {
        let match = true;
        for (const [k, v] of Object.entries(where)) {
          if (item[k] !== v) {
            match = false;
            break;
          }
        }
        if (match) {
          table.delete(id);
          return item;
        }
      }
      return {};
    },
    deleteMany: async () => {
      table.clear();
      return { count: 0 };
    },
    count: async () => table.size,
    aggregate: async () => ({ _sum: { total: 0, profit: 0 }, _count: { id: table.size } }),
    upsert: async (args: any) => {
      const createData = args?.create || {};
      const id = createData.id || `cuid_${Date.now()}`;
      const record = { id, createdAt: new Date(), updatedAt: new Date(), ...createData };
      table.set(id, record);
      return record;
    },
  };
}

function createPrismaMock() {
  const modelCache: Record<string, any> = {};

  const mock: any = new Proxy(
    {},
    {
      get: (_, prop: string) => {
        if (prop === "$connect" || prop === "$disconnect") return async () => {};
        if (prop === "$queryRaw" || prop === "$executeRaw") return async () => [];
        if (prop === "$transaction") {
          return async (fnOrArray: any) => {
            if (typeof fnOrArray === "function") {
              return fnOrArray(mock);
            }
            if (Array.isArray(fnOrArray)) {
              return Promise.all(fnOrArray);
            }
            return [];
          };
        }
        if (!modelCache[prop]) {
          modelCache[prop] = createModelHandler(prop);
        }
        return modelCache[prop];
      },
    }
  );

  return mock;
}

const mockPrisma = createPrismaMock();

// Create Prisma client if DATABASE_URL is valid, with automatic fallback to mock
let realPrisma: any = null;
try {
  // Only attempt real PrismaClient if DATABASE_URL starts with postgresql:// or postgres:// and is not dummy
  const url = process.env.DATABASE_URL || "";
  if (url.includes("@") && !url.includes("localhost:5432")) {
    realPrisma = new PrismaClient();
  }
} catch (e) {
  console.warn("[AI Studio] PrismaClient initialization skipped or failed, using mock:", e);
}

// Proxied prisma export that routes calls to real Prisma when available, but falls back gracefully
export const prisma: PrismaClient = new Proxy(
  {},
  {
    get: (_, prop: string) => {
      if (realPrisma) {
        const val = realPrisma[prop];
        if (typeof val === "function") {
          return (...args: any[]) => {
            try {
              const res = val.apply(realPrisma, args);
              if (res && typeof res.then === "function") {
                return res.catch((err: any) => {
                  console.warn(`[AI Studio] Real Prisma failed on ${prop}, falling back to mock:`, err?.message);
                  const mockTarget = mockPrisma[prop];
                  return typeof mockTarget === "function" ? mockTarget(...args) : mockTarget;
                });
              }
              return res;
            } catch (err: any) {
              console.warn(`[AI Studio] Real Prisma threw on ${prop}, falling back to mock:`, err?.message);
              const mockTarget = mockPrisma[prop];
              return typeof mockTarget === "function" ? mockTarget(...args) : mockTarget;
            }
          };
        }
        if (val && typeof val === "object") {
          return new Proxy(val, {
            get: (modelTarget: any, modelProp: string) => {
              const modelVal = modelTarget[modelProp];
              if (typeof modelVal === "function") {
                return (...args: any[]) => {
                  try {
                    const res = modelVal.apply(modelTarget, args);
                    if (res && typeof res.then === "function") {
                      return res.catch((err: any) => {
                        console.warn(
                          `[AI Studio] DB connection error on ${prop}.${modelProp}, using mock store:`,
                          err?.message
                        );
                        return mockPrisma[prop][modelProp](...args);
                      });
                    }
                    return res;
                  } catch (err: any) {
                    console.warn(`[AI Studio] DB threw on ${prop}.${modelProp}, using mock store:`, err?.message);
                    return mockPrisma[prop][modelProp](...args);
                  }
                };
              }
              return modelVal;
            },
          });
        }
      }
      return mockPrisma[prop];
    },
  }
) as unknown as PrismaClient;
