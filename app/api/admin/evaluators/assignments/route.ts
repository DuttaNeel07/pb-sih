import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/middleware/adminAuth";
import { Admin } from "@/models/Admin";
import { ProblemStatement } from "@/models/ProblemStatement";
import dbConnect from "@/lib/mongodb";
import { isValidObjectId } from "@/lib/utils/validation";

// GET /api/admin/evaluators/assignments - Get all evaluator assignments
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authenticatedRequest = await verifyAdminAuth(request);

    await dbConnect();

    // Check if user is super admin
    const admin = await Admin.findById(authenticatedRequest.admin?._id);
    if (!admin || admin.role !== "super-admin") {
      return NextResponse.json(
        { success: false, error: "Super admin access required" },
        { status: 403 }
      );
    }

    // Get all evaluators with their assignments
    const evaluators = await Admin.find({
      role: "evaluator",
      isActive: true,
    })
      .populate("assignedProblemStatements", "title psNumber")
      .select("email assignedProblemStatements isActive createdAt");

    // Get all problem statements
    const problemStatements = await ProblemStatement.find({
      isActive: true,
    }).select("title psNumber");

    return NextResponse.json({
      success: true,
      evaluators,
      problemStatements,
    });
  } catch (error: unknown) {
    console.error("Get evaluator assignments error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch evaluator assignments" },
      { status: 500 }
    );
  }
}

// POST /api/admin/evaluators/assignments - Assign problem statements to evaluator
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authenticatedRequest = await verifyAdminAuth(request);

    await dbConnect();

    // Check if user is super admin
    const admin = await Admin.findById(authenticatedRequest.admin?._id);
    if (!admin || admin.role !== "super-admin") {
      return NextResponse.json(
        { success: false, error: "Super admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "Invalid request payload" },
        { status: 400 }
      );
    }
    const { evaluatorId, problemStatementIds } = body;

    // Validate input
    if (
      !isValidObjectId(evaluatorId) ||
      !Array.isArray(problemStatementIds) ||
      problemStatementIds.length > 100 ||
      problemStatementIds.some((id) => !isValidObjectId(id)) ||
      new Set(problemStatementIds).size !== problemStatementIds.length
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Evaluator ID and problem statement IDs are required",
        },
        { status: 400 }
      );
    }

    // Verify evaluator exists and is active
    const evaluator = await Admin.findOne({
      _id: evaluatorId,
      role: "evaluator",
      isActive: true,
    });

    if (!evaluator) {
      return NextResponse.json(
        { success: false, error: "Evaluator not found or inactive" },
        { status: 404 }
      );
    }

    // Verify all problem statements exist
    const problemStatements = await ProblemStatement.find({
      _id: { $in: problemStatementIds },
      isActive: true,
    });

    if (problemStatements.length !== problemStatementIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: "One or more problem statements not found or inactive",
        },
        { status: 404 }
      );
    }

    // Update evaluator assignments
    evaluator.assignedProblemStatements = problemStatementIds;
    await evaluator.save();

    // Populate the updated assignments for response
    await evaluator.populate("assignedProblemStatements", "title psNumber");

    return NextResponse.json({
      success: true,
      message: "Problem statements assigned successfully",
      evaluator: {
        _id: evaluator._id,
        email: evaluator.email,
        assignedProblemStatements: evaluator.assignedProblemStatements,
      },
    });
  } catch (error: unknown) {
    console.error("Assign problem statements error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to assign problem statements" },
      { status: 500 }
    );
  }
}
