import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminAuth } from "../../../../lib/middleware/adminAuth";
import { Task, ITask } from "../../../../models/Task";
import { Team } from "../../../../models/Team";
import dbConnect from "../../../../lib/mongodb";
import { sendTaskAssignmentEmail } from "../../../../lib/utils/email";
import { Types } from "mongoose";
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
    const { title, description, fields, assignedTo, dueDate } = body;

    // Validate required fields
    if (!title || !fields || !Array.isArray(fields)) {
      return NextResponse.json(
        {
          success: false,
          error: "Title and fields are required",
        },
        { status: 400 }
      );
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one field is required" },
        { status: 400 }
      );
    }

    // Validate assignedTo teams
    let teamsToAssign: PopulatedTeam[] = [];
    if (assignedTo && assignedTo.length > 0) {
      const teams = await Team.find({
        _id: { $in: assignedTo },
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

      if (teamsToAssign.length !== assignedTo.length) {
        return NextResponse.json(
          { success: false, error: "Some teams not found" },
          { status: 400 }
        );
      }
    }

    // Create task
    const task = new Task({
      title: title.trim(),
      description: description ? description.trim() : undefined,
      fields,
      assignedTo: assignedTo || [],
      dueDate: dueDate ? new Date(dueDate) : undefined,
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
    const { taskId, isActive } = body;

    if (!taskId || typeof isActive !== "boolean") {
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
