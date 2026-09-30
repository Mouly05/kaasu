// This is the `Connection` model (a linked third-party account), not to be
// confused with `src/lib/db/connection.ts` (the cached Mongoose connection).
import { model, models, Schema, type Model, type Types } from "mongoose";

import { CONNECTION_PROVIDERS, CONNECTION_STATUSES } from "@/lib/db/enums";

export type ConnectionProvider = (typeof CONNECTION_PROVIDERS)[number];
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export interface ConnectionDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  provider: ConnectionProvider;
  encryptedToken: string;
  expiresAt?: Date;
  lastSyncAt?: Date;
  status: ConnectionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const connectionSchema = new Schema<ConnectionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, enum: CONNECTION_PROVIDERS, required: true },
    // `encrypt()` ciphertext; never selected by default.
    encryptedToken: { type: String, required: true, select: false },
    expiresAt: { type: Date },
    lastSyncAt: { type: Date },
    status: { type: String, enum: CONNECTION_STATUSES, default: "active" },
  },
  { timestamps: true, collection: "connections" },
);

connectionSchema.index({ userId: 1, provider: 1 }, { unique: true });

export const Connection: Model<ConnectionDoc> =
  (models.Connection as Model<ConnectionDoc>) ?? model<ConnectionDoc>("Connection", connectionSchema);
