import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/middleware/adminAuth";
import dbConnect from "@/lib/mongodb";
import {
  isValidObjectId,
  sanitizeText,
} from "@/lib/utils/validation";

// Import models after database connection to avoid registration issues

// GET /api/admin/evaluator/ranking/[problemStatementId] - Get teams to rank for a problem statement
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ problemStatementId: string }> }
) {
  try {
    const { problemStatementId } = await context.params;

    if (!isValidObjectId(problemStatementId)) {
      return NextResponse.json(
        { success: false, error: "Invalid problem statement ID" },
        { status: 400 }
      );
    }

    // Verify admin authentication
    const authenticatedRequest = await verifyAdminAuth(request);

    await dbConnect();

    // Import models after connection to avoid registration issues
    const { Admin } = await import("@/models/Admin");
    const { Team } = await import("@/models/Team");
    const { Evaluation } = await import("@/models/Evaluation");
    const { ProblemStatement } = await import("@/models/ProblemStatement");
    const { PptEvaluation } = await import("@/models/PptEvaluations");
    const { User } = await import("@/models/User");
    const { Task } = await import("@/models/Task");

    // Get the current evaluator
    const evaluator = await Admin.findById(authenticatedRequest.admin?._id);

    if (!evaluator || evaluator.role !== "evaluator") {
      return NextResponse.json(
        { success: false, error: "Evaluator access required" },
        { status: 403 }
      );
    }

    // Check if this problem statement is assigned to the evaluator
    const isAssigned = evaluator.assignedProblemStatements.some(
      (psId) => psId.toString() === problemStatementId
    );

    if (!isAssigned) {
      return NextResponse.json(
        {
          success: false,
          error: "Problem statement not assigned to this evaluator",
        },
        { status: 403 }
      );
    }

    // Get problem statement details
    const problemStatement = await ProblemStatement.findById(
      problemStatementId
    );
    if (!problemStatement) {
      return NextResponse.json(
        { success: false, error: "Problem statement not found" },
        { status: 404 }
      );
    }

    // Get teams for this problem statement (all teams except rejected ones)
    const teams = await Team.find({
      problemStatement: problemStatementId,
      status: { $ne: "rejected" }, // Exclude rejected teams (AI-filtered)
    })
      .populate("leader", "name email")
      .populate({
        path: "tasks.taskId",
        select: "title description type fields dueDate",
      })
      .select("teamName leader status registrationDate tasks")
      .lean();

    // Get existing evaluation if any
    const existingEvaluation = await Evaluation.findOne({
      problemStatementId,
      evaluatorId: evaluator._id,
    });

    // Get all PPT evaluations for teams in one query
    const pptEvaluations = await PptEvaluation.find({
      teamName: { $in: teams.map(team => team.teamName) },
      problemStatement: problemStatement.title,
    }).lean();

    // Prepare teams with existing rankings and organized submissions
    const teamsWithRankings = teams.map((team) => {
      const existingRanking = existingEvaluation?.rankings.find(
        (r) => r.teamId.toString() === team._id.toString()
      );

      // Find PPT evaluation for this team
      const pptEvaluation = pptEvaluations.find(
        (evaluation) => evaluation.teamName === team.teamName
      );

      // Organize task submissions with task details
      const organizedSubmissions = (team.tasks ?? [])
        .filter((submission) => submission.status === "submitted")
        .map((submission) => {
          const taskData = submission.taskId as unknown as {
            _id: string;
            title: string;
            type?: string;
          } | null;

          return {
            taskId: taskData?._id ?? submission.taskId,
            taskTitle: taskData?.title || "Untitled Task",
            taskType: taskData?.type || "general",
            submittedAt: submission.submittedAt,
            files: submission.files || [],
            data: submission.data || {},
            status: submission.status,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.submittedAt).getTime() -
            new Date(a.submittedAt).getTime()
        );

      return {
        _id: team._id,
        teamName: team.teamName,
        leader: team.leader,
        status: team.status,
        registrationDate: team.registrationDate,
        submissions: organizedSubmissions,
        currentRank: existingRanking?.rank,
        score: existingRanking?.score,
        comments: existingRanking?.comments,
        pptEvaluation: pptEvaluation,
      };
    });

    return NextResponse.json({
      success: true,
      problemStatement: {
        _id: problemStatement._id,
        title: problemStatement.title,
        description: problemStatement.description,
      },
      teams: teamsWithRankings,
      evaluation: existingEvaluation
        ? {
            _id: existingEvaluation._id,
            isFinalized: existingEvaluation.isFinalized,
            submittedAt: existingEvaluation.submittedAt,
          }
        : null,
    });
  } catch (error: unknown) {
    console.error("Get ranking teams error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch teams for ranking" },
      { status: 500 }
    );
  }
}

