import { model, models, Schema, type Model, type Types } from "mongoose";

import { ADVISOR_MESSAGE_ROLES } from "@/lib/db/enums";

export type AdvisorMessageRole = (typeof ADVISOR_MESSAGE_ROLES)[number];

export interface AdvisorMessageDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  role: AdvisorMessageRole;
  content: string;
  // Opaque AI SDK tool-call/tool-result passthrough; shape is provider-dependent
  // and gets pinned by a Zod schema when the advisor module wires up the AI SDK.
  toolCalls: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

const advisorMessageSchema = new Schema<AdvisorMessageDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ADVISOR_MESSAGE_ROLES, required: true },
    content: { type: String, required: true, maxlength: 8000 },
    toolCalls: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true, collection: "advisormessages" },
);

advisorMessageSchema.index({ userId: 1, createdAt: -1 });

export const AdvisorMessage: Model<AdvisorMessageDoc> =
  (models.AdvisorMessage as Model<AdvisorMessageDoc>) ??
  model<AdvisorMessageDoc>("AdvisorMessage", advisorMessageSchema);
