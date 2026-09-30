import { z } from "zod";

import { ADVISOR_MESSAGE_ROLES, INSIGHT_SEVERITIES } from "@/lib/db/enums";

export const advisorMessageSchema = z.object({
  role: z.enum(ADVISOR_MESSAGE_ROLES, "Choose a role"),
  content: z.string().trim().min(1, "Content is required").max(8000),
});

export type AdvisorMessageInput = z.infer<typeof advisorMessageSchema>;

export const insightSchema = z.object({
  type: z.string().trim().min(1, "Type is required").max(50),
  periodKey: z.string().trim().min(1, "Period is required"),
  title: z.string().trim().min(1, "Title is required").max(200),
  body: z.string().trim().min(1, "Body is required"),
  severity: z.enum(INSIGHT_SEVERITIES, "Choose a severity").default("info"),
});

export type InsightInput = z.infer<typeof insightSchema>;
