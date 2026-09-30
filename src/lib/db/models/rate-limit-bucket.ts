import { model, models, Schema, type Model } from "mongoose";

export interface RateLimitBucketDoc {
  _id: string; // `${name}:${userId}:${windowStart}`
  userId: string;
  name: string;
  count: number;
  expiresAt: Date;
}

/** One fixed-window counter. Mongo's TTL monitor deletes expired buckets. */
const rateLimitBucketSchema = new Schema<RateLimitBucketDoc>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    count: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { collection: "ratelimitbuckets", versionKey: false },
);

export const RateLimitBucket: Model<RateLimitBucketDoc> =
  (models.RateLimitBucket as Model<RateLimitBucketDoc>) ??
  model<RateLimitBucketDoc>("RateLimitBucket", rateLimitBucketSchema);
