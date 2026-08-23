import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminAuth } from "../../../../../lib/middleware/adminAuth";
import dbConnect from "../../../../../lib/mongodb";
import { Team } from "../../../../../models/Team";

interface PopulatedLeader {
  name: string;
  email: string;
}

interface TeamForSelection {
  _id: string;
  teamName: string;
  status: string;
  leader: PopulatedLeader;
  registrationDate: string;
}

// GET /api/admin/teams/selection - Get minimal team data for task assignment
export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    await verifySuperAdminAuth(request);

    await dbConnect();

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    // Build query for team selection
    const query: Record<string, unknown> = {};

    if (status && status !== "all") {
      query.status = status;
    }

    // Add registration date filtering
    if (startDate || endDate) {
      const dateQuery: Record<string, Date> = {};
      if (startDate) {
        dateQuery.$gte = new Date(startDate);
      }
      if (endDate) {
        // Add 23:59:59 to end date to include the full day
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        dateQuery.$lte = endDateObj;
      }
      query.registrationDate = dateQuery;
    }

    // Get minimal team data for selection
    const teams = await Team.find(query)
      .populate("leader", "name email")
      .select("_id teamName status leader registrationDate")
      .sort({ teamName: 1 });

    // Group teams by status for easier bulk selection
    const teamsByStatus = teams.reduce((acc, team) => {
      const teamStatus = team.status;
      if (!acc[teamStatus]) {
        acc[teamStatus] = [];
      }
      const leader = team.leader as unknown as PopulatedLeader;
      acc[teamStatus].push({
        _id: team._id.toString(),
        teamName: team.teamName,
        leader: {
          name: leader.name,
          email: leader.email,
        },
        status: team.status,
        registrationDate: team.registrationDate.toISOString(),
      });
      return acc;
    }, {} as Record<string, TeamForSelection[]>);

    // Get counts by status
    const statusCounts = await Team.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = statusCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      teams: teams.map((team) => {
        const leader = team.leader as unknown as PopulatedLeader;
        return {
          _id: team._id.toString(),
          teamName: team.teamName,
          status: team.status,
          leader: {
            name: leader.name,
            email: leader.email,
          },
          registrationDate: team.registrationDate.toISOString(),
        };
      }),
      teamsByStatus,
      statusCounts: counts,
      totalTeams: teams.length,
    });
  } catch (error: unknown) {
    console.error("Get team selection error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to get teams for selection" },
      { status: 500 }
    );
  }
}
