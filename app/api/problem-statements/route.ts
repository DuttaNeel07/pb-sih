import { NextResponse } from "next/server";
import {
  ProblemStatement,
  IProblemStatement,
} from "../../../models/ProblemStatement";
import dbConnect from "../../../lib/mongodb";

export async function GET() {
  try {
    await dbConnect();

    // Get all active problem statements with available slots
    const problemStatements = await ProblemStatement.find({
      isActive: true,
      //$expr: { $lt: ["$teamCount", "$maxTeams"] },
    })
      .select("psNumber title description domain link teamCount maxTeams")
      .sort({ psNumber: 1 });

    return NextResponse.json({
      success: true,
      problemStatements: problemStatements.map((ps: IProblemStatement) => ({
        _id: ps._id,
        psNumber: ps.psNumber,
        title: ps.title,
        description: ps.description,
        domain: ps.domain,
        link: ps.link,
        availableSlots: ps.maxTeams - ps.teamCount,
        maxTeams: ps.maxTeams,
      })),
    });
  } catch (error: unknown) {
    console.error("Get problem statements error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to get problem statements" },
      { status: 500 }
    );
  }
}
