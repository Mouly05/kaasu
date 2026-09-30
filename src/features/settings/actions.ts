"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok } from "@/lib/action-result";
import { requireUser, withAction } from "@/lib/auth-helpers";
import { connectDb } from "@/lib/db/connection";
import { User } from "@/lib/db/models/user";

import { preferencesSchema, type PreferencesInput } from "./schema";

export const updatePreferences = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) {
    return fail<PreferencesInput>({
      code: "validation",
      message: "Please check your preferences.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    });
  }

  await connectDb();
  const result = await User.updateOne({ _id: userId }, { $set: parsed.data });
  if (result.matchedCount === 0) {
    return fail<PreferencesInput>({ code: "not_found", message: "Your profile wasn’t found." });
  }

  revalidatePath("/settings");
  return ok(parsed.data);
});
