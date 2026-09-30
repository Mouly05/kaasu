import { model, models, Schema, type Model, type Types } from "mongoose";

import { TASK_SOURCES, TASK_STATUSES } from "@/lib/db/enums";

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskSource = (typeof TASK_SOURCES)[number];

export interface TaskDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  dueDate?: Date;
  status: TaskStatus;
  source: TaskSource;
  priority: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<TaskDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    dueDate: { type: Date },
    status: { type: String, enum: TASK_STATUSES, required: true, default: "todo" },
    source: { type: String, enum: TASK_SOURCES, required: true, default: "manual" },
    priority: { type: Number, min: 1, max: 5, default: 3 },
    notes: { type: String },
  },
  { timestamps: true, collection: "tasks" },
);

taskSchema.index({ userId: 1, status: 1, dueDate: 1 });

export const Task: Model<TaskDoc> = (models.Task as Model<TaskDoc>) ?? model<TaskDoc>("Task", taskSchema);
