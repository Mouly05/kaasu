import "server-only";

import { isValidObjectId } from "mongoose";

import { connectDb } from "@/lib/db/connection";
import { Task } from "@/lib/db/models/task";
import type { TaskSource, TaskStatus } from "@/lib/db/models/task";
import { User } from "@/lib/db/models/user";

export interface TaskSummary {
  id: string;
  title: string;
  dueDate: Date | null;
  status: TaskStatus;
  source: TaskSource;
  priority: number;
  notes: string | null;
}

/** The signed-in user's tasks, open first unless `status` narrows it. */
export async function listTasks(
  userId: string,
  options: { status?: TaskStatus } = {},
): Promise<TaskSummary[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();
  const tasks = await Task.find({ userId, ...(options.status ? { status: options.status } : {}) })
    .sort({ dueDate: 1, priority: 1 })
    .lean();
  return tasks.map((t) => ({
    id: String(t._id),
    title: t.title,
    dueDate: t.dueDate ?? null,
    status: t.status,
    source: t.source,
    priority: t.priority,
    notes: t.notes ?? null,
  }));
}

export interface AssistantPreferences {
  dailyReminderTime: string | null;
  /** Never the ciphertext — only whether a chat id is linked. */
  telegramLinked: boolean;
}

/** The signed-in user's assistant preferences. Never returns the Telegram ciphertext. */
export async function getAssistantPreferences(userId: string): Promise<AssistantPreferences | null> {
  if (!isValidObjectId(userId)) return null;
  await connectDb();
  const user = await User.findById(userId)
    .select({ dailyReminderTime: 1, telegramChatId: 1 })
    .select("+telegramChatId")
    .lean();
  if (!user) return null;
  return {
    dailyReminderTime: user.dailyReminderTime ?? null,
    telegramLinked: Boolean(user.telegramChatId),
  };
}
