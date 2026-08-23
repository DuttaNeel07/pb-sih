import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminAuth } from "../../../../lib/middleware/adminAuth";
import { Task, ITask, ITaskField } from "../../../../models/Task";
import { Team } from "../../../../models/Team";
import dbConnect from "../../../../lib/mongodb";
import { sendTaskAssignmentEmail } from "../../../../lib/utils/email";
import { Types } from "mongoose";
import {
  isValidObjectId,
  sanitizeSingleLineText,
  sanitizeText,
} from "../../../../lib/utils/validation";
// Import User model to ensure it's registered for population
import "../../../../models/User";

interface PopulatedTeam {
  _id: string;
  teamName: string;
  leader: {
    _id: string;
    name: string;
    email: string;
  };
}

const TASK_FIELD_TYPES = [
  "text",
  "textarea",
  "file",
  "url",
  "number",
  "date",
] as const;

function sanitizeTaskFields(value: unknown): ITaskField[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    return null;
  }

  const fields: ITaskField[] = [];
  const labels = new Set<string>();
  for (const rawField of value) {
    if (
      rawField === null ||
      typeof rawField !== "object" ||
      Array.isArray(rawField)
    ) {
      return null;
    }

    const field = rawField as Record<string, unknown>;
    const type = sanitizeSingleLineText(field.type, 20);
    const label = sanitizeSingleLineText(field.label, 200);
    const acceptedFormats = Array.isArray(field.acceptedFormats)
      ? field.acceptedFormats
          .slice(0, 20)
          .filter((format): format is string => typeof format === "string")
          .map((format) => sanitizeSingleLineText(format, 20).toLowerCase())
          .filter((format) => /^[a-z0-9]+$/.test(format))
      : undefined;
    const maxSize = field.maxSize === undefined ? undefined : Number(field.maxSize);
    const maxLength =
      field.maxLength === undefined ? undefined : Number(field.maxLength);

    if (
      !(TASK_FIELD_TYPES as readonly string[]).includes(type) ||
      label.length < 1 ||
      label.includes(".") ||
      label.startsWith("$") ||
      labels.has(label) ||
      (maxSize !== undefined && (!Number.isFinite(maxSize) || maxSize < 0.001 || maxSize > 100)) ||
      (maxLength !== undefined && (!Number.isInteger(maxLength) || maxLength < 1 || maxLength > 10000))
    ) {
      return null;
    }

    labels.add(label);

    fields.push({
      type: type as ITaskField["type"],
      label,
      required: field.required === true,
      placeholder:
        typeof field.placeholder === "string"
          ? sanitizeSingleLineText(field.placeholder, 500)
          : undefined,
      acceptedFormats,
      maxSize,
      maxLength,
      description:
        typeof field.description === "string"
          ? sanitizeText(field.description, 2000)
          : undefined,
    });
  }

  return fields;
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    await verifySuperAdminAuth(request);

    await dbConnect();

    const tasks = await Task.find({})
      .populate("createdBy", "name email")
      .populate("assignedTo", "teamName leader")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      tasks: tasks.map((task: ITask) => ({
        _id: task._id,
        title: task.title,
        description: task.description,
        fields: task.fields,
        assignedTo: task.assignedTo || [],
        assignedTeamsCount: task.assignedTo?.length || 0,
        dueDate: task.dueDate,
        isActive: task.isActive,
        createdBy: task.createdBy,
        createdAt: task.createdAt,
      })),
    });
  } catch (error: unknown) {
    console.error("Get tasks error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to get tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin
    const authenticatedRequest = await verifySuperAdminAuth(request);
    const adminUser = authenticatedRequest.admin;

    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: "Admin authentication required" },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await request.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "Invalid request payload" },
        { status: 400 }
      );
    }
    const { title, description, fields, assignedTo, dueDate } = body;
    const normalizedTitle = sanitizeSingleLineText(title, 200);
    const normalizedDescription =
      typeof description === "string" ? sanitizeText(description, 5000) : undefined;
    const normalizedFields = sanitizeTaskFields(fields);
    const normalizedAssignedTo = Array.isArray(assignedTo)
      ? assignedTo
      : assignedTo === undefined
        ? []
        : null;
    const normalizedDueDate =
      dueDate === undefined || dueDate === null || dueDate === ""
        ? undefined
        : new Date(dueDate);

    // Validate required fields
    if (!normalizedTitle || !normalizedFields) {
      return NextResponse.json(
        {
          success: false,
          error: "Title and fields are required",
        },
        { status: 400 }
      );
    }

    if (
      !normalizedAssignedTo ||
      normalizedAssignedTo.length > 100 ||
      normalizedAssignedTo.some((teamId) => !isValidObjectId(teamId)) ||
      new Set(normalizedAssignedTo).size !== normalizedAssignedTo.length
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid team assignments" },
        { status: 400 }
      );
    }

    if (normalizedFields.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one field is required" },
        { status: 400 }
      );
    }

    if (normalizedDueDate && Number.isNaN(normalizedDueDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid due date" },
        { status: 400 }
      );
    }

    // Validate assignedTo teams
    let teamsToAssign: PopulatedTeam[] = [];
    if (normalizedAssignedTo.length > 0) {
      const teams = await Team.find({
        _id: { $in: normalizedAssignedTo },
      }).populate("leader", "name email");

      teamsToAssign = teams.map((team) => {
        const leader = team.leader as unknown as {
          _id: string;
          name: string;
          email: string;
        };
        return {
          _id: team._id.toString(),
          teamName: team.teamName,
          leader: {
            _id: leader._id.toString(),
            name: leader.name,
            email: leader.email,
          },
        };
      });

      if (teamsToAssign.length !== normalizedAssignedTo.length) {
        return NextResponse.json(
          { success: false, error: "Some teams not found" },
          { status: 400 }
        );
      }
    }

    // Create task
    const task = new Task({
      title: normalizedTitle,
      description: normalizedDescription,
      fields: normalizedFields,
      assignedTo: normalizedAssignedTo,
      dueDate: normalizedDueDate,
      isActive: true,
      createdBy: new Types.ObjectId(), // Use a placeholder ObjectId for now
    });

    await task.save();

    // Send emails to assigned teams
    if (teamsToAssign.length > 0) {
      const emailPromises = teamsToAssign.map(async (team: PopulatedTeam) => {
        try {
          await sendTaskAssignmentEmail(
            team.teamName,
            team.leader.name,
            team.leader.email,
            task.title,
            task.description || "No description provided",
            task.dueDate
          );
        } catch (emailError) {
          console.error(`Email failed for team ${team.teamName}:`, emailError);
        }
      });

      await Promise.allSettled(emailPromises);
    }

    return NextResponse.json({
      success: true,
      message: "Task created and assigned successfully",
      task: {
        _id: task._id,
        title: task.title,
        description: task.description,
        assignedTeamsCount: teamsToAssign.length,
        createdAt: task.createdAt,
      },
    });
  } catch (error: unknown) {
    console.error("Create task error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to create task" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate admin
    await verifySuperAdminAuth(request);

    await dbConnect();

    const body = await request.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "Invalid request payload" },
        { status: 400 }
      );
    }
    const { taskId, isActive } = body;

    if (!isValidObjectId(taskId) || typeof isActive !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Task ID and isActive status are required" },
        { status: 400 }
      );
    }

    const task = await Task.findByIdAndUpdate(
      taskId,
      { isActive },
      { new: true }
    );

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Task ${isActive ? "activated" : "deactivated"} successfully`,
      task: {
        _id: task._id,
        title: task.title,
        isActive: task.isActive,
      },
    });
  } catch (error: unknown) {
    console.error("Update task error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to update task" },
      { status: 500 }
    );
  }
}
