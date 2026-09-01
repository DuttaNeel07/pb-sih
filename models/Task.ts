import mongoose, { Document, Schema, Model, Types } from "mongoose";

// Task Field Interface
export interface ITaskField {
  type: "text" | "textarea" | "file" | "url" | "number" | "date";
  label: string;
  required: boolean;
  placeholder?: string;
  acceptedFormats?: string[]; // For file uploads - e.g., ["pdf", "doc", "docx"]
  maxSize?: number; // For file uploads (in MB) - e.g., 0.5 for 500KB
  maxLength?: number; // For text fields
  description?: string; // Field description/instructions
}

// Task Interface
export interface ITask extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  fields: ITaskField[];
  assignedTo: Types.ObjectId[]; // References to Team documents
  availableToAll: boolean; // When true, every team can view and submit this task
  dueDate?: Date;
  isActive: boolean;
  createdBy: Types.ObjectId; // Reference to User (admin) who created the task
  createdAt: Date;
  updatedAt: Date;
}

// Task Field Schema
const taskFieldSchema = new Schema<ITaskField>(
  {
    type: {
      type: String,
      enum: ["text", "textarea", "file", "url", "number", "date"],
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    required: {
      type: Boolean,
      default: false,
    },
    placeholder: {
      type: String,
      trim: true,
    },
    acceptedFormats: [
      {
        type: String,
        trim: true,
      },
    ],
    maxSize: {
      type: Number,
      min: 0.001, // Minimum 1KB
      max: 100, // Max 100MB
    },
    maxLength: {
      type: Number,
      min: 1,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

// Task Schema
const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
    fields: {
      type: [taskFieldSchema],
      required: true,
      validate: {
        validator: function (fields: ITaskField[]) {
          return fields.length > 0;
        },
        message: "Task must have at least one field",
      },
    },
    assignedTo: [
      {
        type: Schema.Types.ObjectId,
        ref: "Team",
      },
    ],
    availableToAll: {
      type: Boolean,
      default: false,
    },
    dueDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better performance
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ isActive: 1 });
taskSchema.index({ dueDate: 1 });

export const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>("Task", taskSchema);