// POST /api/admin/evaluator/ranking/[problemStatementId] - Save rankings
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ problemStatementId: string }> }
) {
  try {
    const { problemStatementId } = await context.params;

    if (!isValidObjectId(problemStatementId)) {
      return NextResponse.json(
        { success: false, error: "Invalid problem statement ID" },
        { status: 400 }
      );
    }

    // Verify admin authentication
    const authenticatedRequest = await verifyAdminAuth(request);

    await dbConnect();

    // Import models after connection to avoid registration issues
    const { Admin } = await import("@/models/Admin");
    const { Team } = await import("@/models/Team");
    const { Evaluation } = await import("@/models/Evaluation");
    const { User } = await import("@/models/User");
    const { Task } = await import("@/models/Task");

    // Get the current evaluator
    const evaluator = await Admin.findById(authenticatedRequest.admin?._id);

    if (!evaluator || evaluator.role !== "evaluator") {
      return NextResponse.json(
        { success: false, error: "Evaluator access required" },
        { status: 403 }
      );
    }

    // Check if this problem statement is assigned to the evaluator
    const isAssigned = evaluator.assignedProblemStatements.some(
      (psId) => psId.toString() === problemStatementId
    );

    if (!isAssigned) {
      return NextResponse.json(
        {
          success: false,
          error: "Problem statement not assigned to this evaluator",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const rankings = body?.rankings;
    const isFinalized = body?.isFinalized;

    // Validate rankings
    if (
      !Array.isArray(rankings) ||
      rankings.length === 0 ||
      rankings.length > 1000 ||
      (isFinalized !== undefined && typeof isFinalized !== "boolean")
    ) {
      return NextResponse.json(
        { success: false, error: "Rankings array is required" },
        { status: 400 }
      );
    }

    const normalizedRankings = rankings.map((ranking: unknown) => {
      if (
        ranking === null ||
        typeof ranking !== "object" ||
        Array.isArray(ranking)
      ) {
        return null;
      }

      const value = ranking as Record<string, unknown>;
      const rank = value.rank;
      const score = value.score === undefined || value.score === null
        ? undefined
        : Number(value.score);
      const comments =
        value.comments === undefined || value.comments === null
          ? undefined
          : sanitizeText(value.comments, 1000);

      if (
        !isValidObjectId(value.teamId) ||
        typeof rank !== "number" ||
        !Number.isInteger(rank) ||
        rank < 1 ||
        (score !== undefined && (!Number.isFinite(score) || score < 0 || score > 100)) ||
        (value.comments !== undefined && value.comments !== null && typeof value.comments !== "string")
      ) {
        return null;
      }

      return {
        teamId: value.teamId,
        rank,
        score,
        comments,
      };
    });

    if (normalizedRankings.some((ranking) => ranking === null)) {
      return NextResponse.json(
        { success: false, error: "Invalid ranking data" },
        { status: 400 }
      );
    }

    const safeRankings = normalizedRankings as Array<{
      teamId: string;
      rank: number;
      score?: number;
      comments?: string;
    }>;
    const ranks = safeRankings.map((ranking) => ranking.rank).sort((a, b) => a - b);
    const teamIds = safeRankings.map((ranking) => ranking.teamId);

    if (
      new Set(ranks).size !== ranks.length ||
      new Set(teamIds).size !== teamIds.length
    ) {
      return NextResponse.json(
        { success: false, error: "Duplicate teams or ranks are not allowed" },
        { status: 400 }
      );
    }

    // Validate ranking structure
    for (let i = 0; i < ranks.length; i++) {
      if (ranks[i] !== i + 1) {
        return NextResponse.json(
          {
            success: false,
            error: "Rankings must be sequential starting from 1",
          },
          { status: 400 }
        );
      }
    }

    // Verify all teams exist and belong to this problem statement
    const teams = await Team.find({
      _id: { $in: teamIds },
      problemStatement: problemStatementId,
      status: { $ne: "rejected" }, // Allow all teams except rejected
    });

    if (teams.length !== teamIds.length) {
      return NextResponse.json(
        { success: false, error: "Invalid teams in ranking" },
        { status: 400 }
      );
    }

    // Prepare ranking data
    const rankingData = safeRankings.map((r) => ({
      teamId: r.teamId,
      rank: r.rank,
      score: r.score || undefined,
      comments: r.comments || undefined,
      evaluatedAt: new Date(),
    }));

    // Create or update evaluation
    const evaluation = await Evaluation.findOneAndUpdate(
      {
        problemStatementId,
        evaluatorId: evaluator._id,
      },
      {
        problemStatementId,
        evaluatorId: evaluator._id,
        rankings: rankingData,
        isFinalized: !!isFinalized,
        totalTeams: teams.length,
        ...(isFinalized && { submittedAt: new Date() }),
      },
      {
        upsert: true,
        new: true,
      }
    );

    return NextResponse.json({
      success: true,
      message: isFinalized
        ? "Rankings finalized successfully"
        : "Rankings saved as draft",
      evaluation: {
        _id: evaluation._id,
        isFinalized: evaluation.isFinalized,
        submittedAt: evaluation.submittedAt,
        rankings: evaluation.rankings,
      },
    });
  } catch (error: unknown) {
    console.error("Save rankings error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save rankings" },
      { status: 500 }
    );
  }
}
