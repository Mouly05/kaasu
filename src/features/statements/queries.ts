import "server-only";

import { isValidObjectId } from "mongoose";

import { connectDb } from "@/lib/db/connection";
import { MerchantRule } from "@/lib/db/models/merchant-rule";
import { StatementImport } from "@/lib/db/models/statement-import";
import type { StatementImportStatus } from "@/lib/db/models/statement-import";

export interface StatementImportSummary {
  id: string;
  fileName: string;
  bank: string;
  period: { from: Date; to: Date };
  rowCount: number;
  importedCount: number;
  duplicateCount: number;
  status: StatementImportStatus;
  createdAt: Date;
}

/** The signed-in user's statement imports, most recent first. */
export async function listStatementImports(userId: string, limit = 20): Promise<StatementImportSummary[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();
  const imports = await StatementImport.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
  return imports.map((i) => ({
    id: String(i._id),
    fileName: i.fileName,
    bank: i.bank,
    period: i.period,
    rowCount: i.rowCount,
    importedCount: i.importedCount,
    duplicateCount: i.duplicateCount,
    status: i.status,
    createdAt: i.createdAt,
  }));
}

export interface MerchantRuleSummary {
  id: string;
  pattern: string;
  categoryId: string;
  confidence: number;
  hits: number;
}

/** The signed-in user's merchant categorisation rules, most-used first. */
export async function listMerchantRules(userId: string): Promise<MerchantRuleSummary[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();
  const rules = await MerchantRule.find({ userId }).sort({ hits: -1 }).lean();
  return rules.map((r) => ({
    id: String(r._id),
    pattern: r.pattern,
    categoryId: String(r.categoryId),
    confidence: r.confidence,
    hits: r.hits,
  }));
}
