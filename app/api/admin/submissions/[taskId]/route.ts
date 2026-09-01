import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminAuth } from "@/lib/middleware/adminAuth";
import { Task } from "@/models/Task";
import { Team } from "@/models/Team";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { User } from "@/models/User";
import dbConnect from "@/lib/mongodb";

// GET /api/admin/submissions/[taskId] - Get all submissions for a specific task
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

    // Find all teams that have submitted this task
    const teamsWithSubmissions = await Team.find(
      task.availableToAll
        ? { "tasks.taskId": taskId }
        : {
            _id: { $in: task.assignedTo },
            "tasks.taskId": taskId,
          }
    )
      .populate("leader", "name email")
      .populate("problemStatement", "title")
      .lean();

    // Transform the data to extract submissions
    const submissions = teamsWithSubmissions.map((team) => {
      const submission = team.tasks.find(
        (taskSubmission: { taskId: { toString: () => string } }) =>
          taskSubmission.taskId.toString() === taskId
      );

      return {
        _id: `${team._id}_${taskId}`,
        taskId,
        teamId: team._id,
        team: {
          _id: team._id,
          teamName: team.teamName,
          leader: team.leader,
          status: team.status,
          problemStatement: team.problemStatement,
        },
        submittedAt: submission?.submittedAt,
        files: submission?.files || [],
        data: submission?.data || {},
        status: submission?.status || "submitted",
        feedback: submission?.feedback,
      };
    });

    return NextResponse.json({
      success: true,
      submissions,
      task: {
        _id: task._id,
        title: task.title,
        description: task.description,
        availableToAll: task.availableToAll,
        dueDate: task.dueDate,
      },
    });
  } catch (error: unknown) {
    console.error("Fetch submissions error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}
