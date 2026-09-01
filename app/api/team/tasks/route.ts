import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/middleware/auth";
import { Task } from "@/models/Task";
import { Team } from "@/models/Team";
import dbConnect from "@/lib/mongodb";
// Import User model to ensure it's registered
import "@/models/User";

// GET /api/team/tasks - Get tasks assigned to the authenticated team leader's team
export async function GET(request: NextRequest) {
  try {
    // Authenticate team leader
    const authenticatedRequest = await verifyAuth(request);
    const user = authenticatedRequest.user;

    if (!user || user.role !== "leader") {
      return NextResponse.json(
        { success: false, error: "Team leader authentication required" },
        { status: 401 }
      );
    }

    await dbConnect();

    // Find the team for this leader
    const team = await Team.findOne({ leader: user._id });
    if (!team) {
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    // Find all active tasks assigned to this team or explicitly available to
    // every team.
    const tasks = await Task.find({
      isActive: true,
      $or: [{ assignedTo: team._id }, { availableToAll: true }],
    }).sort({ dueDate: 1 });

    // Get team's submissions for these tasks
    const tasksWithSubmissions = tasks.map((task) => {
      const submission = team.tasks.find(
        (sub) => sub.taskId.toString() === task._id.toString()
      );

      return {
        _id: task._id,
        title: task.title,
        description: task.description,
        fields: task.fields,
        availableToAll: task.availableToAll,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        submission: submission || null,
      };
    });

    return NextResponse.json({
      success: true,
      tasks: tasksWithSubmissions,
    });
  } catch (error: unknown) {
    console.error("Get team tasks error:", error);

    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      { success: false, error: "Failed to get team tasks" },
      { status: 500 }
    );
  }
}
