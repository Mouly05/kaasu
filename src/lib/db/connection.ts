/**
 * Cached Mongoose connection. Serverless functions and dev hot reloads reuse
 * one connection through a global instead of opening a new pool per request.
 */
import "server-only";

import mongoose from "mongoose";

import { env } from "@/lib/env";

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalForMongoose = globalThis as typeof globalThis & { __mongoose?: Cache };
const cache: Cache = (globalForMongoose.__mongoose ??= { conn: null, promise: null });

export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  cache.promise ??= mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB, // overrides any db in the URI, so data never lands in "test"
    bufferCommands: false,
    maxPoolSize: 10, // M0 allows 500 connections shared across all instances
    serverSelectionTimeoutMS: 10_000,
  });
  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null; // let the next request retry
    throw error;
  }
  return cache.conn;
}
