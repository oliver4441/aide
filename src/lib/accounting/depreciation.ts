import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { postEntry, seedChartOfAccounts } from "./post";
import { depreciationForPeriod, fromUnits, toUnits } from "./depreciationCore.mjs";

/**
 * AIDE-07 / ACC-11: run monthly straight-line depreciation.
 *
 * For each active asset acquired on or before the period end with no entry yet
 * for that asset-period, posts:
 *   Dr Depreciation Expense (5500)
 *   Cr Accumulated Depreciation (1510)
 * and records the DepreciationEntry. Idempotent: an asset-period that already
 * has an entry is skipped, and the (assetId, year, month) unique index is the
 * final guard.
 */

export class DepreciationError extends Error {
  constructor(message: string, public status = 409) {
    super(message);
    this.name = "DepreciationError";
  }
}

export type DepreciationResult = {
  year: number;
  month: number;
  posted: number;
  skipped: number;
  totalAmount: string;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function runDepreciation(
  businessId: string,
  year: number,
  month: number
): Promise<DepreciationResult> {
  await seedChartOfAccounts(businessId);

  const period = await prisma.accountingPeriod.findUnique({
    where: { businessId_year_month: { businessId, year, month } },
    select: { status: true },
  });
  if (!period) {
    await prisma.accountingPeriod.create({
      data: { businessId, year, month, label: `${MONTHS[month - 1]} ${year}`, status: "OPEN" },
    });
  } else if (period.status !== "OPEN") {
    throw new DepreciationError(`${MONTHS[month - 1]} ${year} is not open`);
  }

  const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const assets = await prisma.fixedAsset.findMany({
    where: {
      businessId,
      status: "ACTIVE",
      acquisitionDate: { lte: periodEnd },
    },
    select: {
      id: true,
      name: true,
      cost: true,
      salvageValue: true,
      usefulLifeMonths: true,
      acquisitionDate: true,
    },
    orderBy: { assetCode: "asc" },
  });

  if (assets.length === 0) {
    return { year, month, posted: 0, skipped: 0, totalAmount: "0.0000" };
  }

  const assetIds = assets.map((a) => a.id);
  const priorEntries = await prisma.depreciationEntry.findMany({
    where: { assetId: { in: assetIds } },
    select: { assetId: true, periodYear: true, periodMonth: true, amount: true },
  });

  const accumulatedBefore = new Map<string, bigint>();
  const alreadyPosted = new Set<string>();
  for (const entry of priorEntries) {
    if (entry.periodYear === year && entry.periodMonth === month) {
      alreadyPosted.add(entry.assetId);
      continue;
    }
    if (
      entry.periodYear < year ||
      (entry.periodYear === year && entry.periodMonth < month)
    ) {
      const key = entry.assetId;
      accumulatedBefore.set(key, (accumulatedBefore.get(key) ?? BigInt(0)) + toUnits(entry.amount));
    }
  }

  let posted = 0;
  let skipped = 0;
  let total = BigInt(0);

  for (const asset of assets) {
    if (alreadyPosted.has(asset.id)) {
      skipped++;
      continue;
    }

    const amount = depreciationForPeriod({
      cost: asset.cost.toString(),
      salvageValue: asset.salvageValue.toString(),
      usefulLifeMonths: asset.usefulLifeMonths,
      acquisitionDate: asset.acquisitionDate,
      year,
      month,
      accumulated: fromUnits(accumulatedBefore.get(asset.id) ?? BigInt(0)),
    });

    if (amount === "0.0000") {
      skipped++;
      continue;
    }

    const entry = await postEntry({
      businessId,
      description: `Depreciation ${MONTHS[month - 1]} ${year} — ${asset.name}`,
      sourceType: "depreciation",
      sourceId: `${asset.id}:${year}-${String(month).padStart(2, "0")}`,
      date: periodEnd,
      postings: [
        { account: "5500", amount, side: "debit", description: "Depreciation expense" },
        { account: "1510", amount, side: "credit", description: "Accumulated depreciation" },
      ],
    });

    const accumulated = (accumulatedBefore.get(asset.id) ?? BigInt(0)) + toUnits(amount);
    await prisma.depreciationEntry.create({
      data: {
        assetId: asset.id,
        periodYear: year,
        periodMonth: month,
        amount: new Prisma.Decimal(amount),
        accumulated: new Prisma.Decimal(fromUnits(accumulated)),
        journalEntryId: entry.entryId,
      },
    });

    accumulatedBefore.set(asset.id, accumulated);
    total += toUnits(amount);
    posted++;
  }

  return { year, month, posted, skipped, totalAmount: fromUnits(total) };
}
