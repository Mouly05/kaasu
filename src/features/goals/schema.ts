import { z } from "zod";

import { GOAL_KINDS } from "@/lib/db/enums";
import { objectIdSchema, paiseSchema } from "@/lib/zod-helpers";

export const goalInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  kind: z.enum(GOAL_KINDS, "Choose a goal kind"),
  targetPaise: paiseSchema({ min: 1 }),
  savedPaise: paiseSchema({ min: 0 }).optional(),
  targetDate: z.coerce.date().optional(),
  priority: z.number().int().min(1).max(5).default(3),
  linkedCategoryId: objectIdSchema.optional(),
  notes: z.string().trim().max(2000).optional(),
  url: z.url().optional(),
});

export type GoalInput = z.infer<typeof goalInputSchema>;
