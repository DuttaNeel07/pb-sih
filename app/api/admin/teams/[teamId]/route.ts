import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminAuth } from "../../../../../lib/middleware/adminAuth";
import dbConnect from "../../../../../lib/mongodb";
import { Team } from "../../../../../models/Team";
import { isValidObjectId } from "../../../../../lib/utils/validation";

// Import models to ensure they are registered with Mongoose
import "../../../../../models/User";
import "../../../../../models/ProblemStatement";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    // Authenticate admin
    await verifySuperAdminAuth(request);

    await dbConnect();

    const { teamId } = await params;

    if (!isValidObjectId(teamId)) {
      return NextResponse.json(
        { success: false, error: "Team ID is required" },
        { status: 400 }
      );
    }

    // Get complete team details
    const team = await Team.findById(teamId)
      .populate("leader", "name email phone gender college year branch")
      .populate("problemStatement", "psNumber title domain description")
      .lean();

    if (!team) {
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }


    return NextResponse.json({
      success: true,
      team: {
        _id: team._id,
        teamName: team.teamName,
        leader: team.leader,
        members: team.members,
        problemStatement: team.problemStatement,
        status: team.status,
        registrationDate: team.registrationDate,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        tasks: team.tasks,
        memberCount: team.members.length,
      }
    });
  } catch (error: unknown) {
    console.error("Get team details error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to get team details" },
      { status: 500 }
    );
  }
}
