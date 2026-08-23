import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminAuth } from "@/lib/middleware/adminAuth";
import { Task } from "@/models/Task";
import { Team } from "@/models/Team";
import dbConnect from "@/lib/mongodb";

// GET /api/admin/submissions/[taskId]/stats - Get submission statistics for a task
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;

    // Verify admin authentication
    const isAuthenticated = await verifySuperAdminAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Admin authentication required" },
        { status: 401 }
      );
    }

    await dbConnect();

    // Find the task
    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    // Count total teams assigned to this task
    const totalAssigned = task.assignedTo.length;

    // Count teams that have submitted this task
    const submissionCount = await Team.countDocuments({
      _id: { $in: task.assignedTo },
      "tasks.taskId": taskId,
    });

    return NextResponse.json({
      success: true,
      submissionCount,
      totalAssigned,
      taskTitle: task.title,
    });
  } catch (error: unknown) {
    console.error("Submission stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch submission statistics" },
      { status: 500 }
    );
  }
}
