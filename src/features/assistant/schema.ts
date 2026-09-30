import { z } from "zod";

import { TASK_SOURCES } from "@/lib/db/enums";

export const dailyReminderTimeSchema = z.object({
  dailyReminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:mm, e.g. 20:00"),
});

export type DailyReminderTimeInput = z.infer<typeof dailyReminderTimeSchema>;

// The raw chat id as typed/linked by the user; the action layer encrypts it
// before storing (see src/lib/crypto.ts). Never persisted in plaintext.
export const telegramChatIdSchema = z.object({
  telegramChatId: z.string().regex(/^-?\d+$/, "Must be a numeric Telegram chat id"),
});

export type TelegramChatIdInput = z.infer<typeof telegramChatIdSchema>;

export const taskInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  dueDate: z.coerce.date().optional(),
  source: z.enum(TASK_SOURCES, "Choose a source").default("manual"),
  priority: z.number().int().min(1).max(5).default(3),
  notes: z.string().trim().max(2000).optional(),
});

export type TaskInput = z.infer<typeof taskInputSchema>;
