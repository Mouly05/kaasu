import { z } from "zod";

import { CONNECTION_PROVIDERS, HOLDING_ASSET_TYPES, HOLDING_SNAPSHOT_SOURCES } from "@/lib/db/enums";
import { paiseSchema } from "@/lib/zod-helpers";

export const connectionInputSchema = z.object({
  provider: z.enum(CONNECTION_PROVIDERS, "Choose a provider"),
  token: z.string().trim().min(1, "Token is required"),
  expiresAt: z.coerce.date().optional(),
});

export type ConnectionInput = z.infer<typeof connectionInputSchema>;

const holdingSchema = z.object({
  symbol: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(200),
  assetType: z.enum(HOLDING_ASSET_TYPES, "Choose an asset type"),
  qty: z.number().finite().min(0),
  avgCostPaise: paiseSchema({ min: 0 }).optional(),
  ltpPaise: paiseSchema({ min: 0 }).optional(),
  valuePaise: paiseSchema({ min: 0 }).optional(),
});

export const holdingSnapshotSchema = z.object({
  takenAt: z.coerce.date().optional(),
  source: z.enum(HOLDING_SNAPSHOT_SOURCES, "Choose a source"),
  holdings: z.array(holdingSchema).default([]),
  totals: z.object({
    investedPaise: paiseSchema({ min: 0 }).optional(),
    currentValuePaise: paiseSchema({ min: 0 }).optional(),
    pnlPaise: paiseSchema().optional(),
  }),
});

export type HoldingSnapshotInput = z.infer<typeof holdingSnapshotSchema>;
