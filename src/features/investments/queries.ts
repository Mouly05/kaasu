import "server-only";

import { isValidObjectId } from "mongoose";

import { Connection } from "@/lib/db/models/connection";
import type { ConnectionProvider, ConnectionStatus } from "@/lib/db/models/connection";
import { connectDb } from "@/lib/db/connection";
import { HoldingSnapshot } from "@/lib/db/models/holding-snapshot";
import type { Holding, HoldingSnapshotTotals } from "@/lib/db/models/holding-snapshot";

export interface ConnectionSummary {
  id: string;
  provider: ConnectionProvider;
  status: ConnectionStatus;
  expiresAt: Date | null;
  lastSyncAt: Date | null;
}

/** The signed-in user's active connection for a provider, if any. Never returns the token. */
export async function getActiveConnection(
  userId: string,
  provider: ConnectionProvider,
): Promise<ConnectionSummary | null> {
  if (!isValidObjectId(userId)) return null;
  await connectDb();
  const connection = await Connection.findOne({ userId, provider, status: "active" }).lean();
  if (!connection) return null;
  return {
    id: String(connection._id),
    provider: connection.provider,
    status: connection.status,
    expiresAt: connection.expiresAt ?? null,
    lastSyncAt: connection.lastSyncAt ?? null,
  };
}

export interface HoldingSnapshotSummary {
  id: string;
  takenAt: Date;
  holdings: Holding[];
  totals: HoldingSnapshotTotals;
}

/** The signed-in user's most recent holding snapshot, if any. */
export async function getLatestHoldingSnapshot(userId: string): Promise<HoldingSnapshotSummary | null> {
  if (!isValidObjectId(userId)) return null;
  await connectDb();
  const snapshot = await HoldingSnapshot.findOne({ userId }).sort({ takenAt: -1 }).lean();
  if (!snapshot) return null;
  return {
    id: String(snapshot._id),
    takenAt: snapshot.takenAt,
    holdings: snapshot.holdings,
    totals: snapshot.totals,
  };
}
